// pages/api/ingest.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { mustEnv, requireBearer } from "./_auth";

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

    requireBearer(req);

    const SUPABASE_URL = mustEnv("SUPABASE_URL");
    const SERVICE_ROLE = mustEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = req.body || {};
    if (!body.node) return res.status(400).json({ ok: false, error: "Missing node" });

    const county = body.county ?? "Orange";
    const state = body.state ?? "FL";
    const node = String(body.node);

    // 1) Busca existente para manter status quando não enviado
    const { data: existing, error: exErr } = await supabase
      .from("properties")
      .select("id,status")
      .eq("county", county)
      .eq("state", state)
      .eq("node", node)
      .maybeSingle();

    if (exErr) return res.status(500).json({ ok: false, error: exErr.message });

    const opening_bid = normalizeBid(body.opening_bid);

    const payload: any = {
      county,
      state,
      node,

      tax_sale_id: body.tax_sale_id ?? null,
      parcel_number: body.parcel_number ?? null,
      sale_date: body.sale_date ?? null,
      opening_bid,
      deed_status: body.deed_status ?? null,
      applicant_name: body.applicant_name ?? null,

      pdf_url: body.pdf_url ?? null,
      address: body.address ?? null,
      city: body.city ?? null,
      state_address: body.state_address ?? null,
      zip: body.zip ?? null,
      address_source_marker: body.address_source_marker ?? null,

      notes: body.notes ?? null,

      // ✅ sempre ativo se chegou via scraper
      is_active: true,
      removed_at: null,
      updated_at: new Date().toISOString(),
    };

    // status: mantém o existente se não vier no payload
    payload.status = body.status ?? existing?.status ?? "new";

    // 2) Upsert (por county,state,node)
    const { data, error } = await supabase
      .from("properties")
      .upsert(payload, { onConflict: "county,state,node" })
      .select("id,node")
      .single();

    if (error) return res.status(500).json({ ok: false, error: error.message });

    return res.json({
      ok: true,
      success: true,
      action: existing ? "updated" : "created",
      id: data.id,
      node: data.node,
    });
  } catch (e: any) {
    const code = e?.statusCode || 500;
    return res.status(code).json({ ok: false, error: e?.message ?? String(e) });
  }
}
