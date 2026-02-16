import { createClient } from "@supabase/supabase-js";

function normalizeBid(v) {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).replace(/,/g, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // ---- Auth: Bearer token ----
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!process.env.INGEST_API_TOKEN) {
    return res.status(500).json({
      success: false,
      error: "Server misconfigured: missing INGEST_API_TOKEN",
    });
  }

  if (token !== process.env.INGEST_API_TOKEN) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  // ---- Supabase env checks ----
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      success: false,
      error: "Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ---- Body ----
  const data = req.body || {};
  if (!data.node || String(data.node).trim() === "") {
    return res.status(400).json({ success: false, error: "Missing node" });
  }

  const node = String(data.node).trim();

  // Normalize location defaults by county/state
  const county = (data.county ?? "Orange").toString().trim();
  const state = (data.state ?? "FL").toString().trim().toUpperCase();

  let auction_location = data.auction_location ?? null;
  let auction_start_time = data.auction_start_time ?? null;
  let auction_platform = data.auction_platform ?? null;
  let auction_source_url = data.auction_source_url ?? null;

  // Default (Orange County Tax Deed context)
  // (Se depois você quiser fazer por condado, a gente transforma isso num map)
  if (!auction_location && county.toLowerCase() === "orange" && state === "FL") {
    auction_location = "109 E. Church Street, Suite 300, Orlando, FL 32801";
    auction_start_time = "10:00 AM";
    auction_platform = "Orange County Comptroller (Tax Deed Sales)";
    auction_source_url = "https://www.occompt.com/Faq.aspx?TID=16";
  }

  const opening_bid = normalizeBid(data.opening_bid);

  const payload = {
    // identifiers
    county,
    state,
    node,

    // core
    tax_sale_id: data.tax_sale_id ?? null,
    parcel_number: data.parcel_number ?? null,
    sale_date: data.sale_date ?? null,
    opening_bid,
    deed_status: data.deed_status ?? null,
    applicant_name: data.applicant_name ?? null,
    pdf_url: data.pdf_url ?? null,

    // address
    address: data.address ?? null,
    city: data.city ?? null,
    state_address: data.state_address ?? null,
    zip: data.zip ?? null,
    address_source_marker: data.address_source_marker ?? null,

    // auction fields (NEW)
    auction_location,
    auction_start_time,
    auction_platform,
    auction_source_url,

    // admin/debug
    status: data.status ?? "new",
    notes: data.notes ?? null,

    // opcional futuro:
    // raw_ocr_text: data.raw_ocr_text ?? null,
  };

  try {
    const { data: upserted, error } = await supabase
      .from("properties")
      .upsert(payload, { onConflict: "node" })
      .select("id,node")
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({
      success: true,
      action: "upserted",
      id: upserted.id,
      node: upserted.node,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: e?.message ?? String(e),
    });
  }
}
