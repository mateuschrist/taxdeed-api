// pages/api/properties/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function getServerSupabase() {
  // ✅ backend SEMPRE usa service role
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url) throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  if (!service) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, service);
}

function applyOrangeAuctionDefaults(row: any) {
  // ✅ se for Orange County, preenche automaticamente (sem depender do scraper)
  const county = (row?.county || "").toString().toLowerCase();
  const state = (row?.state || "").toString().toUpperCase();

  if (county === "orange" && state === "FL") {
    return {
      ...row,
      auction_location: row?.auction_location ?? "109 E Church St, Orlando, FL 32801",
      auction_time: row?.auction_time ?? "10:00 AM",
    };
  }

  return row;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const idRaw = req.query.id;
  const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;

  if (!id) return res.status(400).json({ ok: false, message: "Missing id" });

  try {
    const supabase = getServerSupabase();

    // ===========================
    // GET SINGLE PROPERTY
    // ===========================
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single();

      if (error) return res.status(500).json({ ok: false, message: error.message });

      const patched = applyOrangeAuctionDefaults(data);
      return res.status(200).json({ ok: true, data: patched });
    }

    // ===========================
    // UPDATE STATUS / NOTES
    // ===========================
    if (req.method === "PUT") {
      const body = req.body || {};
      const status = body.status ?? null;
      const notes = body.notes ?? null;

      const { data, error } = await supabase
        .from("properties")
        .update({
          status,
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) return res.status(500).json({ ok: false, message: error.message });

      const patched = applyOrangeAuctionDefaults(data);
      return res.status(200).json({ ok: true, data: patched });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e: any) {
    console.error("API /api/properties/[id] error:", e);
    return res.status(500).json({ ok: false, message: e?.message ?? String(e) });
  }
}