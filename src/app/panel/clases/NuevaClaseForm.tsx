"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearClase } from "./actions";
import { GRADOS } from "@/lib/curriculo";

export default function NuevaClaseForm() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [grado, setGrado] = useState(GRADOS[0].grado);
  const [edad, setEdad] = useState(GRADOS[0].edad);
  const [error, setError] = useState<string | null>(null);
  const [creando, iniciarCreacion] = useTransition();

  function cambiarGrado(nuevoGrado: string) {
    setGrado(nuevoGrado);
    const info = GRADOS.find((g) => g.grado === nuevoGrado);
    if (info) setEdad(info.edad);
  }

  function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    iniciarCreacion(async () => {
      const resultado = await crearClase({ nombre, grado, edadReferencial: edad });
      if ("error" in resultado && resultado.error) {
        setError(resultado.error);
      } else if ("claseId" in resultado) {
        router.push(`/panel/clases/${resultado.claseId}`);
      }
    });
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="mt-6 rounded-full px-6 py-2.5 font-semibold text-[#151E29] transition hover:brightness-95"
        style={{ background: "var(--accent)" }}
      >
        + Nueva clase
      </button>
    );
  }

  return (
    <form
      onSubmit={crear}
      className="mt-6 rounded-2xl bg-white p-6"
      style={{ border: "1px solid var(--border-light)" }}
    >
      <h2 className="font-semibold">Nueva clase</h2>
      {error && <div className="banner-error mt-3">{error}</div>}

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium">
          Nombre de la clase
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="8vo A - Proyectos STEAM"
            className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-[#F69E26]"
            style={{ borderColor: "var(--border-light-md)" }}
          />
        </label>

        <label className="text-sm font-medium">
          Grado
          <select
            value={grado}
            onChange={(e) => cambiarGrado(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-white px-3 py-2 outline-none focus:border-[#F69E26]"
            style={{ borderColor: "var(--border-light-md)" }}
          >
            {GRADOS.map((g) => (
              <option key={g.grado} value={g.grado}>
                {g.grado}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          Edad promedio de los estudiantes
          <input
            type="number"
            min={5}
            max={20}
            required
            value={edad}
            onChange={(e) => setEdad(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-[#F69E26]"
            style={{ borderColor: "var(--border-light-md)" }}
          />
        </label>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          disabled={creando}
          className="rounded-full px-6 py-2 font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {creando ? "Creando…" : "Crear clase"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          disabled={creando}
          className="rounded-full border px-6 py-2 font-semibold transition hover:bg-black/5"
          style={{ borderColor: "var(--border-light-strong)" }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
