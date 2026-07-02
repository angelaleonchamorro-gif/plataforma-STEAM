"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Rol = "directivo" | "docente" | "estudiante";

const ROLES: { valor: Rol; titulo: string; desc: string }[] = [
  { valor: "directivo", titulo: "Directivo", desc: "Configura la institución: frecuencia, duración y asignaturas de los proyectos" },
  { valor: "docente", titulo: "Docente", desc: "Crea clases, selecciona destrezas y genera proyectos STEAM con IA" },
  { valor: "estudiante", titulo: "Estudiante", desc: "Únete a tu clase con el código de tu docente y desarrolla las actividades" },
];

export default function RegistroPage() {
  const router = useRouter();
  const [rol, setRol] = useState<Rol | null>(null);
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // directivo: crea su institución · docente: se une con AMIE · estudiante: código de clase
  const [nombreInstitucion, setNombreInstitucion] = useState("");
  const [codigoAmie, setCodigoAmie] = useState("");
  const [codigoClase, setCodigoClase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function manejarRegistro(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const res = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rol,
          nombres,
          apellidos,
          email,
          password,
          nombreInstitucion: nombreInstitucion || undefined,
          codigoAmie: codigoAmie || undefined,
          codigoClase: codigoClase || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.mensaje ?? "No se pudo completar el registro.");
        setCargando(false);
        return;
      }

      // Auto-login tras registro exitoso.
      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        router.push("/auth/login");
        return;
      }
      router.push("/panel");
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setCargando(false);
    }
  }

  if (!rol) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <h1 className="text-center text-2xl font-bold">¿Cómo vas a usar la plataforma?</h1>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {ROLES.map((r) => (
              <button
                key={r.valor}
                onClick={() => setRol(r.valor)}
                className="rounded-2xl bg-white p-6 text-left transition hover:-translate-y-1"
                style={{ border: "1px solid var(--border-light)", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
              >
                <h2 className="font-semibold" style={{ color: "var(--accent-hover)" }}>
                  {r.titulo}
                </h2>
                <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                  {r.desc}
                </p>
              </button>
            ))}
          </div>
          <p className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            ¿Ya tienes cuenta?{" "}
            <Link href="/auth/login" className="font-semibold" style={{ color: "var(--accent-hover)" }}>
              Inicia sesión
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-8"
        style={{ border: "1px solid var(--border-light)", boxShadow: "var(--modal-shadow-light)" }}
      >
        <button
          onClick={() => setRol(null)}
          className="text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          ← Cambiar tipo de cuenta
        </button>
        <h1 className="mt-2 text-2xl font-bold">
          Registro de {ROLES.find((r) => r.valor === rol)?.titulo.toLowerCase()}
        </h1>

        <form onSubmit={manejarRegistro} className="mt-6 flex flex-col gap-4">
          {error && <div className="banner-error">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">
              Nombres
              <input
                required
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-[#F69E26]"
                style={{ borderColor: "var(--border-light-md)" }}
              />
            </label>
            <label className="text-sm font-medium">
              Apellidos
              <input
                required
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-[#F69E26]"
                style={{ borderColor: "var(--border-light-md)" }}
              />
            </label>
          </div>

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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-[#F69E26]"
              style={{ borderColor: "var(--border-light-md)" }}
            />
          </label>

          {rol === "directivo" && (
            <>
              <label className="text-sm font-medium">
                Nombre de la institución
                <input
                  required
                  value={nombreInstitucion}
                  onChange={(e) => setNombreInstitucion(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-[#F69E26]"
                  style={{ borderColor: "var(--border-light-md)" }}
                />
              </label>
              <label className="text-sm font-medium">
                Código AMIE
                <input
                  required
                  value={codigoAmie}
                  onChange={(e) => setCodigoAmie(e.target.value.toUpperCase())}
                  placeholder="17H00000"
                  className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-[#F69E26]"
                  style={{ borderColor: "var(--border-light-md)" }}
                />
              </label>
            </>
          )}

          {rol === "docente" && (
            <label className="text-sm font-medium">
              Código AMIE de tu institución
              <input
                required
                value={codigoAmie}
                onChange={(e) => setCodigoAmie(e.target.value.toUpperCase())}
                placeholder="17H00000"
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-[#F69E26]"
                style={{ borderColor: "var(--border-light-md)" }}
              />
              <span className="mt-1 block text-xs font-normal" style={{ color: "var(--text-subtle)" }}>
                Tu directivo debe haber registrado la institución primero.
              </span>
            </label>
          )}

          {rol === "estudiante" && (
            <label className="text-sm font-medium">
              Código de tu clase
              <input
                required
                value={codigoClase}
                onChange={(e) => setCodigoClase(e.target.value.toLowerCase().trim())}
                placeholder="ab12cd34"
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-[#F69E26]"
                style={{ borderColor: "var(--border-light-md)" }}
              />
              <span className="mt-1 block text-xs font-normal" style={{ color: "var(--text-subtle)" }}>
                Te lo entrega tu docente.
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="mt-2 rounded-full py-2.5 font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {cargando ? "Creando cuenta…" : "Crear cuenta"}
          </button>
        </form>
      </div>
    </main>
  );
}
