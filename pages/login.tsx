import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function handleLogin() {
    setMsg("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    console.log("LOGIN data:", data);
    console.log("LOGIN error:", error);

    if (error) {
      setMsg(error.message);
      return;
    }

    router.push("/dashboard");
  }

  async function handleReset() {
    setMsg("");

    const redirectTo = `${window.location.origin}/login`;

    const { data, error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo }
    );

    console.log("RESET data:", data);
    console.log("RESET error:", error);

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Email de reset enviado (verifique spam).");
  }

  return (
    <div style={{ padding: 40, maxWidth: 420 }}>
      <h1>Admin Login</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <button onClick={handleLogin} style={{ width: "100%", marginBottom: 10 }}>
        Login
      </button>

      <button onClick={handleReset} style={{ width: "100%" }}>
        Esqueci a senha (Reset)
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
