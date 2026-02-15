import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

function getServerSupabase() {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!url) throw new Error("Missing SUPABASE_URL");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, key);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false });
  }

  try {
    const supabase = getServerSupabase();

    const {
      status,
      search,
      has_address,
      limit = "200",
      offset = "0",
    } = req.query;

    let q = supabase
      .from("properties")
      .select("*", { count: "exact" });

    if (status) q = q.eq("status", String(status));

    if (has_address === "true") q = q.not("address", "is", null);
    if (has_address === "false") q = q.is("address", null);

    if (search) {
      const s = String(search).replace(/"/g, "");
      q = q.or(
        `node.ilike.%${s}%,parcel_number.ilike.%${s}%,address.ilike.%${s}%`
      );
    }

    const lim = Math.min(parseInt(String(limit)), 1000);
    const off = Math.max(parseInt(String(offset)), 0);

    q = q.order("updated_at", { ascending: false }).range(off, off + lim - 1);

    const { data, error, count } = await q;

    if (error) {
      console.error(error);
      return res.status(500).json({ ok: false, error });
    }

    return res.status(200).json({
      ok: true,
      indicated: data?.length ?? 0,
      count: count ?? 0,
      data: data ?? [],
    });

  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ ok: false, message: e.message });
  }
}
