import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  // Opcional: mostra erros vindos do link (#error=...)
  useEffect(() => {
    if (!router.isReady) return;
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash.includes("error=")) {
      setErr("Link inválido ou expirado. Solicite um novo email de recuperação.");
    }
  }, [router.isReady]);

  async function handleUpdate() {
    setErr("");
    setMsg("");

    if (!password || password.length < 6) {
      setErr("Senha deve ter pelo menos 6 caracteres.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErr(error.message);
      return;
    }

    setMsg("Senha atualizada! Redirecionando para login...");
    setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <div style={{ padding: 40, maxWidth: 420 }}>
      <h1>Reset Password</h1>

      <p>Digite a nova senha.</p>

      <input
        type="password"
        placeholder="Nova senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: 10, marginTop: 8 }}
      />

      <button onClick={handleUpdate} style={{ marginTop: 12 }}>
        Atualizar senha
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
      {err && <p style={{ marginTop: 12, color: "crimson" }}>{err}</p>}
    </div>
  );
}
