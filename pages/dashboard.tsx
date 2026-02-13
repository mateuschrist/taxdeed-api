import { useEffect,useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

export default function Dashboard() {
  const router = useRouter();
  const [count,setCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
    });

    fetch("/api/properties")
      .then(r=>r.json())
      .then(d=>setCount(d.length));
  }, []);

  return (
    <div style={{padding:40}}>
      <h1>Dashboard</h1>
      <p>Total lots: {count}</p>
    </div>
  );
}
