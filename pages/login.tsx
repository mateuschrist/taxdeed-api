import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
  }

  async function handleForgotPassword() {
    setError("");
    setMessage("");

    if (!email) {
      setError("Digite seu email primeiro.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        "https://taxdeed-api-mateus-projects-01756e16.vercel.app/reset-password",
    });

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Email de recuperação enviado. Verifique sua caixa de entrada.");
  }

  return (
    <div style={{ padding: 40, maxWidth: 420 }}>
      <h1>Admin Login</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />

      <button onClick={handleLogin} disabled={loading}>
        {loading ? "Entrando..." : "Login"}
      </button>

      <div style={{ marginTop: 15 }}>
        <button
          onClick={handleForgotPassword}
          style={{ fontSize: 14, background: "none", border: "none", color: "blue", cursor: "pointer" }}
        >
          Forgot password?
        </button>
      </div>

      {message && <p style={{ color: "green", marginTop: 15 }}>{message}</p>}
      {error && <p style={{ color: "red", marginTop: 15 }}>{error}</p>}
    </div>
  );
}
