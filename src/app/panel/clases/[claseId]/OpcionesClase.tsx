"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarClase, eliminarClase } from "../actions";
import { GRADOS } from "@/lib/curriculo";

interface Props {
  clase: { id: string; nombre: string; grado: string; edad_referencial: number };
  totalProyectos: number;
  totalEstudiantes: number;
}

export default function OpcionesClase({ clase, totalProyectos, totalEstudiantes }: Props) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(clase.nombre);
  const [grado, setGrado] = useState(clase.grado);
  const [edad, setEdad] = useState(clase.edad_referencial);
  const [banner, setBanner] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  const gradoBloqueado = totalProyectos > 0;

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    iniciarTransicion(async () => {
      const resultado = await actualizarClase({
        claseId: clase.id,
        nombre,
        grado,
        edadReferencial: edad,
      });
      if ("error" in resultado && resultado.error) {
        setBanner({ tipo: "error", texto: resultado.error });
      } else {
        setBanner({ tipo: "exito", texto: "Clase actualizada." });
        setEditando(false);
        router.refresh();
      }
    });
  }

  function eliminar() {
    const detalle =
      totalProyectos || totalEstudiantes
        ? `Se eliminarán también ${totalProyectos} proyecto${totalProyectos === 1 ? "" : "s"} con sus actividades y entregas, y ${totalEstudiantes} estudiante${totalEstudiantes === 1 ? "" : "s"} quedará${totalEstudiantes === 1 ? "" : "n"} sin esta clase (sus cuentas no se borran). `
        : "";
    const confirmacion = prompt(
      `⚠️ Esta acción NO se puede deshacer. ${detalle}\n\nPara confirmar, escribe: ELIMINAR`,
    );
    if (confirmacion?.trim().toUpperCase() !== "ELIMINAR") return;

    setBanner(null);
    iniciarTransicion(async () => {
      const resultado = await eliminarClase(clase.id);
      if ("error" in resultado && resultado.error) {
        setBanner({ tipo: "error", texto: resultado.error });
      } else {
        router.push("/panel/clases");
        router.refresh();
      }
    });
  }

  return (
    <section className="mt-10">
      {banner && (
        <div className={`mb-4 ${banner.tipo === "exito" ? "banner-exito" : "banner-error"}`}>
          {banner.texto}
        </div>
      )}

      {!editando ? (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setBanner(null);
              setEditando(true);
            }}
            className="rounded-full border px-5 py-2 text-sm font-semibold transition hover:bg-black/5"
            style={{ borderColor: "var(--border-light-strong)" }}
          >
            ✏️ Editar clase
          </button>
          <button
            onClick={eliminar}
            disabled={pendiente}
            className="rounded-full border px-5 py-2 text-sm font-semibold transition disabled:opacity-50"
            style={{
              borderColor: "var(--color-error-border)",
              color: "var(--color-error)",
              background: "var(--color-error-bg)",
            }}
          >
            🗑 Eliminar clase
          </button>
        </div>
      ) : (
        <form
          onSubmit={guardar}
          className="rounded-2xl bg-white p-6"
          style={{ border: "1px solid var(--border-light)" }}
        >
          <h2 className="font-semibold">Editar clase</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-sm font-medium">
              Nombre de la clase
              <input
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-[#F69E26]"
                style={{ borderColor: "var(--border-light-md)" }}
              />
            </label>
            <label className="text-sm font-medium">
              Grado
              <select
                value={grado}
                onChange={(e) => setGrado(e.target.value)}
                disabled={gradoBloqueado}
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 outline-none focus:border-[#F69E26] disabled:bg-gray-100"
                style={{ borderColor: "var(--border-light-md)" }}
              >
                {GRADOS.map((g) => (
                  <option key={g.grado} value={g.grado}>
                    {g.grado}
                  </option>
                ))}
              </select>
              {gradoBloqueado && (
                <span className="mt-1 block text-xs font-normal" style={{ color: "var(--text-subtle)" }}>
                  Bloqueado: la clase ya tiene proyectos con destrezas de este subnivel.
                </span>
              )}
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
              disabled={pendiente}
              className="rounded-full px-6 py-2 text-sm font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              {pendiente ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              disabled={pendiente}
              className="rounded-full border px-6 py-2 text-sm font-semibold transition hover:bg-black/5"
              style={{ borderColor: "var(--border-light-strong)" }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
