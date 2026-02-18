import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/router";

type Property = {
  id: number;
  node: string;

  county: string | null;
  state: string | null;

  tax_sale_id: string | null;
  parcel_number: string | null;
  sale_date: string | null;
  opening_bid: number | null;
  deed_status: string | null;
  applicant_name: string | null;

  pdf_url: string | null;

  address: string | null;
  city: string | null;
  state_address: string | null;
  zip: string | null;

  address_source_marker: string | null;
  raw_ocr_text?: string | null;

  status: string | null;
  notes: string | null;

  // ✅ Auction fields (from API defaults)
  auction_location?: string | null;
  auction_start_time?: string | null;
  auction_platform?: string | null;
  auction_source_url?: string | null;

  created_at: string | null;
  updated_at: string | null;
};

function formatUSD(value: any) {
  const n =
    typeof value === "number"
      ? value
      : value !== null && value !== undefined && value !== ""
      ? Number(String(value).replace(/,/g, ""))
      : NaN;

  if (!Number.isFinite(n)) return "-";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function safe(v: any) {
  if (v === null || v === undefined || v === "") return "-";
  return String(v);
}

export default function PropertyDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [authChecked, setAuthChecked] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [item, setItem] = useState<Property | null>(null);
  const [status, setStatus] = useState<string>("new");
  const [notes, setNotes] = useState<string>("");

  const countyUrl = useMemo(() => {
    if (!item?.node) return "";
    return `https://or.occompt.com/recorder/eagleweb/viewDoc.jsp?node=${encodeURIComponent(
      item.node
    )}`;
  }, [item?.node]);

  // ✅ Prefer the stored auction_source_url (from API / DB), fallback to computed countyUrl
  const auctionSourceUrl = useMemo(() => {
    const u = item?.auction_source_url;
    if (u && typeof u === "string" && u.startsWith("http")) return u;
    return countyUrl;
  }, [item?.auction_source_url, countyUrl]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;

      if (error || !data.user) {
        router.push("/login");
        return;
      }

      setAuthChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/properties/${id}`);
      const text = await res.text();

      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        // ignore
      }

      if (!res.ok) {
        const msg =
          json?.message || json?.error || text?.slice(0, 200) || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      const record: Property | null = json?.data ?? json ?? null;
      if (!record) throw new Error("Not found");

      setItem(record);
      setStatus(record.status ?? "new");
      setNotes(record.notes ?? "");
    } catch (e: any) {
      setError(e?.message || "Failed to load property");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authChecked) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, id]);

  async function save() {
    if (!id) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {}

      if (!res.ok) {
        const msg =
          json?.message || json?.error || text?.slice(0, 200) || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!authChecked) {
    return <div style={{ padding: 30 }}>Checking auth...</div>;
  }

  return (
    <div style={{ padding: 30 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Property Detail</h1>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            ID: {safe(id)} {item?.node ? `• Node: ${item.node}` : ""}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {item?.node && (
            <a href={countyUrl} target="_blank" rel="noreferrer" style={linkBtn}>
              Open (County)
            </a>
          )}

          {item?.pdf_url && (
            <a href={item.pdf_url} target="_blank" rel="noreferrer" style={linkBtn}>
              Open PDF
            </a>
          )}

          <button onClick={() => router.push("/properties")} style={{ padding: 10 }}>
            Back to list
          </button>

          <button onClick={() => router.push("/dashboard")} style={{ padding: 10 }}>
            Dashboard
          </button>
        </div>
      </div>

      {loading && <p style={{ marginTop: 12 }}>Loading...</p>}
      {error && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #f99", borderRadius: 10 }}>
          <b>Error:</b> {error}
        </div>
      )}

      {!loading && item && (
        <div style={{ marginTop: 14, display: "grid", gap: 12, maxWidth: 980 }}>
          {/* ✅ NEW CARD: Auction info */}
          <Card title="Auction (Orange County)">
            <Row label="Location" value={safe(item.auction_location)} />
            <Row label="Start Time" value={safe(item.auction_start_time)} />
            <Row label="Platform" value={safe(item.auction_platform)} />
            <Row
              label="County Source"
              value={
                auctionSourceUrl ? (
                  <a href={auctionSourceUrl} target="_blank" rel="noreferrer">
                    Open county page
                  </a>
                ) : (
                  <span>-</span>
                )
              }
            />
          </Card>

          <Card title="Core (Auction Data)">
            <Row label="Node" value={item.node} />
            <Row label="Tax Sale ID" value={safe(item.tax_sale_id)} />
            <Row label="Parcel Number" value={safe(item.parcel_number)} />
            <Row label="Sale Date" value={safe(item.sale_date)} />
            <Row label="Opening Bid" value={formatUSD(item.opening_bid)} />
            <Row label="Deed Status" value={safe(item.deed_status)} />
            <Row label="Applicant Name" value={safe(item.applicant_name)} />
            <Row label="County / State" value={`${safe(item.county)} / ${safe(item.state)}`} />
          </Card>

          <Card title="Address">
            <Row label="Address" value={item.address ? item.address : "missing"} />
            <Row label="City" value={safe(item.city)} />
            <Row label="State (address)" value={safe(item.state_address)} />
            <Row label="ZIP" value={safe(item.zip)} />
            <Row label="Source Marker" value={safe(item.address_source_marker)} />
          </Card>

          <Card title="Links">
            <Row
              label="County page"
              value={
                item.node ? (
                  <a href={countyUrl} target="_blank" rel="noreferrer">
                    {countyUrl}
                  </a>
                ) : (
                  <span>-</span>
                )
              }
            />
            <Row
              label="PDF URL"
              value={
                item.pdf_url ? (
                  <a href={item.pdf_url} target="_blank" rel="noreferrer">
                    Open PDF
                  </a>
                ) : (
                  <span>-</span>
                )
              }
            />
          </Card>

          <Card title="Admin">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ marginBottom: 6, opacity: 0.7 }}>Status</div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ padding: 10 }}
                >
                  <option value="new">new</option>
                  <option value="reviewed">reviewed</option>
                  <option value="skipped">skipped</option>
                  <option value="exported">exported</option>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ marginBottom: 6, opacity: 0.7 }}>Notes</div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: "100%", minHeight: 100, padding: 10 }}
                  placeholder="Add notes..."
                />
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <button onClick={save} disabled={saving} style={{ padding: 10 }}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </Card>

          <Card title="Timestamps">
            <Row label="Created At" value={safe(item.created_at)} />
            <Row label="Updated At" value={safe(item.updated_at)} />
          </Card>

          {"raw_ocr_text" in item && item.raw_ocr_text ? (
            <Card title="Raw OCR Text (debug)">
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, margin: 0 }}>
                {String(item.raw_ocr_text).slice(0, 5000)}
              </pre>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: any }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, padding: "6px 0" }}>
      <div style={{ opacity: 0.7 }}>{label}</div>
      <div style={{ overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 12px",
  border: "1px solid #999",
  borderRadius: 6,
  textDecoration: "none",
  color: "inherit",
  background: "#f5f5f5",
};
