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
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const supabase = getServerSupabase();

    const { status, has_address, search, limit = "200", offset = "0" } = req.query;

    let q = supabase.from("properties").select("*", { count: "exact" });

    if (status) q = q.eq("status", String(status));

    if (has_address === "true") q = q.not("address", "is", null);
    if (has_address === "false") q = q.is("address", null);

    if (search) {
      const s = String(search).replace(/"/g, "");
      q = q.or(`node.ilike.%${s}%,parcel_number.ilike.%${s}%,address.ilike.%${s}%`);
    }

    const lim = Math.min(parseInt(String(limit), 10) || 200, 1000);
    const off = Math.max(parseInt(String(offset), 10) || 0, 0);

    q = q.order("updated_at", { ascending: false }).range(off, off + lim - 1);

    const { data, error, count } = await q;

    if (error) {
      console.error("Supabase query error:", error);
      return res.status(500).json({ ok: false, message: error.message });
    }

    return res.status(200).json({
      ok: true,
      count: count ?? data?.length ?? 0,
      limit: lim,
      offset: off,
      data: data ?? [],
    });
  } catch (e: any) {
    console.error("API /api/properties error:", e);
    return res.status(500).json({ ok: false, message: e?.message ?? String(e) });
  }
}
