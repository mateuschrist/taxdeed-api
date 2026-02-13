import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // (opcional) proteger com token também:
  const protect = (process.env.PROTECT_GET === "true");
  if (protect) {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!process.env.INGEST_API_TOKEN || token !== process.env.INGEST_API_TOKEN) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const {
    status,
    deed_status,
    city,
    zip,
    has_address,
    search,
    sale_date_from,
    sale_date_to,
    limit = "50",
    offset = "0",
    sort = "updated_at_desc",
  } = req.query;

  let q = supabase.from("properties").select("*", { count: "exact" });

  // filters
  if (status) q = q.eq("status", status);
  if (deed_status) q = q.eq("deed_status", deed_status);
  if (city) q = q.ilike("city", `%${city}%`);
  if (zip) q = q.eq("zip", zip);

  if (has_address === "true") q = q.not("address", "is", null);
  if (has_address === "false") q = q.is("address", null);

  if (sale_date_from) q = q.gte("sale_date", sale_date_from);
  if (sale_date_to) q = q.lte("sale_date", sale_date_to);

  if (search) {
    // OR across multiple fields
    q = q.or(
      [
        `node.ilike.%${search}%`,
        `parcel_number.ilike.%${search}%`,
        `address.ilike.%${search}%`,
        `pdf_url.ilike.%${search}%`,
        `tax_sale_id.ilike.%${search}%`,
      ].join(",")
    );
  }

  // sorting
  if (sort === "sale_date_asc") q = q.order("sale_date", { ascending: true, nullsFirst: false });
  else if (sort === "sale_date_desc") q = q.order("sale_date", { ascending: false, nullsFirst: false });
  else q = q.order("updated_at", { ascending: false });

  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const off = Math.max(parseInt(offset, 10) || 0, 0);

  q = q.range(off, off + lim - 1);

  const { data, error, count } = await q;

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({
    ok: true,
    count,
    limit: lim,
    offset: off,
    data
  });
}
