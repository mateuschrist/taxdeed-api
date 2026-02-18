// pages/api/properties/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

function getServerSupabase() {
  // ✅ backend SEMPRE usa service role
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url) throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  if (!service) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, service);
}

function applyOrangeAuctionDefaults(row: any) {
  const county = (row?.county || "").toString().toLowerCase();
  const state = (row?.state || "").toString().toUpperCase();

  if (county === "orange" && state === "FL") {
    return {
      ...row,
      // ✅ defaults Orange County
      auction_location: row?.auction_location ?? "109 E Church St, Orlando, FL 32801",
      auction_start_time: row?.auction_start_time ?? "10:00 AM",
      auction_platform: row?.auction_platform ?? "In-Person",
      // ✅ se você já salva o link do “viewer” do condado, usa ele como fonte
      auction_source_url: row?.auction_source_url ?? row?.tax_sale_url ?? null,
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
      const { data, error } = await supabase.from("properties").select("*").eq("id", id).single();
      if (error) return res.status(500).json({ ok: false, message: error.message });

      return res.status(200).json({ ok: true, data: applyOrangeAuctionDefaults(data) });
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

      return res.status(200).json({ ok: true, data: applyOrangeAuctionDefaults(data) });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e: any) {
    console.error("API /api/properties/[id] error:", e);
    return res.status(500).json({ ok: false, message: e?.message ?? String(e) });
  }
}
