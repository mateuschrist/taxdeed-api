import { useEffect, useState } from "react";
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
  status: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export default function PropertyDetail() {
  const router = useRouter();
  const { id } = router.query;

  if (!supabase) {
    return <div style={{ padding: 40 }}>Missing Supabase env vars.</div>;
  }

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [item, setItem] = useState<Property | null>(null);
  const [status, setStatus] = useState<string>("new");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push("/login");
    })();
  }, [router]);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/properties/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Aceita tanto {ok:true,data:{...}} quanto objeto direto
      const record: Property | null = data?.data ?? data ?? null;
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 30 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Property Detail</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => router.push("/properties")} style={{ padding: 10 }}>
            Back to list
          </button>
          <button onClick={() => router.push("/dashboard")} style={{ padding: 10 }}>
            Dashboard
          </button>
        </div>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && item && (
        <div style={{ marginTop: 14, display: "grid", gap: 10, maxWidth: 900 }}>
          <Card title="Core">
            <Row label="ID" value={String(item.id)} />
            <Row label="Node" value={item.node} />
            <Row label="Tax Sale ID" value={item.tax_sale_id ?? "-"} />
            <Row label="Parcel" value={item.parcel_number ?? "-"} />
            <Row label="Sale Date" value={item.sale_date ?? "-"} />
            <Row label="Opening Bid" value={item.opening_bid !== null ? String(item.opening_bid) : "-"} />
            <Row label="Deed Status" value={item.deed_status ?? "-"} />
            <Row label="Applicant" value={item.applicant_name ?? "-"} />
          </Card>

          <Card title="Address">
            <Row label="Address" value={item.address ?? "missing"} />
            <Row label="City" value={item.city ?? "-"} />
            <Row label="State" value={item.state_address ?? "-"} />
            <Row label="ZIP" value={item.zip ?? "-"} />
            <Row label="Source Marker" value={item.address_source_marker ?? "-"} />
          </Card>

          <Card title="Links">
            <Row
              label="PDF"
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
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: 10 }}>
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
                  style={{ width: "100%", minHeight: 90, padding: 10 }}
                  placeholder="Add notes..."
                />
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <button onClick={save} disabled={saving} style={{ padding: 10 }}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>

            <div style={{ marginTop: 10, opacity: 0.7 }}>
              <div>Created: {item.created_at ?? "-"}</div>
              <div>Updated: {item.updated_at ?? "-"}</div>
            </div>
          </Card>
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
      <div>{value}</div>
    </div>
  );
}
