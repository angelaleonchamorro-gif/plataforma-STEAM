"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FASES_PROYECTO, type FaseProyecto } from "@/types/database";
import {
  actualizarActividad,
  eliminarActividad,
  alternarPublicacion,
  publicarTodas,
  eliminarPlanificacion,
} from "./actions";

interface Semana {
  id: string;
  numero_semana: number;
  fase: FaseProyecto;
  objetivo: string;
  descripcion: string | null;
}

interface Actividad {
  id: string;
  semana_id: string | null;
  fase: FaseProyecto;
  dcd_id: string | null;
  asignatura_id: string | null;
  titulo: string;
  instrucciones: string;
  criterio_evaluacion: string | null;
  recursos: string | null;
  evidencia: string | null;
  publicada: boolean;
  generada_por_ia: boolean;
}

interface Props {
  proyectoId: string;
  estado: string;
  temaDefinido: boolean;
  semanas: Semana[];
  actividades: Actividad[];
  codigosDcd: Record<string, string>; // dcd_id → código (ej. CN.4.1.1)
  asignaturas: { id: string; nombre: string }[];
}

const COLOR_FASE: Record<FaseProyecto, string> = {
  socializacion: "#8b5cf6",
  indagacion: "#3b82f6",
  diseno_plan_accion: "#f69e26",
  prototipado: "#f97316",
  pruebas_rediseno: "#ef4444",
  divulgacion: "#22c55e",
};

function nombreFase(fase: FaseProyecto) {
  return FASES_PROYECTO.find((f) => f.valor === fase)?.nombre ?? fase;
}

