import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ClaseEstudiantePage({
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

  // La RLS solo devuelve la clase si el estudiante está matriculado.
  const { data: clase } = await supabase
    .from("clases")
    .select("id, nombre, grado")
    .eq("id", claseId)
    .maybeSingle();
  if (!clase) redirect("/panel/estudiante");

  // Los estudiantes solo ven proyectos ya en marcha (o terminados).
  const { data: proyectos } = await supabase
    .from("proyectos")
    .select("id, titulo, estado, duracion_semanas")
    .eq("clase_id", clase.id)
    .in("estado", ["en_ejecucion", "finalizado"])
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/panel/estudiante" className="text-sm" style={{ color: "var(--text-muted)" }}>
        ← Mis clases
      </Link>
      <h1 className="mt-2 text-3xl font-bold">{clase.nombre}</h1>
      <p className="mt-1" style={{ color: "var(--text-muted)" }}>
        {clase.grado} · PROYECTOS STEAM
      </p>

      {!proyectos?.length ? (
        <div
          className="mt-10 rounded-2xl bg-white p-10 text-center"
          style={{ border: "1px solid var(--border-light)" }}
        >
          <p className="font-semibold">Aún no hay proyectos activos</p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Cuando tu docente publique las actividades, aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {proyectos.map((proyecto) => (
            <Link
              key={proyecto.id}
              href={`/panel/estudiante/proyectos/${proyecto.id}`}
              className="rounded-2xl p-6 text-white transition hover:-translate-y-1"
              style={{ background: "var(--primary-dark)", boxShadow: "0 6px 24px rgba(21,30,41,0.25)" }}
            >
              <span
                className="text-xs font-bold"
                style={{ color: proyecto.estado === "finalizado" ? "var(--text-dark-muted)" : "var(--accent)" }}
              >
                {proyecto.estado === "finalizado" ? "FINALIZADO" : "EN MARCHA"}
              </span>
              <h2 className="mt-1 text-lg font-bold">{proyecto.titulo}</h2>
              <p className="mt-2 text-sm" style={{ color: "var(--text-dark-muted)" }}>
                {proyecto.duracion_semanas} semanas
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
