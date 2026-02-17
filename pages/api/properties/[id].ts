import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

function getServerSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!url) throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)");

  return createClient(url, key);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const idRaw = req.query.id;
  const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;

  if (!id) return res.status(400).json({ ok: false, message: "Missing id" });

  try {
    const supabase = getServerSupabase();

    if (req.method === "GET") {
      const { data, error } = await supabase.from("properties").select("*").eq("id", id).single();

      if (error) return res.status(500).json({ ok: false, message: error.message });
      return res.status(200).json({ ok: true, data });
    }

    if (req.method === "PUT") {
      const { status, notes } = req.body || {};

      const { data, error } = await supabase
        .from("properties")
        .update({
          status: status ?? null,
          notes: notes ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) return res.status(500).json({ ok: false, message: error.message });
      return res.status(200).json({ ok: true, data });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e: any) {
    console.error("API /api/properties/[id] error:", e);
    return res.status(500).json({ ok: false, message: e?.message ?? String(e) });
  }
}
