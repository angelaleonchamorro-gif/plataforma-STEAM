"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SECCIONES_ARTICULO, type SeccionesArticulo } from "@/lib/articulo";
import { revisarArticulo } from "./actions";

interface Estudiante {
  id: string;
  nombres: string;
  apellidos: string;
}

interface Articulo {
  id: string;
  estudiante_id: string;
  secciones: SeccionesArticulo;
  estado: string;
  entregado_at: string | null;
  retroalimentacion: string | null;
  calificacion: number | null;
}

interface Props {
  estudiantes: Estudiante[];
  articulos: Articulo[];
}

const ETIQUETA: Record<string, { texto: string; fondo: string; color: string }> = {
  sin_articulo: { texto: "Sin empezar", fondo: "var(--surface-bg-light)", color: "var(--text-muted)" },
  en_progreso: { texto: "En redacción", fondo: "var(--color-warning-bg)", color: "#b45309" },
  entregada: { texto: "Entregado", fondo: "rgba(59,130,246,0.08)", color: "#2563eb" },
  revisada: { texto: "Revisado", fondo: "var(--color-success-bg)", color: "var(--color-success-hover)" },
};

export default function RevisionArticulo({ estudiantes, articulos }: Props) {
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const [viendoId, setViendoId] = useState<string | null>(null);
  const [retro, setRetro] = useState("");
  const [nota, setNota] = useState<string>("");
  const [banner, setBanner] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [guardando, iniciarGuardado] = useTransition();

  const articulosPorEstudiante = new Map(articulos.map((a) => [a.estudiante_id, a]));
  const entregados = articulos.filter((a) => a.estado === "entregada" || a.estado === "revisada").length;

  function abrirArticulo(articulo: Articulo) {
    setViendoId(articulo.id);
    setRetro(articulo.retroalimentacion ?? "");
    setNota(articulo.calificacion != null ? String(articulo.calificacion) : "");
    setBanner(null);
  }

  function guardarRevision(articuloId: string) {
    setBanner(null);
    iniciarGuardado(async () => {
      const resultado = await revisarArticulo({
        articuloId,
        retroalimentacion: retro,
        calificacion: nota === "" ? null : Number(nota),
      });
      if ("error" in resultado && resultado.error) {
        setBanner({ tipo: "error", texto: resultado.error });
      } else {
        setBanner({ tipo: "exito", texto: "Revisión guardada: el estudiante ya puede verla." });
        setViendoId(null);
        router.refresh();
      }
    });
  }

  return (
    <div
      className="rounded-2xl"
      style={{ background: "var(--accent-bg-subtle)", border: "1px solid var(--accent-border)" }}
    >
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span>
          <span className="text-xs font-bold" style={{ color: "var(--accent-hover)" }}>
            DIVULGACIÓN · BGU
          </span>
          <span className="block font-semibold">📄 Artículos científicos</span>
        </span>
        <span className="flex items-center gap-3 text-sm">
          <span style={{ color: "var(--text-muted)" }}>
            {entregados}/{estudiantes.length} entregados
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

          {estudiantes.map((estudiante, i) => {
            const articulo = articulosPorEstudiante.get(estudiante.id);
            const estado = articulo?.estado ?? "sin_articulo";
            const etiqueta = ETIQUETA[estado] ?? ETIQUETA.sin_articulo;
            const puedeVer = articulo && (estado === "entregada" || estado === "revisada");
            const enRevision = articulo && viendoId === articulo.id;

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
                    {articulo?.calificacion != null && (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                        style={{ background: "var(--accent-bg)", color: "var(--accent-hover)" }}
                      >
                        {Number(articulo.calificacion)}/10
                      </span>
                    )}
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                      style={{ background: etiqueta.fondo, color: etiqueta.color }}
                    >
                      {etiqueta.texto}
                    </span>
                    {puedeVer && !enRevision && (
                      <button
                        onClick={() => abrirArticulo(articulo)}
                        className="text-xs font-bold"
                        style={{ color: "var(--accent-hover)" }}
                      >
                        {estado === "revisada" ? "Ver / editar revisión" : "Leer y revisar →"}
                      </button>
                    )}
                  </span>
                </div>

                {enRevision && articulo && (
                  <div className="mt-3 rounded-xl bg-white p-5" style={{ border: "1px solid var(--border-light-md)" }}>
                    {articulo.entregado_at && (
                      <p className="text-xs" style={{ color: "var(--text-subtle)" }}>
                        Entregado el {new Date(articulo.entregado_at).toLocaleString("es-EC")}
                      </p>
                    )}
                    <div className="mt-3 flex flex-col gap-4">
                      {SECCIONES_ARTICULO.map((seccion) => {
                        const contenido = (articulo.secciones[seccion.clave] ?? "").trim();
                        if (!contenido) return null;
                        return (
                          <div key={seccion.clave}>
                            <h4 className="text-sm font-bold">{seccion.nombre}</h4>
                            <p className="mt-1 whitespace-pre-wrap text-sm" style={{ color: "var(--text-muted)" }}>
                              {contenido}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--border-light)" }}>
                      <label className="block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                        Retroalimentación para el estudiante
                        <textarea
                          value={retro}
                          onChange={(e) => setRetro(e.target.value)}
                          rows={3}
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal outline-none focus:border-[#F69E26]"
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
                          className="mt-1 w-28 rounded-lg border px-3 py-2 text-sm font-normal outline-none focus:border-[#F69E26]"
                          style={{ borderColor: "var(--border-light-md)" }}
                        />
                      </label>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => guardarRevision(articulo.id)}
                          disabled={guardando}
                          className="rounded-full px-5 py-1.5 text-sm font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
                          style={{ background: "var(--accent)" }}
                        >
                          {guardando ? "Guardando…" : "Guardar revisión"}
                        </button>
                        <button
                          onClick={() => setViendoId(null)}
                          disabled={guardando}
                          className="rounded-full border px-5 py-1.5 text-sm font-semibold transition hover:bg-black/5"
                          style={{ borderColor: "var(--border-light-strong)" }}
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
