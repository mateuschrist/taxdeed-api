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
  const [error, setError] = useState("");

  const [item, setItem] = useState<Property | null>(null);

  const fallbackCountyUrl = useMemo(() => {
    if (!item?.node) return "";
    return `https://or.occompt.com/recorder/eagleweb/viewDoc.jsp?node=${encodeURIComponent(
      item.node
    )}`;
  }, [item?.node]);

  // Prefer DB auction_source_url, else fallback to county viewDoc by node
  const countyUrl = useMemo(() => {
    const fromDb = (item?.auction_source_url || "").trim();
    return fromDb ? fromDb : fallbackCountyUrl;
  }, [item?.auction_source_url, fallbackCountyUrl]);

  const fullAddress = useMemo(() => buildAddressLine(item || {}), [item]);

  const googleMapsUrl = useMemo(() => {
    if (!isUsableAddress(item)) return "";
    return `https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}`;
  }, [item, fullAddress]);

  const streetViewUrl = useMemo(() => {
    if (!isUsableAddress(item)) return "";
    return `https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&layer=c&cbll=0,0`;
  }, [item, fullAddress]);

  // Zillow: best-effort search by address line
  const zillowUrl = useMemo(() => {
    if (!isUsableAddress(item)) return "";
    // Zillow accepts a "search query" path; spaces OK but we encode
    return `https://www.zillow.com/homes/${encodeURIComponent(fullAddress)}_rb/`;
  }, [item, fullAddress]);

  // Orange County Property Appraiser (OCPA) – best-effort: search by parcel OR address
  const ocpaUrl = useMemo(() => {
    const parcel = (item?.parcel_number || "").trim();
    if (parcel) {
      return `https://www.ocpafl.org/search?search=${encodeURIComponent(parcel)}`;
    }
    if (isUsableAddress(item)) {
      return `https://www.ocpafl.org/search?search=${encodeURIComponent(fullAddress)}`;
    }
    return "";
  }, [item, fullAddress]);

  const googleParcelSearchUrl = useMemo(() => {
    const parcel = (item?.parcel_number || "").trim();
    if (!parcel) return "";
    return `https://www.google.com/search?q=${encodeURIComponent(
      `Orange County FL parcel ${parcel}`
    )}`;
  }, [item?.parcel_number]);

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
              PDF
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

          <Card title="Auction Info (Defaults)">
            <Row label="Location" value={safe(item.auction_location)} />
            <Row label="Start Time" value={safe(item.auction_start_time)} />
            <Row label="Platform" value={safe(item.auction_platform)} />
          </Card>

          <Card title="Address">
            <Row label="Address" value={item.address ? item.address : "missing"} />
            <Row label="City" value={safe(item.city)} />
            <Row label="State (address)" value={safe(item.state_address)} />
            <Row label="ZIP" value={safe(item.zip)} />
            <Row label="Source Marker" value={safe(item.address_source_marker)} />
          </Card>

          <Card title="Investor Mode (Location)">
            {!isUsableAddress(item) ? (
              <div style={{ opacity: 0.7 }}>
                Missing full address (need Address + City + State) to generate map links.
              </div>
            ) : (
              <>
                <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
                  <iframe
                    title="Map Preview"
                    width="100%"
                    height="260"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  <a href={zillowUrl} target="_blank" rel="noreferrer" style={linkBtn}>
                    Zillow
                  </a>

                  <a href={googleMapsUrl} target="_blank" rel="noreferrer" style={linkBtn}>
                    Google Maps
                  </a>

                  <a href={streetViewUrl} target="_blank" rel="noreferrer" style={linkBtn}>
                    Street View
                  </a>

                  {ocpaUrl ? (
                    <a href={ocpaUrl} target="_blank" rel="noreferrer" style={linkBtn}>
                      OCPA (Appraiser)
                    </a>
                  ) : null}

                  {googleParcelSearchUrl ? (
                    <a href={googleParcelSearchUrl} target="_blank" rel="noreferrer" style={linkBtn}>
                      Parcel Search (Google)
                    </a>
                  ) : null}
                </div>

                <div style={{ marginTop: 10, opacity: 0.75 }}>
                  <b>Address:</b> {fullAddress}
                </div>
              </>
            )}
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

          <Card title="Updated">
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

function buildAddressLine(item: any) {
  const parts = [item?.address, item?.city, item?.state_address, item?.zip].filter(Boolean);
  return parts.join(", ");
}

function isUsableAddress(item: any) {
  return Boolean(item?.address && item?.city && item?.state_address);
}
