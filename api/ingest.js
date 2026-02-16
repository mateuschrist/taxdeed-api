import { createClient } from "@supabase/supabase-js";

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function normalizeBid(v) {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).replace(/,/g, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!process.env.INGEST_API_TOKEN || token !== process.env.INGEST_API_TOKEN) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const SUPABASE_URL = mustEnv("SUPABASE_URL");
  const SERVICE_ROLE = mustEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const body = req.body || {};
  if (!body.node) return res.status(400).json({ ok: false, error: "Missing node" });

  const payload = {
    county: body.county ?? "Orange",
    state: body.state ?? "FL",
    node: String(body.node),

    tax_sale_id: body.tax_sale_id ?? null,
    parcel_number: body.parcel_number ?? null,
    sale_date: body.sale_date ?? null,
    opening_bid: normalizeBid(body.opening_bid),
    deed_status: body.deed_status ?? null,
    applicant_name: body.applicant_name ?? null,

    pdf_url: body.pdf_url ?? null,
    address: body.address ?? null,
    city: body.city ?? null,
    state_address: body.state_address ?? null,
    zip: body.zip ?? null,
    address_source_marker: body.address_source_marker ?? null,

    status: body.status ?? "new",
    notes: body.notes ?? null,

    // ✅ “se chegou via scraper, está ativo”
    is_active: true,
    removed_at: null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("properties")
    .upsert(payload, {
      onConflict: "county,state,node", // usa o unique index
    })
    .select("id,node")
    .single();

  if (error) return res.status(500).json({ ok: false, error: error.message });

  return res.json({ ok: true, action: "upserted", id: data.id, node: data.node });
}
