"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function manejarLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Correo o contraseña incorrectos.");
      setCargando(false);
      return;
    }
    router.push("/panel");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-8"
        style={{ border: "1px solid var(--border-light)", boxShadow: "var(--modal-shadow-light)" }}
      >
        <h1 className="text-2xl font-bold">
          EDINUN <span style={{ color: "var(--accent)" }}>STEAM</span>
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Inicia sesión para continuar
        </p>

        <form onSubmit={manejarLogin} className="mt-6 flex flex-col gap-4">
          {error && <div className="banner-error">{error}</div>}

          <label className="text-sm font-medium">
            Correo electrónico
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-[#F69E26]"
              style={{ borderColor: "var(--border-light-md)" }}
            />
          </label>

          <label className="text-sm font-medium">
            Contraseña
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-[#F69E26]"
              style={{ borderColor: "var(--border-light-md)" }}
            />
          </label>

          <button
            type="submit"
            disabled={cargando}
            className="mt-2 rounded-full py-2.5 font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {cargando ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          ¿No tienes cuenta?{" "}
          <Link href="/auth/registro" className="font-semibold" style={{ color: "var(--accent-hover)" }}>
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  );
}
