import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ ok: false, error: "Missing email" });

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(url, anon);

  const redirectTo = "https://taxdeed-api-mateus-projects-01756e16.vercel.app/reset-password";

  const { data, error } = await supabase.auth.resetPasswordForEmail(String(email).trim(), { redirectTo });

  if (error) return res.status(400).json({ ok: false, error: error.message });

  return res.status(200).json({ ok: true, data });
}
