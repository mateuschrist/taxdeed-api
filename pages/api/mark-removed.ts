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
    const currentNodes: string[] = Array.isArray(body.current_nodes) ? body.current_nodes : [];

    // Se por algum motivo veio vazio, NÃO marca tudo como removido.
    if (!currentNodes.length) {
      return res.json({ ok: true, removed_marked: 0, note: "current_nodes empty -> skipped" });
    }

    // 1) Busca todos ativos (para esse county/state)
    const { data: activeRows, error: qErr } = await supabase
      .from("properties")
      .select("id,node")
      .eq("county", county)
      .eq("state", state)
      .eq("is_active", true);

    if (qErr) return res.status(500).json({ ok: false, error: qErr.message });

    const currentSet = new Set(currentNodes);
    const toRemove = (activeRows || []).filter((r) => !currentSet.has(r.node));

    if (!toRemove.length) return res.json({ ok: true, removed_marked: 0 });

    const ids = toRemove.map((r) => r.id);

    const { error: uErr } = await supabase
      .from("properties")
      .update({
        is_active: false,
        removed_at: new Date().toISOString(),
        status: "removed",
        updated_at: new Date().toISOString(),
      })
      .in("id", ids);

    if (uErr) return res.status(500).json({ ok: false, error: uErr.message });

    return res.json({ ok: true, removed_marked: ids.length });
  } catch (e: any) {
    const code = e?.statusCode || 500;
    return res.status(code).json({ ok: false, error: e?.message ?? String(e) });
  }
}
