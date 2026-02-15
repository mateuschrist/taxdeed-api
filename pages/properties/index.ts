import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ message: "Missing id" });

  // ===========================
  // GET SINGLE PROPERTY
  // ===========================
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ message: error.message });
    }

    return res.json({ ok: true, data });
  }

  // ===========================
  // UPDATE STATUS / NOTES
  // ===========================
  if (req.method === "PUT") {
    const { status, notes } = req.body;

    const { data, error } = await supabase
      .from("properties")
      .update({
        status,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ message: error.message });
    }

    return res.json({ ok: true, data });
  }

  res.status(405).json({ message: "Method not allowed" });
}
