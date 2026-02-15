import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

function first(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function getServerSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  // ✅ Prefer SERVICE ROLE no backend (server-side)
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!url) throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (or anon key)");

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, message: "Method Not Allowed" });
  }

  try {
    const supabase = getServerSupabase();

    const status = first(req.query.status);
    const deed_status = first(req.query.deed_status);
    const city = first(req.query.city);
    const zip = first(req.query.zip);
    const has_address = first(req.query.has_address);
    const sale_date_from = first(req.query.sale_date_from);
    const sale_date_to = first(req.query.sale_date_to);
    const search = first(req.query.search);
    const limitRaw = first(req.query.limit) ?? "200";
    const offsetRaw = first(req.query.offset) ?? "0";

    let q = supabase.from("properties").select("*", { count: "exact" });

    if (status) q = q.eq("status", status);
    if (deed_status) q = q.eq("deed_status", deed_status);
    if (city) q = q.ilike("city", `*${city}*`);
    if (zip) q = q.eq("zip", zip);

    if (has_address === "true") q = q.not("address", "is", null);
    if (has_address === "false") q = q.is("address", null);

    // Se sale_date estiver como string "MM/DD/YYYY", isso funciona como string compare (não perfeito).
    // Melhor prática depois: armazenar sale_date como DATE no banco.
    if (sale_date_from) q = q.gte("sale_date", sale_date_from);
    if (sale_date_to) q = q.lte("sale_date", sale_date_to);

    if (search) {
      const s = search.replace(/"/g, "").trim();
      if (s) {
        // ✅ PostgREST/Supabase .or() usa * e não %
        const like = `*${s}*`;
        q = q.or(
          `node.ilike.${like},parcel_number.ilike.${like},address.ilike.${like},pdf_url.ilike.${like}`
        );
      }
    }

    const lim = Math.min(parseInt(limitRaw, 10) || 200, 1000);
    const off = Math.max(parseInt(offsetRaw, 10) || 0, 0);

    q = q.order("updated_at", { ascending: false }).range(off, off + lim - 1);

    const { data, error, count } = await q;

    if (error) {
      console.error("Supabase query error:", error);
      return res.status(500).json({
        ok: false,
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
      });
    }

    return res.status(200).json({
      ok: true,
      count: count ?? data?.length ?? 0,
      data: data ?? [],
    });
  } catch (e: any) {
    console.error("API /api/properties error:", e);
    return res.status(500).json({
      ok: false,
      message: e?.message ?? String(e),
    });
  }
}
