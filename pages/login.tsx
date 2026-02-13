import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return setError(error.message);

    router.push("/dashboard");
  }

  return (
    <div style={{padding:40}}>
      <h1>Admin Login</h1>

      <input placeholder="Email" onChange={e=>setEmail(e.target.value)} />
      <br/>
      <input type="password" placeholder="Password" onChange={e=>setPassword(e.target.value)} />
      <br/>

      <button onClick={handleLogin}>Login</button>

      {error && <p>{error}</p>}
    </div>
  );
}
