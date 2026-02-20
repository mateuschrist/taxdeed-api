// pages/api/properties/index.ts
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

function asStr(v: any) {
  if (v === undefined || v === null) return "";
  return String(v);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getServerSupabase();

    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    // ✅ query params
    const county = asStr(req.query.county).trim(); // ex: Orange
    const q = asStr(req.query.q).trim();           // busca simples
    const limitRaw = asStr(req.query.limit).trim();
    const limit = Math.min(Math.max(Number(limitRaw || 200), 1), 1000); // 1..1000

    // ✅ base query
    let query = supabase
      .from("properties")
      .select(
        "id,county,state,node,sale_date,opening_bid,address,city,state_address,zip,updated_at",
        { count: "exact" }
      )
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(limit);

    // ✅ filter by county (case-insensitive) using ilike
    if (county) {
      query = query.ilike("county", county);
    }

    // ✅ basic search (server-side) – optional
    // busca por address OR parcel_number OR tax_sale_id OR node
    // (mantém simples e rápido)
    if (q) {
      // escape % e _ do ilike
      const esc = q.replace(/[%_]/g, (m) => `\\${m}`);
      const like = `%${esc}%`;
      query = query.or(
        [
          `address.ilike.${like}`,
          `parcel_number.ilike.${like}`,
          `tax_sale_id.ilike.${like}`,
          `node.ilike.${like}`,
          `city.ilike.${like}`,
        ].join(",")
      );
    }

    const { data, error, count } = await query;

    if (error) return res.status(500).json({ ok: false, message: error.message });

    return res.status(200).json({
      ok: true,
      count: count ?? null,
      data: data ?? [],
    });
  } catch (e: any) {
    console.error("API /api/properties error:", e);
    return res.status(500).json({ ok: false, message: e?.message ?? String(e) });
  }
}
