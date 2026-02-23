// pages/api/ingest.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const INGEST_API_TOKEN = process.env.INGEST_API_TOKEN!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function authOk(req: NextApiRequest) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice("Bearer ".length) : "";
  return token && token === INGEST_API_TOKEN;
}

function cleanStr(v: any) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function normalizeBid(v: any) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const cleaned = s.replace(/,/g, "").replace(/[^0-9.]/g, "");
  return cleaned ? cleaned : null; // salva como string (igual seu schema atual)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!authOk(req)) return res.status(401).json({ error: "Unauthorized" });

  try {
    const b = req.body || {};

    const county = cleanStr(b.county);
    const state = cleanStr(b.state);
    const node = cleanStr(b.node);

    if (!county || !node) {
      return res.status(400).json({ error: "Missing required fields: county, node" });
    }

    const payload = {
      county,
      state,

      node,

      tax_sale_id: cleanStr(b.tax_sale_id),
      parcel_number: cleanStr(b.parcel_number),
      sale_date: cleanStr(b.sale_date),
      opening_bid: normalizeBid(b.opening_bid),

      deed_status: cleanStr(b.deed_status),
      applicant_name: cleanStr(b.applicant_name),

      pdf_url: cleanStr(b.pdf_url),
      auction_source_url: cleanStr(b.auction_source_url),

      address: cleanStr(b.address),
      city: cleanStr(b.city),
      state_address: cleanStr(b.state_address),
      zip: cleanStr(b.zip),
      address_source_marker: cleanStr(b.address_source_marker),

      auction_location: cleanStr(b.auction_location),
      auction_start_time: cleanStr(b.auction_start_time),
      auction_platform: cleanStr(b.auction_platform),

      status: cleanStr(b.status) || "new",
      notes: cleanStr(b.notes),

      is_active: true,
      removed_at: null,
      updated_at: new Date().toISOString(),
    };

    // ✅ UPSERT usando conflito em (county,node)
    const { data, error } = await supabase
      .from("properties")
      .upsert(payload, { onConflict: "county,node" })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message, details: error });
    }

    return res.status(201).json({ ok: true, id: data?.id, county, node });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
