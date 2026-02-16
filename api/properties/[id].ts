import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

function getServerSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url) throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, key);
}

function asId(q: string | string[] | undefined) {
  if (!q) return null;
  return Array.isArray(q) ? q[0] : q;
}

const ALLOWED_STATUS = new Set(["new", "reviewed", "skipped", "exported"]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = asId(req.query.id);
  if (!id) return res.status(400).json({ ok: false, message: "Missing id" });

  let supabase;
  try {
    supabase = getServerSupabase();
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e?.message ?? String(e) });
  }

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
      // "PGRST116" costuma ser "No rows found"
      const notFound = (error as any)?.code === "PGRST116";
      return res.status(notFound ? 404 : 500).json({
        ok: false,
        message: notFound ? "Not found" : error.message,
      });
    }

    return res.status(200).json({ ok: true, data });
  }

  // ===========================
  // UPDATE STATUS / NOTES
  // ===========================
  if (req.method === "PUT") {
    const status = req.body?.status;
    const notes = req.body?.notes;

    const update: Record<string, any> = {};

    if (status !== undefined) {
      const s = String(status).trim();
      if (!ALLOWED_STATUS.has(s)) {
        return res.status(400).json({
          ok: false,
          message: `Invalid status. Allowed: ${Array.from(ALLOWED_STATUS).join(", ")}`,
        });
      }
      update.status = s;
    }

    if (notes !== undefined) {
      update.notes = notes === null ? null : String(notes);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ ok: false, message: "Nothing to update" });
    }

    // Se você NÃO tem trigger de updated_at no Supabase, descomente:
    // update.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("properties")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      const notFound = (error as any)?.code === "PGRST116";
      return res.status(notFound ? 404 : 500).json({
        ok: false,
        message: notFound ? "Not found" : error.message,
      });
    }

    return res.status(200).json({ ok: true, data });
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ ok: false, message: "Method not allowed" });
}
