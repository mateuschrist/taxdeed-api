import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return res.status(500).json({
        ok: false,
        error: "Missing env vars",
        hasUrl: !!url,
        hasKey: !!key,
      });
    }

    const supabase = createClient(url, key);
    const { data, error } = await supabase.from("properties").select("id").limit(1);

    if (error) {
      return res.status(500).json({ ok: false, where: "supabase query", error: error.message });
    }

    return res.status(200).json({ ok: true, rows: data?.length ?? 0 });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}
