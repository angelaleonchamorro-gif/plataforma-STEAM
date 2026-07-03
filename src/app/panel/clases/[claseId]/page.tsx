import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { crearProyecto } from "../actions";

const ETIQUETA_ESTADO: Record<string, { texto: string; color: string }> = {
  definicion: { texto: "En definición", color: "var(--color-warning-text)" },
  planificacion: { texto: "Planificación", color: "var(--accent-hover)" },
  en_ejecucion: { texto: "En ejecución", color: "var(--color-success-hover)" },
  finalizado: { texto: "Finalizado", color: "var(--text-muted)" },
};

export default async function ClaseDetallePage({
  params,
}: {
  params: Promise<{ claseId: string }>;
}) {
  const { claseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // La RLS solo devuelve la clase al docente dueño (o estudiante matriculado).
  const { data: clase } = await supabase
    .from("clases")
    .select("id, nombre, grado, edad_referencial, codigo_invitacion, docente_id")
    .eq("id", claseId)
    .maybeSingle();
  if (!clase || clase.docente_id !== user.id) redirect("/panel/clases");

  const [{ data: matriculas }, { data: proyectos }] = await Promise.all([
    supabase.from("clase_estudiantes").select("estudiante_id").eq("clase_id", clase.id),
    supabase
      .from("proyectos")
      .select("id, titulo, estado, duracion_semanas, created_at")
      .eq("clase_id", clase.id)
      .order("created_at", { ascending: false }),
  ]);

  const { data: estudiantes } = matriculas?.length
    ? await supabase
        .from("perfiles")
        .select("id, nombres, apellidos")
        .in("id", matriculas.map((m) => m.estudiante_id))
        .order("apellidos")
    : { data: [] };

  const crearProyectoDeClase = crearProyecto.bind(null, clase.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/panel/clases" className="text-sm" style={{ color: "var(--text-muted)" }}>
        ← Mis clases
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{clase.nombre}</h1>
          <p className="mt-1" style={{ color: "var(--text-muted)" }}>
            {clase.grado} · {clase.edad_referencial} años
          </p>
        </div>
        <div
          className="rounded-xl px-5 py-3 text-center"
          style={{ background: "var(--accent-bg)", border: "1px solid var(--accent-border)" }}
        >
          <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            CÓDIGO PARA ESTUDIANTES
          </p>
          <p className="font-mono text-xl font-bold" style={{ color: "var(--accent-hover)" }}>
            {clase.codigo_invitacion}
          </p>
        </div>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Proyectos STEAM</h2>
          <form action={crearProyectoDeClase}>
            <button
              type="submit"
              className="rounded-full px-5 py-2 text-sm font-semibold text-[#151E29] transition hover:brightness-95"
              style={{ background: "var(--accent)" }}
            >
              + Nuevo proyecto
            </button>
          </form>
        </div>

        {!proyectos?.length ? (
          <div
            className="mt-4 rounded-2xl bg-white p-8 text-center"
            style={{ border: "1px solid var(--border-light)" }}
          >
            <p className="font-semibold">Aún no hay proyectos en esta clase</p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Crea el primero: seleccionarás las destrezas del currículo y la IA te sugerirá 3 temas.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {proyectos.map((proyecto) => {
              const etiqueta = ETIQUETA_ESTADO[proyecto.estado];
              return (
                <Link
                  key={proyecto.id}
                  href={`/panel/proyectos/${proyecto.id}`}
                  className="rounded-2xl bg-white p-6 transition hover:-translate-y-1"
                  style={{ border: "1px solid var(--border-light)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: etiqueta.color }}>
                      {etiqueta.texto.toUpperCase()}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-subtle)" }}>
                      {proyecto.duracion_semanas} semanas
                    </span>
                  </div>
                  <h3 className="mt-2 font-semibold">
                    {proyecto.titulo ?? "Proyecto sin tema (en definición)"}
                  </h3>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Estudiantes ({estudiantes?.length ?? 0})</h2>
        {!estudiantes?.length ? (
          <div
            className="mt-4 rounded-2xl bg-white p-8 text-center"
            style={{ border: "1px solid var(--border-light)" }}
          >
            <p className="font-semibold">Todavía no hay estudiantes</p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Comparte el código <span className="font-mono font-semibold">{clase.codigo_invitacion}</span>:
              con él se registran en la plataforma y quedan matriculados aquí.
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-white" style={{ border: "1px solid var(--border-light)" }}>
            {estudiantes.map((estudiante, i) => (
              <div
                key={estudiante.id}
                className="flex items-center gap-3 px-6 py-3"
                style={i > 0 ? { borderTop: "1px solid var(--border-light)" } : undefined}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: "var(--accent-bg)", color: "var(--accent-hover)" }}
                >
                  {estudiante.nombres[0]}
                  {estudiante.apellidos[0]}
                </span>
                <span className="text-sm font-medium">
                  {estudiante.apellidos} {estudiante.nombres}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
