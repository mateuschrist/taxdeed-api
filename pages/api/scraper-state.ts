// pages/api/scraper-state.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { mustEnv, requireBearer } from "./_auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    requireBearer(req);

    const SUPABASE_URL = mustEnv("SUPABASE_URL");
    const SERVICE_ROLE = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const scraper = String(req.query.scraper || (req.body as any)?.scraper || "orange_taxdeed");

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("scraper_state")
        .select("*")
        .eq("scraper_name", scraper)
        .maybeSingle();

      if (error) return res.status(500).json({ ok: false, error: error.message });

      return res.json({ ok: true, data: data ?? null });
    }

    if (req.method === "POST") {
      const body = (req.body as any) || {};
      const payload = {
        scraper_name: scraper,
        last_tax_sale_id: body.last_tax_sale_id ?? null,
        last_node: body.last_node ?? null,
        last_run_id: body.last_run_id ?? null,
        last_run_at: body.last_run_at ?? new Date().toISOString(),
        done_for_today: body.done_for_today ?? false,
        resume_after: body.resume_after ?? null,
        updated_at: new Date().toISOString(),
      };

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
