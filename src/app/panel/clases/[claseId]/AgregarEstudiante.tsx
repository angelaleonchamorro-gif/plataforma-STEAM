"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Credenciales {
  correo: string;
  contrasena: string;
}

// Carga individual: para el estudiante que se inscribe a mitad de año.
// Reusa el mismo endpoint de la carga masiva con una sola fila.
export default function AgregarEstudiante({ claseId }: { claseId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [credenciales, setCredenciales] = useState<Credenciales | null>(null);
  const [creando, setCreando] = useState(false);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreando(true);
    try {
      const res = await fetch("/api/clases/carga-masiva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claseId,
          estudiantes: [{ nombres, apellidos, correo: correo || undefined }],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.mensaje ?? "No se pudo crear la cuenta.");
        return;
      }
      const resultado = data.resultados[0];
      if (resultado.error) {
        setError(`${resultado.error}.`);
        return;
      }
      setCredenciales({ correo: resultado.correo, contrasena: resultado.contrasena });
      setNombres("");
      setApellidos("");
      setCorreo("");
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl bg-white p-6" style={{ border: "1px solid var(--border-light)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Agregar un estudiante</h3>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Para inscripciones individuales durante el año. El sistema crea la cuenta y te
            entrega las credenciales.
          </p>
        </div>
        {!abierto && (
          <button
            onClick={() => {
              setAbierto(true);
              setCredenciales(null);
            }}
            className="rounded-full px-5 py-2 text-sm font-semibold text-[#151E29] transition hover:brightness-95"
            style={{ background: "var(--accent)" }}
          >
            + Agregar
          </button>
        )}
      </div>

      {credenciales && (
        <div className="banner-exito mt-4">
          Cuenta creada. <span className="font-bold">Anota estas credenciales ahora — la contraseña no se vuelve a mostrar:</span>
          <div className="mt-2 rounded-lg bg-white px-4 py-3 font-mono text-sm" style={{ border: "1px solid var(--color-success-border)" }}>
            Correo: <span className="font-bold">{credenciales.correo}</span>
            <br />
            Contraseña: <span className="font-bold">{credenciales.contrasena}</span>
          </div>
        </div>
      )}

      {abierto && (
        <form onSubmit={crear} className="mt-4">
          {error && <div className="banner-error mb-3">{error}</div>}
          <div className="grid gap-3 md:grid-cols-3">
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
            <label className="text-sm font-medium">
              Correo (opcional)
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="Se genera si lo dejas vacío"
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-[#F69E26]"
                style={{ borderColor: "var(--border-light-md)" }}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={creando}
              className="rounded-full px-6 py-2 text-sm font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              {creando ? "Creando cuenta…" : "Crear cuenta"}
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              disabled={creando}
              className="rounded-full border px-6 py-2 text-sm font-semibold transition hover:bg-black/5"
              style={{ borderColor: "var(--border-light-strong)" }}
            >
              Cerrar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
