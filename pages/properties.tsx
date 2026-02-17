import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

type Property = {
  id: number;
  node: string;
  sale_date: string | null;
  opening_bid: number | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  pdf_url: string | null;
  updated_at: string | null;
  status: string | null;
};

type ApiResp = {
  ok: boolean;
  data: Property[];
  count: number;
  message?: string;
  debug?: any;
};

function formatUSD(value: any) {
  const n =
    typeof value === "number"
      ? value
      : value !== null && value !== undefined && value !== ""
      ? Number(String(value).replace(/,/g, ""))
      : NaN;

  if (!Number.isFinite(n)) return "-";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function PropertiesPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Property[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [debug, setDebug] = useState<any>(null);

  // filters (mantive os mesmos — você pode remover depois se quiser)
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [hasAddress, setHasAddress] = useState<string>(""); // "", "true", "false"

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    if (hasAddress) params.set("has_address", hasAddress);
    params.set("limit", "200");
    return `/api/properties?${params.toString()}`;
  }, [status, search, hasAddress]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;

      if (error || !data.user) {
        router.push("/login");
        return;
      }

      setAuthChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function load() {
    setLoading(true);
    setError("");
    setDebug(null);

    try {
      const res = await fetch(queryUrl);
      const text = await res.text();

      let json: ApiResp | any = null;
      try {
        json = JSON.parse(text);
      } catch {
        // backend returned HTML or plain text
      }

      if (!res.ok) {
        const msg =
          json?.message ||
          json?.error ||
          (text?.slice(0, 300) || `HTTP ${res.status}`);
        setDebug({ status: res.status, bodyPreview: text?.slice(0, 800) });
        throw new Error(msg);
      }

      if (!json?.ok) {
        setDebug(json?.debug || json);
        throw new Error(json?.message || "API returned ok=false");
      }

      const list: Property[] = json.data ?? [];
      setRows(list);
      setTotal(json.count ?? list.length);
    } catch (e: any) {
      setError(e?.message || "Failed to load properties");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authChecked) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, queryUrl]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function getCountyLotUrl(node: string) {
    return `https://or.occompt.com/recorder/eagleweb/viewDoc.jsp?node=${encodeURIComponent(
      node
    )}`;
  }

  const addressText = (r: Property) => {
    const addr = r.address ? r.address : "missing";
    const city = r.city ? r.city : "-";
    const zip = r.zip ? r.zip : "-";
    return `${addr} — ${city} ${zip}`;
  };

  return (
    <div style={{ padding: 30 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Properties</h1>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            Showing {rows.length} of {total}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} disabled={loading} style={{ padding: 10 }}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            style={{ padding: 10 }}
          >
            Dashboard
          </button>
          <button onClick={logout} style={{ padding: 10 }}>
            Logout
          </button>
        </div>
      </div>

      {/* filtros (opcional manter) */}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ padding: 10 }}
        >
          <option value="">All Status</option>
          <option value="new">new</option>
          <option value="reviewed">reviewed</option>
          <option value="skipped">skipped</option>
          <option value="exported">exported</option>
        </select>

        <select
          value={hasAddress}
          onChange={(e) => setHasAddress(e.target.value)}
          style={{ padding: 10 }}
        >
          <option value="">All Address</option>
          <option value="true">Has address</option>
          <option value="false">Missing address</option>
        </select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search address / city / zip..."
          style={{ padding: 10, minWidth: 280 }}
        />
      </div>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #f99",
            borderRadius: 10,
          }}
        >
          <b>Error:</b> {error}
          {debug && (
            <pre style={{ marginTop: 10, overflowX: "auto", fontSize: 12 }}>
              {JSON.stringify(debug, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div style={{ marginTop: 14, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Sale Date", "Bid", "Address / City / ZIP", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ddd",
                      padding: 10,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={td}>{r.sale_date ?? "-"}</td>
                <td style={td}>{formatUSD(r.opening_bid)}</td>
                <td style={{ ...td, whiteSpace: "normal", minWidth: 320 }}>
                  {addressText(r)}
                </td>

                <td style={td}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {/* Open = link externo */}
                    <a
                      href={getCountyLotUrl(r.node)}
                      target="_blank"
                      rel="noreferrer"
                      style={linkBtn}
                    >
                      Open
                    </a>

                    {/* Details = interno */}
                    <button
                      onClick={() => router.push(`/properties/${r.id}`)}
                      style={{ padding: "6px 10px", whiteSpace: "nowrap" }}
                    >
                      Details
                    </button>

                    {/* PDF */}
                    {r.pdf_url ? (
                      <a
                        href={r.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        style={linkBtn}
                      >
                        PDF
                      </a>
                    ) : (
                      <span style={{ opacity: 0.6, whiteSpace: "nowrap" }}>
                        No PDF
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {!loading && rows.length === 0 && !error && (
              <tr>
                <td colSpan={4} style={{ padding: 18 }}>
                  No properties found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const td: React.CSSProperties = {
  padding: 10,
  borderBottom: "1px solid #eee",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};

const linkBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  border: "1px solid #999",
  borderRadius: 4,
  textDecoration: "none",
  color: "inherit",
  background: "#f5f5f5",
  whiteSpace: "nowrap",
};
