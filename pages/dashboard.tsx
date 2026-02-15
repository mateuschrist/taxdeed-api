import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

type CountResp = { ok?: boolean; count?: number; message?: string; error?: any };

export default function Dashboard() {
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const [missing, setMissing] = useState<number | null>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setErr("");

      // 1) Check auth
      const { data, error } = await supabase.auth.getUser();

      if (cancelled) return;

      if (error) {
        setErr(`Auth error: ${error.message}`);
        router.push("/login");
        return;
      }

      if (!data.user) {
        router.push("/login");
        return;
      }

      // 2) Fetch stats ONLY after auth ok
      async function getCount(url: string) {
        const r = await fetch(url);
        const j: CountResp = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(j?.message || `HTTP ${r.status}`);
        }
        return j?.count ?? 0;
      }

      try {
        const total = await getCount("/api/properties?limit=1");
        if (!cancelled) setCount(total);
      } catch (e: any) {
        if (!cancelled) {
          setCount(0);
          setErr((prev) => prev || `Total lots error: ${e?.message || String(e)}`);
        }
      }

      try {
        const miss = await getCount("/api/properties?has_address=false&limit=1");
        if (!cancelled) setMissing(miss);
      } catch (e: any) {
        if (!cancelled) {
          setMissing(null);
          setErr((prev) => prev || `Missing address error: ${e?.message || String(e)}`);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Dashboard</h1>

      {err && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #f99", borderRadius: 10 }}>
          <b>Warning:</b> {err}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
        <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 10, minWidth: 220 }}>
          <div style={{ opacity: 0.7 }}>Total lots</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{count === null ? "…" : count}</div>
        </div>

        <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 10, minWidth: 220 }}>
          <div style={{ opacity: 0.7 }}>Missing address</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{missing === null ? "…" : missing}</div>
        </div>
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
        <button onClick={() => router.push("/properties")} style={{ padding: 10 }}>
          Open Properties
        </button>
        <button onClick={logout} style={{ padding: 10 }}>
          Logout
        </button>
      </div>
    </div>
  );
}
