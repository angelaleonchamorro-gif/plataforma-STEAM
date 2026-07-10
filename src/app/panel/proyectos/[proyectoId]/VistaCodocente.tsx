import Link from "next/link";
import { FASES_PROYECTO, type FaseProyecto } from "@/types/database";

// Vista de SOLO LECTURA del proyecto para co-docentes: toda la información
// (tema, reto, destrezas con indicadores, habilidades, cronograma con
// actividades) sin controles de edición — editar sigue siendo del líder.

interface Destreza {
  id: string;
  codigo: string;
  descripcion: string;
  indicador: string | null;
  asignatura: string;
  esConexion: boolean;
}

interface Habilidad {
  componente: string;
  descripcion: string;
  indicador: string | null;
}

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
  titulo: string;
  instrucciones: string;
  criterio_evaluacion: string | null;
  recursos: string | null;
  evidencia: string | null;
  publicada: boolean;
  asignaturaNombre: string | null;
  codigoDcd: string | null;
}

interface Props {
  proyecto: { id: string; titulo: string | null; reto: string | null };
  clase: { nombre: string; grado: string };
  destrezas: Destreza[];
  habilidades: Habilidad[];
  semanas: Semana[];
  actividades: Actividad[];
}

const COLOR_FASE: Record<FaseProyecto, string> = {
  socializacion: "#8b5cf6",
  indagacion: "#3b82f6",
  diseno_plan_accion: "#f69e26",
  prototipado: "#f97316",
  pruebas_rediseno: "#ef4444",
  divulgacion: "#22c55e",
};

export default function VistaCodocente({
  proyecto,
  clase,
  destrezas,
  habilidades,
  semanas,
  actividades,
}: Props) {
  const porAsignatura = new Map<string, Destreza[]>();
  for (const destreza of destrezas) {
    if (!porAsignatura.has(destreza.asignatura)) porAsignatura.set(destreza.asignatura, []);
    porAsignatura.get(destreza.asignatura)!.push(destreza);
  }

  const nombreFase = (fase: FaseProyecto) =>
    FASES_PROYECTO.find((f) => f.valor === fase)?.nombre ?? fase;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/panel/clases" className="text-sm" style={{ color: "var(--text-muted)" }}>
        ← Mis clases
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{proyecto.titulo ?? "Proyecto STEAM"}</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/panel/proyectos/${proyecto.id}/muro`}
            className="rounded-full border px-5 py-2 text-sm font-semibold transition hover:bg-black/5"
            style={{ borderColor: "var(--border-light-strong)" }}
          >
            🧱 Muro
          </Link>
          <Link
            href={`/panel/proyectos/${proyecto.id}/seguimiento`}
            className="rounded-full px-5 py-2 text-sm font-semibold text-[#151E29] transition hover:brightness-95"
            style={{ background: "var(--accent)" }}
          >
            📊 Ver seguimiento
          </Link>
        </div>
      </div>
      <p className="mt-1" style={{ color: "var(--text-muted)" }}>
        {clase.nombre} · {clase.grado} · participas como <span className="font-semibold">co-docente</span> (vista
        de lectura: la edición es del docente líder)
      </p>

      {proyecto.reto && (
        <div className="mt-6 rounded-2xl p-5 text-white" style={{ background: "var(--primary-dark)" }}>
          <p className="text-xs font-bold" style={{ color: "var(--accent)" }}>
            🎯 EL RETO
          </p>
          <p className="mt-1 text-sm">{proyecto.reto}</p>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-bold">Destrezas con criterios de desempeño</h2>
        {destrezas.length === 0 ? (
          <p className="mt-1 text-sm" style={{ color: "var(--text-subtle)" }}>
            El docente líder aún no selecciona destrezas.
          </p>
        ) : (
          [...porAsignatura.entries()].map(([asignatura, lista]) => (
            <div key={asignatura} className="mt-4 rounded-2xl bg-white p-5" style={{ border: "1px solid var(--border-light)" }}>
              <h3 className="font-semibold">{asignatura}</h3>
              {lista.map((destreza) => (
                <div key={destreza.id} className="mt-3 border-t pt-3 text-sm" style={{ borderColor: "var(--border-light)" }}>
                  <p>
                    <span className="font-mono text-xs font-semibold" style={{ color: "var(--accent-hover)" }}>
                      {destreza.codigo}
                    </span>
                    {destreza.esConexion && (
                      <span className="ml-2 text-xs italic" style={{ color: "var(--text-subtle)" }}>
                        conexión
                      </span>
                    )}{" "}
                    {destreza.descripcion}
                  </p>
                  {destreza.indicador && (
                    <p className="mt-1 text-xs" style={{ color: "var(--text-subtle)" }}>
                      <span className="font-semibold">Indicador:</span> {destreza.indicador}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </section>

      {habilidades.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold">Habilidades de Tecnología e Ingeniería</h2>
          <div className="mt-4 rounded-2xl bg-white p-5" style={{ border: "1px solid var(--border-light)" }}>
            {habilidades.map((habilidad, i) => (
              <div key={i} className={`text-sm ${i > 0 ? "mt-3 border-t pt-3" : ""}`} style={i > 0 ? { borderColor: "var(--border-light)" } : undefined}>
                <p>
                  <span
                    className="mr-2 rounded-full px-2 py-0.5 text-xs font-bold"
                    style={{ background: "var(--accent-bg)", color: "var(--accent-hover)" }}
                  >
                    {habilidad.componente === "tecnologia" ? "Tecnología" : "Ingeniería"}
                  </span>
                  {habilidad.descripcion}
                </p>
                {habilidad.indicador && (
                  <p className="mt-1 text-xs" style={{ color: "var(--text-subtle)" }}>
                    <span className="font-semibold">Indicador:</span> {habilidad.indicador}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-bold">Planificación semanal y actividades</h2>
        {semanas.length === 0 ? (
          <p className="mt-1 text-sm" style={{ color: "var(--text-subtle)" }}>
            El docente líder aún no genera la planificación.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
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
                    <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: "var(--primary-dark)" }}>
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
                      style={{ background: "var(--surface-bg-light)", border: "1px solid var(--border-light-md)" }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">{actividad.titulo}</p>
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          {actividad.asignaturaNombre && (
                            <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(59,130,246,0.1)", color: "#2563eb" }}>
                              {actividad.asignaturaNombre}
                            </span>
                          )}
                          {actividad.codigoDcd && (
                            <span className="rounded-full px-2 py-0.5 font-mono" style={{ background: "var(--accent-bg)", color: "var(--accent-hover)" }}>
                              {actividad.codigoDcd}
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
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
