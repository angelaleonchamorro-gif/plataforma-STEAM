import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GestionCodocentes from "./GestionCodocentes";

export default async function CodocentesPage({
  params,
}: {
  params: Promise<{ proyectoId: string }>;
}) {
  const { proyectoId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("id, clase_id, titulo")
    .eq("id", proyectoId)
    .maybeSingle();
  if (!proyecto) redirect("/panel/clases");

  const { data: clase } = await supabase
    .from("clases")
    .select("id, nombre, docente_id, institucion_id")
    .eq("id", proyecto.clase_id)
    .maybeSingle();
  if (!clase || clase.docente_id !== user.id) redirect("/panel/clases");

  const [{ data: docentes }, { data: codocentes }, { data: asignaturas }] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombres, apellidos, email")
      .eq("institucion_id", clase.institucion_id)
      .eq("rol", "docente")
      .neq("id", user.id)
      .order("apellidos"),
    supabase
      .from("proyecto_docentes")
      .select("docente_id, asignatura_id")
      .eq("proyecto_id", proyecto.id),
    supabase.from("asignaturas").select("id, nombre").order("nombre"),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href={`/panel/proyectos/${proyecto.id}`}
        className="text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        ← {proyecto.titulo ?? "Proyecto"}
      </Link>
      <h1 className="mt-2 text-3xl font-bold">🤝 Co-docentes</h1>
      <p className="mt-1" style={{ color: "var(--text-muted)" }}>
        {clase.nombre} · invita a colegas de tu institución para que den seguimiento y califiquen
        en este proyecto interdisciplinario. Cada uno trabaja con su propia cuenta.
      </p>

      <GestionCodocentes
        proyectoId={proyecto.id}
        docentes={docentes ?? []}
        codocentes={codocentes ?? []}
        asignaturas={asignaturas ?? []}
      />
    </main>
  );
}
