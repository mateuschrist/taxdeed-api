// pages/api/existence-check.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { mustEnv, requireBearer } from "./_auth";

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
    const county = body.county ?? "Orange";
    const state = body.state ?? "FL";
    const nodes: string[] = Array.isArray(body.nodes) ? body.nodes : [];

    if (!nodes.length) return res.json({ ok: true, existing: [] });

    // Supabase "in" tem limite prático; chunk simples
    const existing: string[] = [];
    const chunkSize = 200;

    for (let i = 0; i < nodes.length; i += chunkSize) {
      const chunk = nodes.slice(i, i + chunkSize);

      const { data, error } = await supabase
        .from("properties")
        .select("node")
        .eq("county", county)
        .eq("state", state)
        .in("node", chunk);

      if (error) return res.status(500).json({ ok: false, error: error.message });

      for (const row of data || []) existing.push(row.node);
    }

    return res.json({ ok: true, existing });
  } catch (e: any) {
    const code = e?.statusCode || 500;
    return res.status(code).json({ ok: false, error: e?.message ?? String(e) });
  }
}