export default function PlanificacionProyecto({
  proyectoId,
  estado,
  temaDefinido,
  semanas,
  actividades,
  codigosDcd,
  asignaturas,
}: Props) {
  const router = useRouter();
  const [generando, setGenerando] = useState(false);
  const [banner, setBanner] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formulario, setFormulario] = useState({
    titulo: "",
    instrucciones: "",
    criterio: "",
    recursos: "",
    evidencia: "",
    asignaturaId: "" as string,
  });
  const [pendiente, iniciarTransicion] = useTransition();

  const nombreAsignatura = (id: string | null) =>
    asignaturas.find((a) => a.id === id)?.nombre ?? null;

  const hayPlan = semanas.length > 0;
  const publicadas = actividades.filter((a) => a.publicada).length;

  async function generarPlanificacion() {
    setBanner(null);
    setGenerando(true);
    try {
      const res = await fetch("/api/ia/planificacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proyectoId }),
      });
      // Si Vercel corta por tiempo, la respuesta no es JSON: no romper por eso.
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setBanner({
          tipo: "error",
          texto:
            data?.mensaje ??
            "La generación tardó más de lo esperado y se interrumpió. Vuelve a intentarlo: normalmente al segundo intento funciona.",
        });
      } else {
        setBanner({
          tipo: "exito",
          texto: "Planificación generada como borrador. Revisa, edita lo que necesites y publica las actividades.",
        });
        router.refresh();
      }
    } catch {
      setBanner({ tipo: "error", texto: "Error de conexión al generar la planificación." });
    } finally {
      setGenerando(false);
    }
  }

  async function regenerar() {
    setBanner(null);
    const resultado = await eliminarPlanificacion(proyectoId);
    if ("error" in resultado && resultado.error) {
      setBanner({ tipo: "error", texto: resultado.error });
      return;
    }
    await generarPlanificacion();
  }

  function abrirEdicion(actividad: Actividad) {
    setEditandoId(actividad.id);
    setFormulario({
      titulo: actividad.titulo,
      instrucciones: actividad.instrucciones,
      criterio: actividad.criterio_evaluacion ?? "",
      recursos: actividad.recursos ?? "",
      evidencia: actividad.evidencia ?? "",
      asignaturaId: actividad.asignatura_id ?? "",
    });
  }

  function guardarEdicion() {
    if (!editandoId) return;
    setBanner(null);
    iniciarTransicion(async () => {
      const resultado = await actualizarActividad({
        actividadId: editandoId,
        titulo: formulario.titulo,
        instrucciones: formulario.instrucciones,
        criterioEvaluacion: formulario.criterio || null,
        recursos: formulario.recursos || null,
        evidencia: formulario.evidencia || null,
        asignaturaId: formulario.asignaturaId || null,
      });
      if ("error" in resultado && resultado.error) {
        setBanner({ tipo: "error", texto: resultado.error });
      } else {
        setEditandoId(null);
        router.refresh();
      }
    });
  }

  function ejecutar(accion: () => Promise<{ error?: string } | { ok: true }>) {
    setBanner(null);
    iniciarTransicion(async () => {
      const resultado = await accion();
      if ("error" in resultado && resultado.error) {
        setBanner({ tipo: "error", texto: resultado.error });
      } else {
        router.refresh();
      }
    });
  }

  return (
    <section className="mt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">
          <span style={{ color: "var(--accent-hover)" }}>3.</span> Planificación semanal y actividades
        </h2>
        {hayPlan && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {publicadas}/{actividades.length} actividades publicadas
            </span>
            <Link
              href={`/panel/proyectos/${proyectoId}/imprimir`}
              className="rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-black/5"
              style={{ borderColor: "var(--border-light-strong)" }}
            >
              🖨 Imprimir
            </Link>
            {publicadas === 0 && (
              <button
                onClick={() => {
                  if (
                    confirm(
                      "¿Regenerar la planificación? Se borrará el borrador actual y la IA creará uno nuevo.",
                    )
                  ) {
                    regenerar();
                  }
                }}
                disabled={pendiente || generando}
                className="rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-black/5 disabled:opacity-50"
                style={{ borderColor: "var(--border-light-strong)" }}
              >
                {generando ? "Regenerando…" : "↻ Regenerar con IA"}
              </button>
            )}
            {publicadas < actividades.length && (
              <button
                onClick={() => ejecutar(() => publicarTodas(proyectoId))}
                disabled={pendiente}
                className="rounded-full px-5 py-2 text-sm font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
                style={{ background: "var(--accent)" }}
              >
                Publicar todas
              </button>
            )}
          </div>
        )}
      </div>

      {banner && (
        <div className={`mt-4 ${banner.tipo === "exito" ? "banner-exito" : "banner-error"}`}>
          {banner.texto}
        </div>
      )}

      {!hayPlan ? (
        <div
          className="mt-4 rounded-2xl bg-white p-8 text-center"
          style={{ border: "1px solid var(--border-light)" }}
        >
          {!temaDefinido ? (
            <p className="text-sm" style={{ color: "var(--text-subtle)" }}>
              Se habilita cuando el proyecto tenga tema y reto definidos (paso 2).
            </p>
          ) : (
            <>
              <p className="font-semibold">El proyecto ya tiene destrezas y tema</p>
              <p className="mx-auto mt-1 max-w-lg text-sm" style={{ color: "var(--text-muted)" }}>
                La IA generará el cronograma semanal completo con las actividades de las 6 fases:
                socialización, indagación, diseño, prototipado, pruebas y divulgación. Todo queda
                como borrador editable.
              </p>
              <button
                onClick={generarPlanificacion}
                disabled={generando}
                className="mt-5 rounded-full px-8 py-3 font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
                style={{ background: "var(--accent)", boxShadow: "0 8px 24px var(--accent-shadow)" }}
              >
                {generando ? "Generando planificación… (puede tardar hasta un minuto)" : "🗓 Generar planificación con IA"}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {semanas.map((semana) => {
            const actividadesSemana = actividades.filter((a) => a.semana_id === semana.id);
            const color = COLOR_FASE[semana.fase];
            return (
              <div
                key={semana.id}
                className="rounded-2xl bg-white p-5"
                style={{ border: "1px solid var(--border-light)", borderLeft: `4px solid ${color}` }}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-bold text-white"
                    style={{ background: "var(--primary-dark)" }}
                  >
                    SEMANA {semana.numero_semana}
                  </span>
                  <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: `${color}18`, color }}>
                    {nombreFase(semana.fase).toUpperCase()}
                  </span>
                </div>
                <p className="mt-3 font-semibold">{semana.objetivo}</p>
                {semana.descripcion && (
                  <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                    {semana.descripcion}
                  </p>
                )}

                {actividadesSemana.map((actividad) => (
                  <div
                    key={actividad.id}
                    className="mt-3 rounded-xl p-4"
                    style={{
                      background: "var(--surface-bg-light)",
                      border: `1px solid ${actividad.publicada ? "var(--color-success-border)" : "var(--border-light-md)"}`,
                    }}
                  >
                    {editandoId === actividad.id ? (
                      <div className="flex flex-col gap-3">
                        <input
                          value={formulario.titulo}
                          onChange={(e) => setFormulario((f) => ({ ...f, titulo: e.target.value }))}
                          className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#F69E26]"
                          style={{ borderColor: "var(--border-light-md)" }}
                        />
                        <textarea
                          value={formulario.instrucciones}
                          onChange={(e) => setFormulario((f) => ({ ...f, instrucciones: e.target.value }))}
                          rows={4}
                          className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[#F69E26]"
                          style={{ borderColor: "var(--border-light-md)" }}
                        />
                        <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                          Criterio de evaluación
                          <textarea
                            value={formulario.criterio}
                            onChange={(e) => setFormulario((f) => ({ ...f, criterio: e.target.value }))}
                            rows={2}
                            className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#F69E26]"
                            style={{ borderColor: "var(--border-light-md)" }}
                          />
                        </label>
                        <div className="grid gap-3 md:grid-cols-3">
                          <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                            Asignatura
                            <select
                              value={formulario.asignaturaId}
                              onChange={(e) => setFormulario((f) => ({ ...f, asignaturaId: e.target.value }))}
                              className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#F69E26]"
                              style={{ borderColor: "var(--border-light-md)" }}
                            >
                              <option value="">Transversal</option>
                              {asignaturas.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.nombre}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                            Recursos
                            <input
                              value={formulario.recursos}
                              onChange={(e) => setFormulario((f) => ({ ...f, recursos: e.target.value }))}
                              placeholder="Cartón, tijeras, video…"
                              className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#F69E26]"
                              style={{ borderColor: "var(--border-light-md)" }}
                            />
                          </label>
                          <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                            Evidencia
                            <input
                              value={formulario.evidencia}
                              onChange={(e) => setFormulario((f) => ({ ...f, evidencia: e.target.value }))}
                              placeholder="Bocetos, foro, encuesta…"
                              className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#F69E26]"
                              style={{ borderColor: "var(--border-light-md)" }}
                            />
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={guardarEdicion}
                            disabled={pendiente}
                            className="rounded-full px-4 py-1.5 text-sm font-semibold text-[#151E29] disabled:opacity-50"
                            style={{ background: "var(--accent)" }}
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditandoId(null)}
                            className="rounded-full border px-4 py-1.5 text-sm font-semibold"
                            style={{ borderColor: "var(--border-light-strong)" }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold">{actividad.titulo}</p>
                          <div className="flex items-center gap-2 text-xs font-semibold">
                            {nombreAsignatura(actividad.asignatura_id) && (
                              <span
                                className="rounded-full px-2 py-0.5"
                                style={{ background: "rgba(59,130,246,0.1)", color: "#2563eb" }}
                              >
                                {nombreAsignatura(actividad.asignatura_id)}
                              </span>
                            )}
                            {actividad.dcd_id && codigosDcd[actividad.dcd_id] && (
                              <span
                                className="rounded-full px-2 py-0.5 font-mono"
                                style={{ background: "var(--accent-bg)", color: "var(--accent-hover)" }}
                              >
                                {codigosDcd[actividad.dcd_id]}
                              </span>
                            )}
                            <span
                              className="rounded-full px-2 py-0.5"
                              style={
                                actividad.publicada
                                  ? { background: "var(--color-success-bg)", color: "var(--color-success-hover)" }
                                  : { background: "var(--color-warning-bg)", color: "#b45309" }
                              }
                            >
                              {actividad.publicada ? "PUBLICADA" : "BORRADOR"}
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                          {actividad.instrucciones}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs" style={{ color: "var(--text-subtle)" }}>
                          {actividad.recursos && (
                            <span>
                              <span className="font-semibold">Recursos:</span> {actividad.recursos}
                            </span>
                          )}
                          {actividad.evidencia && (
                            <span>
                              <span className="font-semibold">Evidencia:</span> {actividad.evidencia}
                            </span>
                          )}
                          {actividad.criterio_evaluacion && (
                            <span>
                              <span className="font-semibold">Evaluación:</span> {actividad.criterio_evaluacion}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex gap-4 text-sm font-semibold">
                          <button onClick={() => abrirEdicion(actividad)} style={{ color: "var(--accent-hover)" }}>
                            Editar
                          </button>
                          <button
                            onClick={() => ejecutar(() => alternarPublicacion(actividad.id, !actividad.publicada))}
                            disabled={pendiente}
                            style={{ color: actividad.publicada ? "var(--text-muted)" : "var(--color-success-hover)" }}
                          >
                            {actividad.publicada ? "Despublicar" : "Publicar"}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("¿Eliminar esta actividad? Esta acción no se puede deshacer.")) {
                                ejecutar(() => eliminarActividad(actividad.id));
                              }
                            }}
                            disabled={pendiente}
                            style={{ color: "var(--color-error)" }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          {estado === "en_ejecucion" && (
            <div className="banner-exito">
              El proyecto está en ejecución: los estudiantes ya ven las actividades publicadas en su portal.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
