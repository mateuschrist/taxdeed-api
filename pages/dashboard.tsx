import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

export default function Dashboard() {
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const [missing, setMissing] = useState<number | null>(null);

  if (!supabase) {
    return <div style={{ padding: 40 }}>Missing Supabase env vars.</div>;
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push("/login");
    })();

    // total
    fetch("/api/properties?limit=1")
      .then((r) => r.json())
      .then((d) => setCount(d?.count ?? 0))
      .catch(() => setCount(0));

    // missing address (se existir filtro has_address=false no backend)
    fetch("/api/properties?has_address=false&limit=1")
      .then((r) => r.json())
      .then((d) => setMissing(d?.count ?? 0))
      .catch(() => setMissing(null));
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Dashboard</h1>

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
