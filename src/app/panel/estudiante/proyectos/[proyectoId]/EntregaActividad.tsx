"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { guardarAvance, entregarActividad } from "./actions";

interface Actividad {
  id: string;
  titulo: string;
  instrucciones: string;
  criterio_evaluacion: string | null;
}

interface Entrega {
  estado: string;
  contenido: string | null;
  evidencia_url: string | null;
  retroalimentacion: string | null;
  calificacion: number | null;
}

interface Props {
  actividad: Actividad;
  entrega: Entrega | null;
  evidenciaUrl: string | null; // URL firmada para ver la evidencia ya subida
  estudianteId: string;
}

const ETIQUETA: Record<string, { texto: string; fondo: string; color: string }> = {
  pendiente: { texto: "PENDIENTE", fondo: "var(--surface-bg-light)", color: "var(--text-muted)" },
  en_progreso: { texto: "EN PROGRESO", fondo: "var(--color-warning-bg)", color: "#b45309" },
  entregada: { texto: "ENTREGADA ✓", fondo: "rgba(59,130,246,0.08)", color: "#2563eb" },
  revisada: { texto: "REVISADA ✓", fondo: "var(--color-success-bg)", color: "var(--color-success-hover)" },
};

export default function EntregaActividad({ actividad, entrega, evidenciaUrl, estudianteId }: Props) {
  const router = useRouter();
  const estado = entrega?.estado ?? "pendiente";
  const editable = estado === "pendiente" || estado === "en_progreso";

  const [abierta, setAbierta] = useState(false);
  const [contenido, setContenido] = useState(entrega?.contenido ?? "");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [banner, setBanner] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [pendienteAccion, iniciarAccion] = useTransition();

  const etiqueta = ETIQUETA[estado];
  const ocupado = subiendo || pendienteAccion;

  // Sube la evidencia a la carpeta del estudiante y devuelve el path guardable.
  async function subirEvidencia(): Promise<string | null | "error"> {
    if (!archivo) return entrega?.evidencia_url ?? null;
    setSubiendo(true);
    try {
      const supabase = createClient();
      const nombreLimpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${estudianteId}/${actividad.id}/${Date.now()}-${nombreLimpio}`;
      const { error } = await supabase.storage.from("evidencias").upload(path, archivo);
      if (error) return "error";
      return path;
    } finally {
      setSubiendo(false);
    }
  }

  async function accion(tipo: "avance" | "entrega") {
    setBanner(null);
    const evidenciaPath = await subirEvidencia();
    if (evidenciaPath === "error") {
      setBanner({ tipo: "error", texto: "No se pudo subir el archivo. Verifica que pese menos de 10 MB." });
      return;
    }
    iniciarAccion(async () => {
      const fn = tipo === "avance" ? guardarAvance : entregarActividad;
      const resultado = await fn({ actividadId: actividad.id, contenido, evidenciaPath });
      if ("error" in resultado && resultado.error) {
        setBanner({ tipo: "error", texto: resultado.error });
      } else {
        setBanner({
          tipo: "exito",
          texto: tipo === "avance" ? "Avance guardado." : "¡Actividad entregada! Tu docente la revisará.",
        });
        setArchivo(null);
        router.refresh();
      }
    });
  }

  return (
    <div
      className="rounded-2xl bg-white"
      style={{ border: "1px solid var(--border-light-md)" }}
    >
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="font-semibold">{actividad.titulo}</span>
        <span className="flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-bold"
            style={{ background: etiqueta.fondo, color: etiqueta.color }}
          >
            {etiqueta.texto}
          </span>
          {entrega?.calificacion != null && (
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={{ background: "var(--accent-bg)", color: "var(--accent-hover)" }}
            >
              {Number(entrega.calificacion)}/10
            </span>
          )}
          <span style={{ color: "var(--text-subtle)" }}>{abierta ? "▾" : "▸"}</span>
        </span>
      </button>

      {abierta && (
        <div className="px-5 pb-5">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {actividad.instrucciones}
          </p>

          {entrega?.retroalimentacion && (
            <div className="banner-exito mt-4">
              <span className="font-bold">Retroalimentación de tu docente:</span>{" "}
              {entrega.retroalimentacion}
            </div>
          )}

          {banner && (
            <div className={`mt-4 ${banner.tipo === "exito" ? "banner-exito" : "banner-error"}`}>
              {banner.texto}
            </div>
          )}

          {editable ? (
            <>
              <textarea
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                rows={4}
                placeholder="Escribe aquí tu trabajo, tus respuestas o lo que descubriste…"
                className="mt-4 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#F69E26]"
                style={{ borderColor: "var(--border-light-md)" }}
              />

              <label className="mt-3 block text-sm font-medium">
                Evidencia (foto, PDF o video · máx. 10 MB)
                <input
                  type="file"
                  accept="image/*,application/pdf,video/mp4"
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:px-4 file:py-1.5 file:text-sm file:font-semibold"
                  style={{ color: "var(--text-muted)" }}
                />
              </label>
              {evidenciaUrl && !archivo && (
                <p className="mt-2 text-xs" style={{ color: "var(--text-subtle)" }}>
                  Ya subiste una evidencia:{" "}
                  <a href={evidenciaUrl} target="_blank" className="font-semibold underline">
                    verla
                  </a>{" "}
                  (si subes otra, la reemplaza)
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => accion("avance")}
                  disabled={ocupado}
                  className="rounded-full border px-5 py-2 text-sm font-semibold transition hover:bg-black/5 disabled:opacity-50"
                  style={{ borderColor: "var(--border-light-strong)" }}
                >
                  {ocupado ? "Guardando…" : "Guardar avance"}
                </button>
                <button
                  onClick={() => accion("entrega")}
                  disabled={ocupado}
                  className="rounded-full px-5 py-2 text-sm font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
                  style={{ background: "var(--accent)" }}
                >
                  {ocupado ? "Enviando…" : "Entregar actividad"}
                </button>
              </div>
            </>
          ) : (
            <div className="mt-4">
              {entrega?.contenido && (
                <div
                  className="rounded-lg p-4 text-sm"
                  style={{ background: "var(--surface-bg-light)" }}
                >
                  {entrega.contenido}
                </div>
              )}
              {evidenciaUrl && (
                <a
                  href={evidenciaUrl}
                  target="_blank"
                  className="mt-2 inline-block text-sm font-semibold underline"
                  style={{ color: "var(--accent-hover)" }}
                >
                  📎 Ver mi evidencia
                </a>
              )}
              {estado === "entregada" && (
                <p className="mt-3 text-xs" style={{ color: "var(--text-subtle)" }}>
                  Tu entrega está esperando la revisión de tu docente.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
