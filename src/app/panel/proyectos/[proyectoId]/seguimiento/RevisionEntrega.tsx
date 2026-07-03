"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revisarEntrega } from "./actions";

interface Estudiante {
  id: string;
  nombres: string;
  apellidos: string;
}

interface Entrega {
  id: string;
  estudiante_id: string;
  estado: string;
  contenido: string | null;
  evidencia_url: string | null;
  entregada_at: string | null;
  retroalimentacion: string | null;
  calificacion: number | null;
}

interface Props {
  actividad: { id: string; titulo: string; fase: string };
  estudiantes: Estudiante[];
  entregas: Entrega[];
  urlsFirmadas: Record<string, string>; // entregaId → URL firmada de la evidencia
}

const ETIQUETA: Record<string, { texto: string; fondo: string; color: string }> = {
  pendiente: { texto: "Sin empezar", fondo: "var(--surface-bg-light)", color: "var(--text-muted)" },
  en_progreso: { texto: "En progreso", fondo: "var(--color-warning-bg)", color: "#b45309" },
  entregada: { texto: "Entregada", fondo: "rgba(59,130,246,0.08)", color: "#2563eb" },
  revisada: { texto: "Revisada", fondo: "var(--color-success-bg)", color: "var(--color-success-hover)" },
};

export default function RevisionEntrega({ actividad, estudiantes, entregas, urlsFirmadas }: Props) {
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const [revisandoId, setRevisandoId] = useState<string | null>(null);
  const [retro, setRetro] = useState("");
  const [nota, setNota] = useState<string>("");
  const [banner, setBanner] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [guardando, iniciarGuardado] = useTransition();

  const entregasPorEstudiante = new Map(entregas.map((e) => [e.estudiante_id, e]));
  const recibidas = entregas.filter((e) => e.estado === "entregada" || e.estado === "revisada").length;

  function abrirRevision(entrega: Entrega) {
    setRevisandoId(entrega.id);
    setRetro(entrega.retroalimentacion ?? "");
    setNota(entrega.calificacion != null ? String(entrega.calificacion) : "");
    setBanner(null);
  }

  function guardarRevision(entregaId: string) {
    setBanner(null);
    iniciarGuardado(async () => {
      const resultado = await revisarEntrega({
        entregaId,
        retroalimentacion: retro,
        calificacion: nota === "" ? null : Number(nota),
      });
      if ("error" in resultado && resultado.error) {
        setBanner({ tipo: "error", texto: resultado.error });
      } else {
        setBanner({ tipo: "exito", texto: "Revisión guardada: el estudiante ya puede verla." });
        setRevisandoId(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-2xl bg-white" style={{ border: "1px solid var(--border-light)" }}>
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span>
          <span className="text-xs font-bold" style={{ color: "var(--accent-hover)" }}>
            {actividad.fase.toUpperCase()}
          </span>
          <span className="block font-semibold">{actividad.titulo}</span>
        </span>
        <span className="flex items-center gap-3 text-sm">
          <span style={{ color: "var(--text-muted)" }}>
            {recibidas}/{estudiantes.length} entregas
          </span>
          <span style={{ color: "var(--text-subtle)" }}>{abierta ? "▾" : "▸"}</span>
        </span>
      </button>

      {abierta && (
        <div className="px-5 pb-5">
          {banner && (
            <div className={`mb-4 ${banner.tipo === "exito" ? "banner-exito" : "banner-error"}`}>
              {banner.texto}
            </div>
          )}

          <div className="flex flex-col">
            {estudiantes.map((estudiante, i) => {
              const entrega = entregasPorEstudiante.get(estudiante.id);
              const estado = entrega?.estado ?? "pendiente";
              const etiqueta = ETIQUETA[estado];
              const puedeRevisar = entrega && (estado === "entregada" || estado === "revisada");
              const enRevision = entrega && revisandoId === entrega.id;

              return (
                <div
                  key={estudiante.id}
                  className="py-3"
                  style={i > 0 ? { borderTop: "1px solid var(--border-light)" } : undefined}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {estudiante.apellidos} {estudiante.nombres}
                    </span>
                    <span className="flex items-center gap-2">
                      {entrega?.calificacion != null && (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                          style={{ background: "var(--accent-bg)", color: "var(--accent-hover)" }}
                        >
                          {Number(entrega.calificacion)}/10
                        </span>
                      )}
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                        style={{ background: etiqueta.fondo, color: etiqueta.color }}
                      >
                        {etiqueta.texto}
                      </span>
                      {puedeRevisar && !enRevision && (
                        <button
                          onClick={() => abrirRevision(entrega)}
                          className="text-xs font-bold"
                          style={{ color: "var(--accent-hover)" }}
                        >
                          {estado === "revisada" ? "Editar revisión" : "Revisar →"}
                        </button>
                      )}
                    </span>
                  </div>

                  {enRevision && entrega && (
                    <div
                      className="mt-3 rounded-xl p-4"
                      style={{ background: "var(--surface-bg-light)" }}
                    >
                      {entrega.entregada_at && (
                        <p className="text-xs" style={{ color: "var(--text-subtle)" }}>
                          Entregada el {new Date(entrega.entregada_at).toLocaleString("es-EC")}
                        </p>
                      )}
                      {entrega.contenido && (
                        <p className="mt-2 whitespace-pre-wrap text-sm">{entrega.contenido}</p>
                      )}
                      {urlsFirmadas[entrega.id] && (
                        <a
                          href={urlsFirmadas[entrega.id]}
                          target="_blank"
                          className="mt-2 inline-block text-sm font-semibold underline"
                          style={{ color: "var(--accent-hover)" }}
                        >
                          📎 Ver evidencia
                        </a>
                      )}

                      <label className="mt-4 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                        Retroalimentación para el estudiante
                        <textarea
                          value={retro}
                          onChange={(e) => setRetro(e.target.value)}
                          rows={2}
                          className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#F69E26]"
                          style={{ borderColor: "var(--border-light-md)" }}
                        />
                      </label>
                      <label className="mt-3 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                        Calificación (0 a 10, opcional)
                        <input
                          type="number"
                          min={0}
                          max={10}
                          step={0.5}
                          value={nota}
                          onChange={(e) => setNota(e.target.value)}
                          className="mt-1 w-28 rounded-lg border bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#F69E26]"
                          style={{ borderColor: "var(--border-light-md)" }}
                        />
                      </label>

                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => guardarRevision(entrega.id)}
                          disabled={guardando}
                          className="rounded-full px-5 py-1.5 text-sm font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
                          style={{ background: "var(--accent)" }}
                        >
                          {guardando ? "Guardando…" : "Guardar revisión"}
                        </button>
                        <button
                          onClick={() => setRevisandoId(null)}
                          disabled={guardando}
                          className="rounded-full border px-5 py-1.5 text-sm font-semibold transition hover:bg-black/5"
                          style={{ borderColor: "var(--border-light-strong)" }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
