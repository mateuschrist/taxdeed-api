// pages/api/ingest.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

function requireBearer(req: NextApiRequest) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const expected = process.env.INGEST_API_TOKEN || "";
  return !!expected && token === expected;
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

    const body = req.body || {};
    if (!body.node) {
      return res.status(400).json({ ok: false, error: "Missing node" });
    }

    const county = body.county ?? "Orange";
    const state = body.state ?? "FL";
    const node = String(body.node);

    // mantém status existente se não vier no payload (pra não “voltar” reviewed -> new)
    const { data: existing, error: exErr } = await supabase
      .from("properties")
      .select("id,status")
      .eq("county", county)
      .eq("state", state)
      .eq("node", node)
      .maybeSingle();

    if (exErr) {
      return res.status(500).json({ ok: false, error: exErr.message });
    }

    // ✅ Orange County: local e horário fixos (por enquanto)
    // (quando você expandir pra todos os condados da FL, a gente muda pra uma tabela "counties" / "auction_sites")
    const auction_location = "109 E Church St, Orlando, FL 32801";
    const auction_time = "10:00 AM";

    const payload: any = {
      county,
      state,
      node,

      // link principal do condado (viewer link)
      auction_source_url: body.auction_source_url ?? null,

      // ✅ FIXO PARA ORANGE COUNTY
      auction_location,
      auction_time,

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

      notes: body.notes ?? null,

      status: body.status ?? existing?.status ?? "new",

      // change detection / lifecycle
      is_active: true,
      removed_at: null,

      updated_at: new Date().toISOString(),
    };

    const { data: upserted, error } = await supabase
      .from("properties")
      .upsert(payload, { onConflict: "county,state,node" })
      .select("id,node")
      .single();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

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