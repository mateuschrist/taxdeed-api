l// pages/api/scraper-state.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { mustEnv, requireBearer } from "./_auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    //requireBearer(req);

    const SUPABASE_URL = mustEnv("SUPABASE_URL");
    const SERVICE_ROLE = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const scraper = String(req.query.scraper || req.body?.scraper || "orange_taxdeed");

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("scraper_state")
        .select("*")
        .eq("scraper_name", scraper)
        .maybeSingle();

      if (error) return res.status(500).json({ ok: false, error: error.message });

      // Se não existir ainda, cria um estado inicial
      if (!data) {
        const initPayload = {
          scraper_name: scraper,
          offset: 0,
          done_for_today: false,
          resume_after: null,
          updated_at: new Date().toISOString(),
        };

        const { data: created, error: e2 } = await supabase
          .from("scraper_state")
          .insert(initPayload)
          .select("*")
          .single();

        if (e2) return res.status(500).json({ ok: false, error: e2.message });
        return res.json({ ok: true, data: created });
      }

      return res.json({ ok: true, data });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      // offset (pra batch de 10 em 10)
      const offsetRaw = body.offset;
      const offset = Number.isFinite(Number(offsetRaw)) ? Number(offsetRaw) : undefined;

      const payload: any = {
        scraper_name: scraper,
        updated_at: new Date().toISOString(),
      };

      // só setar se veio no body (evita sobrescrever com undefined)
      if (offset !== undefined) payload.offset = offset;

      if ("last_tax_sale_id" in body) payload.last_tax_sale_id = body.last_tax_sale_id ?? null;
      if ("last_node" in body) payload.last_node = body.last_node ?? null;
      if ("last_run_id" in body) payload.last_run_id = body.last_run_id ?? null;
      if ("last_run_at" in body) payload.last_run_at = body.last_run_at ?? new Date().toISOString();
      if ("done_for_today" in body) payload.done_for_today = !!body.done_for_today;
      if ("resume_after" in body) payload.resume_after = body.resume_after ?? null;

      const { data, error } = await supabase
        .from("scraper_state")
        .upsert(payload, { onConflict: "scraper_name" })
        .select("*")
        .single();

      if (error) return res.status(500).json({ ok: false, error: error.message });

      return res.json({ ok: true, data });
    }

    res.setHeader("Allow", "GET,POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e: any) {
    const code = e?.statusCode || 500;
    return res.status(code).json({ ok: false, error: e?.message ?? String(e) });
  }
}
