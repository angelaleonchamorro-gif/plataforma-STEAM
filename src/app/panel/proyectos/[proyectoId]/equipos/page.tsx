import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GestionEquipos from "./GestionEquipos";

export default async function EquiposPage({
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
    .select("id, nombre, docente_id")
    .eq("id", proyecto.clase_id)
    .maybeSingle();
  if (!clase || clase.docente_id !== user.id) redirect("/panel/clases");

  const [{ data: matriculas }, { data: equipos }, { data: miembros }] = await Promise.all([
    supabase.from("clase_estudiantes").select("estudiante_id").eq("clase_id", clase.id),
    supabase.from("equipos").select("id, nombre").eq("proyecto_id", proyecto.id).order("created_at"),
    supabase
      .from("equipo_miembros")
      .select("equipo_id, estudiante_id, rol")
      .eq("proyecto_id", proyecto.id),
  ]);

  const { data: estudiantes } = matriculas?.length
    ? await supabase
        .from("perfiles")
        .select("id, nombres, apellidos")
        .in("id", matriculas.map((m) => m.estudiante_id))
        .order("apellidos")
    : { data: [] };

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href={`/panel/proyectos/${proyecto.id}`}
        className="text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        ← {proyecto.titulo ?? "Proyecto"}
      </Link>
      <h1 className="mt-2 text-3xl font-bold">👥 Equipos de trabajo</h1>
      <p className="mt-1" style={{ color: "var(--text-muted)" }}>
        {clase.nombre} · arma los equipos y asigna un rol a cada integrante para el trabajo
        colaborativo.
      </p>

      <GestionEquipos
        proyectoId={proyecto.id}
        estudiantes={estudiantes ?? []}
        equipos={equipos ?? []}
        miembros={miembros ?? []}
      />
    </main>
  );
}
