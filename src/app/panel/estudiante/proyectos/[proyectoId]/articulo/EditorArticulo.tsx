"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TextareaSinPegar from "@/components/TextareaSinPegar";
import { SECCIONES_ARTICULO, type SeccionesArticulo } from "@/lib/articulo";
import { guardarArticulo } from "./actions";

interface Props {
  proyectoId: string;
  seccionesIniciales: SeccionesArticulo;
  estado: string;
  retroalimentacion: string | null;
  calificacion: number | null;
}

export default function EditorArticulo({
  proyectoId,
  seccionesIniciales,
  estado,
  retroalimentacion,
  calificacion,
}: Props) {
  const router = useRouter();
  const [secciones, setSecciones] = useState<SeccionesArticulo>(seccionesIniciales);
  const [banner, setBanner] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [guardando, iniciarGuardado] = useTransition();

  const editable = estado === "pendiente" || estado === "en_progreso";
  const completadas = SECCIONES_ARTICULO.filter((s) => (secciones[s.clave] ?? "").trim()).length;

  function actualizar(clave: string, valor: string) {
    setSecciones((previas) => ({ ...previas, [clave]: valor }));
  }

  function guardar(entregar: boolean) {
    setBanner(null);
    iniciarGuardado(async () => {
      const resultado = await guardarArticulo({ proyectoId, secciones, entregar });
      if ("error" in resultado && resultado.error) {
        setBanner({ tipo: "error", texto: resultado.error });
      } else {
        setBanner({
          tipo: "exito",
          texto: entregar
            ? "¡Artículo entregado! Tu docente lo revisará."
            : "Borrador guardado. Puedes seguir escribiendo cuando quieras.",
        });
        if (entregar) router.refresh();
      }
    });
  }

  return (
    <div className="mt-6">
      {retroalimentacion && (
        <div className="banner-exito mb-4">
          <span className="font-bold">Retroalimentación de tu docente:</span> {retroalimentacion}
          {calificacion != null && (
            <span className="font-bold"> · Calificación: {Number(calificacion)}/10</span>
          )}
        </div>
      )}

      {!editable && (
        <div
          className="mb-4 rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: "rgba(59,130,246,0.08)", color: "#2563eb" }}
        >
          {estado === "revisada"
            ? "Tu artículo fue revisado por tu docente."
            : "Tu artículo fue entregado y está esperando revisión."}
        </div>
      )}

      {banner && (
        <div className={`mb-4 ${banner.tipo === "exito" ? "banner-exito" : "banner-error"}`}>
          {banner.texto}
        </div>
      )}

      <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
        {completadas} de {SECCIONES_ARTICULO.length} secciones con contenido
      </p>

      <div className="mt-4 flex flex-col gap-5">
        {SECCIONES_ARTICULO.map((seccion, indice) => (
          <div
            key={seccion.clave}
            className="rounded-2xl bg-white p-5"
            style={{ border: "1px solid var(--border-light-md)" }}
          >
            <label className="block">
              <span className="font-semibold">
                <span style={{ color: "var(--accent-hover)" }}>{indice + 1}.</span> {seccion.nombre}
              </span>
              <p className="mt-0.5 text-xs" style={{ color: "var(--text-subtle)" }}>
                {seccion.guia}
              </p>
              <TextareaSinPegar
                value={secciones[seccion.clave] ?? ""}
                onChange={(e) => actualizar(seccion.clave, e.target.value)}
                rows={seccion.filas}
                disabled={!editable}
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#F69E26] disabled:bg-gray-50"
                style={{ borderColor: "var(--border-light-md)" }}
              />
            </label>
          </div>
        ))}
      </div>

      {editable && (
        <div className="sticky bottom-4 mt-6 flex flex-wrap gap-3 rounded-2xl bg-white p-4"
          style={{ border: "1px solid var(--border-light-md)", boxShadow: "var(--modal-shadow-light)" }}
        >
          <button
            onClick={() => guardar(false)}
            disabled={guardando}
            className="rounded-full border px-6 py-2.5 font-semibold transition hover:bg-black/5 disabled:opacity-50"
            style={{ borderColor: "var(--border-light-strong)" }}
          >
            {guardando ? "Guardando…" : "Guardar borrador"}
          </button>
          <button
            onClick={() => guardar(true)}
            disabled={guardando}
            className="rounded-full px-6 py-2.5 font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {guardando ? "Enviando…" : "Entregar artículo"}
          </button>
        </div>
      )}
    </div>
  );
}
