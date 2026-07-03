import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ETIQUETA_ESTADO: Record<string, { texto: string; color: string }> = {
  definicion: { texto: "En definición", color: "#b45309" },
  planificacion: { texto: "Planificación", color: "var(--accent-hover)" },
  en_ejecucion: { texto: "En ejecución", color: "var(--color-success-hover)" },
  finalizado: { texto: "Finalizado", color: "var(--text-muted)" },
};

// Avances de la institución (directivo, solo lectura): qué proyectos tiene
// cada docente y cómo van las entregas de los estudiantes.
export default async function AvancesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, institucion_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil || perfil.rol !== "directivo" || !perfil.institucion_id) redirect("/panel");

  const [{ data: docentes }, { data: clases }] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombres, apellidos")
      .eq("institucion_id", perfil.institucion_id)
      .eq("rol", "docente")
      .order("apellidos"),
    supabase
      .from("clases")
      .select("id, nombre, grado, docente_id")
      .eq("institucion_id", perfil.institucion_id),
  ]);

  const idsClases = (clases ?? []).map((c) => c.id);
  const [{ data: proyectos }, { data: matriculas }] = idsClases.length
    ? await Promise.all([
        supabase
          .from("proyectos")
          .select("id, clase_id, titulo, estado, duracion_semanas, fecha_inicio")
          .in("clase_id", idsClases),
        supabase.from("clase_estudiantes").select("clase_id, estudiante_id").in("clase_id", idsClases),
      ])
    : [{ data: [] }, { data: [] }];

  const idsProyectos = (proyectos ?? []).map((p) => p.id);
  const { data: actividades } = idsProyectos.length
    ? await supabase
        .from("actividades")
        .select("id, proyecto_id, publicada")
        .in("proyecto_id", idsProyectos)
    : { data: [] };

  const idsActividades = (actividades ?? []).filter((a) => a.publicada).map((a) => a.id);
  const { data: entregas } = idsActividades.length
    ? await supabase
        .from("entregas")
        .select("actividad_id, estado")
        .in("actividad_id", idsActividades)
    : { data: [] };

  // Agregación por proyecto.
  function estadisticas(proyectoId: string, claseId: string) {
    const publicadas = (actividades ?? []).filter((a) => a.proyecto_id === proyectoId && a.publicada);
    const estudiantes = (matriculas ?? []).filter((m) => m.clase_id === claseId).length;
    const idsPublicadas = new Set(publicadas.map((a) => a.id));
    const delProyecto = (entregas ?? []).filter((e) => idsPublicadas.has(e.actividad_id));
    const recibidas = delProyecto.filter((e) => e.estado === "entregada" || e.estado === "revisada").length;
    const revisadas = delProyecto.filter((e) => e.estado === "revisada").length;
    const esperadas = publicadas.length * estudiantes;
    const progreso = esperadas > 0 ? Math.round((recibidas / esperadas) * 100) : 0;
    return { publicadas: publicadas.length, estudiantes, recibidas, revisadas, esperadas, progreso };
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/panel/institucion" className="text-sm" style={{ color: "var(--text-muted)" }}>
        ← Configuración institucional
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Avances de los proyectos</h1>
      <p className="mt-1" style={{ color: "var(--text-muted)" }}>
        Seguimiento de lo que cada docente está trabajando con sus estudiantes.
      </p>

      {!docentes?.length ? (
        <div className="mt-10 rounded-2xl bg-white p-10 text-center" style={{ border: "1px solid var(--border-light)" }}>
          <p className="font-semibold">Aún no hay docentes registrados</p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Comparte el código AMIE de la institución para que se registren.
          </p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-6">
          {docentes.map((docente) => {
            const clasesDocente = (clases ?? []).filter((c) => c.docente_id === docente.id);
            return (
              <section
                key={docente.id}
                className="rounded-2xl bg-white p-6"
                style={{ border: "1px solid var(--border-light)" }}
              >
                <h2 className="font-bold">
                  {docente.apellidos} {docente.nombres}
                  <span className="ml-2 text-sm font-normal" style={{ color: "var(--text-muted)" }}>
                    {clasesDocente.length} clase{clasesDocente.length === 1 ? "" : "s"}
                  </span>
                </h2>

                {!clasesDocente.length ? (
                  <p className="mt-2 text-sm" style={{ color: "var(--text-subtle)" }}>
                    Todavía no crea clases.
                  </p>
                ) : (
                  clasesDocente.map((clase) => {
                    const proyectosClase = (proyectos ?? []).filter((p) => p.clase_id === clase.id);
                    return (
                      <div key={clase.id} className="mt-4">
                        <h3 className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
                          {clase.nombre} · {clase.grado}
                        </h3>
                        {!proyectosClase.length ? (
                          <p className="mt-1 text-sm" style={{ color: "var(--text-subtle)" }}>
                            Sin proyectos aún.
                          </p>
                        ) : (
                          proyectosClase.map((proyecto) => {
                            const stats = estadisticas(proyecto.id, clase.id);
                            const etiqueta = ETIQUETA_ESTADO[proyecto.estado];
                            return (
                              <div
                                key={proyecto.id}
                                className="mt-2 rounded-xl p-4"
                                style={{ background: "var(--surface-bg-light)", border: "1px solid var(--border-light)" }}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-semibold">
                                    {proyecto.titulo ?? "Proyecto sin tema"}
                                  </span>
                                  <span className="text-xs font-bold" style={{ color: etiqueta.color }}>
                                    {etiqueta.texto.toUpperCase()}
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-5 text-sm" style={{ color: "var(--text-muted)" }}>
                                  <span>👥 {stats.estudiantes} estudiantes</span>
                                  <span>📋 {stats.publicadas} actividades publicadas</span>
                                  <span>📬 {stats.recibidas}{stats.esperadas ? `/${stats.esperadas}` : ""} entregas</span>
                                  <span>✅ {stats.revisadas} revisadas</span>
                                </div>
                                {stats.esperadas > 0 && (
                                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--border-light-md)" }}>
                                    <div
                                      className="h-full rounded-full"
                                      style={{ width: `${stats.progreso}%`, background: "var(--accent)" }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  })
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
