import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!process.env.INGEST_API_TOKEN || token !== process.env.INGEST_API_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const data = req.body || {};
  if (!data.node) return res.status(400).json({ error: "Missing node" });

  let opening_bid = null;
  if (data.opening_bid !== undefined && data.opening_bid !== null && data.opening_bid !== "") {
    const s = String(data.opening_bid).replace(/,/g, "");
    const n = Number(s);
    opening_bid = Number.isFinite(n) ? n : null;
  }

  const payload = {
    county: data.county ?? "Orange",
    state: data.state ?? "FL",
    node: data.node,
    tax_sale_id: data.tax_sale_id ?? null,
    parcel_number: data.parcel_number ?? null,
    sale_date: data.sale_date ?? null,
    opening_bid,
    deed_status: data.deed_status ?? null,
    applicant_name: data.applicant_name ?? null,
    pdf_url: data.pdf_url ?? null,
    address: data.address ?? null,
    city: data.city ?? null,
    state_address: data.state_address ?? null,
    zip: data.zip ?? null,
    address_source_marker: data.address_source_marker ?? null,
    status: data.status ?? "new",
    notes: data.notes ?? null,
  };

  const { data: upserted, error } = await supabase
    .from("properties")
    .upsert(payload, { onConflict: "node" })
    .select("id,node")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ success: true, action: "upserted", id: upserted.id, node: upserted.node });
}
