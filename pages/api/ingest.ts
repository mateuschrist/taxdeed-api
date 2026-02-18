// pages/api/ingest.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

function requireBearer(req: NextApiRequest) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const expected = process.env.INGEST_API_TOKEN || "";
  return Boolean(expected && token === expected);
}

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function normalizeBid(v: any) {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).replace(/,/g, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function orangeAuctionDefaults(countyRaw: any, stateRaw: any) {
  const county = String(countyRaw || "").toLowerCase();
  const state = String(stateRaw || "").toUpperCase();

  if (county === "orange" && state === "FL") {
    return {
      auction_location: "109 E Church St, Orlando, FL 32801",
      auction_start_time: "10:00 AM",
      auction_platform: "In-Person",
    };
  }
  return {
    auction_location: null,
    auction_start_time: null,
    auction_platform: null,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    if (!requireBearer(req)) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const SUPABASE_URL = mustEnv("SUPABASE_URL");
    const SERVICE_ROLE = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const data = req.body || {};
    if (!data.node) return res.status(400).json({ ok: false, error: "Missing node" });

    const county = data.county ?? "Orange";
    const state = data.state ?? "FL";
    const node = String(data.node);

    // mantém status existente se não vier no payload
    const { data: existing, error: exErr } = await supabase
      .from("properties")
      .select("id,status")
      .eq("county", county)
      .eq("state", state)
      .eq("node", node)
      .maybeSingle();

    if (exErr) return res.status(500).json({ ok: false, error: exErr.message });

    const orangeDefaults = orangeAuctionDefaults(county, state);

    const payload: any = {
      county,
      state,
      node,

      tax_sale_id: data.tax_sale_id ?? null,
      parcel_number: data.parcel_number ?? null,
      sale_date: data.sale_date ?? null,
      opening_bid: normalizeBid(data.opening_bid),
      deed_status: data.deed_status ?? null,
      applicant_name: data.applicant_name ?? null,

      pdf_url: data.pdf_url ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      state_address: data.state_address ?? null,
      zip: data.zip ?? null,
      address_source_marker: data.address_source_marker ?? null,

      // ✅ novos campos do leilão
      auction_source_url: data.auction_source_url ?? data.viewer_url ?? null,

      // Se o payload vier com valores, usa. Se não vier, aplica defaults de Orange.
      auction_location: data.auction_location ?? orangeDefaults.auction_location,
      auction_start_time: data.auction_start_time ?? orangeDefaults.auction_start_time,
      auction_platform: data.auction_platform ?? orangeDefaults.auction_platform,

      notes: data.notes ?? null,
      status: data.status ?? existing?.status ?? "new",

      is_active: true,
      removed_at: null,
      updated_at: new Date().toISOString(),
    };

    const { data: upserted, error } = await supabase
      .from("properties")
      .upsert(payload, { onConflict: "county,state,node" })
      .select("id,node")
      .single();

    if (error) return res.status(500).json({ ok: false, error: error.message });

    return res.json({
      ok: true,
      success: true,
      action: existing ? "updated" : "created",
      id: upserted.id,
      node: upserted.node,
    });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e?.message ?? String(e) });
  }
}
