// pages/api/scraper-run.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { mustEnv, requireBearer } from "./_auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    requireBearer(req);

    const SUPABASE_URL = mustEnv("SUPABASE_URL");
    const SERVICE_ROLE = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const body = req.body || {};
    const mode = String(body.mode || "");

    if (!mode || !["start", "finish"].includes(mode)) {
      return res.status(400).json({ ok: false, error: "mode must be start|finish" });
    }

    const scraper_name = body.scraper_name ?? "orange_taxdeed";
    const run_id = body.run_id ?? `run_${Date.now()}`;

    if (mode === "start") {
      const { data, error } = await supabase
        .from("scraper_runs")
        .insert({
          scraper_name,
          run_id,
          status: "running",
          found_total: body.found_total ?? 0,
        })
        .select("*")
        .single();

      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.json({ ok: true, data });
    }

    // finish
    const update = {
      finished_at: new Date().toISOString(),
      status: body.status ?? "ok",
      message: body.message ?? null,
      found_total: body.found_total ?? null,
      processed: body.processed ?? null,
      inserted: body.inserted ?? null,
      updated: body.updated ?? null,
      skipped: body.skipped ?? null,
      removed_marked: body.removed_marked ?? null,
    };

    const { data, error } = await supabase
      .from("scraper_runs")
      .update(update)
      .eq("scraper_name", scraper_name)
      .eq("run_id", run_id)
      .select("*")
      .single();

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.json({ ok: true, data });
  } catch (e: any) {
    const code = e?.statusCode || 500;
    return res.status(code).json({ ok: false, error: e?.message ?? String(e) });
  }
}
