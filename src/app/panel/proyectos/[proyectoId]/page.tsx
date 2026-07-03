import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { subnivelDeGrado } from "@/lib/curriculo";
import DefinicionProyecto from "./DefinicionProyecto";

export default async function ProyectoPage({
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
    .select("id, clase_id, estado, titulo, reto, duracion_semanas")
    .eq("id", proyectoId)
    .maybeSingle();
  if (!proyecto) redirect("/panel/clases");

  const { data: clase } = await supabase
    .from("clases")
    .select("id, nombre, grado, institucion_id, docente_id")
    .eq("id", proyecto.clase_id)
    .maybeSingle();
  if (!clase || clase.docente_id !== user.id) redirect("/panel/clases");

  const subnivel = subnivelDeGrado(clase.grado);
  if (!subnivel) redirect(`/panel/clases/${clase.id}`);

  // Asignaturas habilitadas por la institución + todas las DCD del subnivel.
  const [{ data: habilitadas }, { data: asignaturas }, { data: destrezas }, { data: seleccion }] =
    await Promise.all([
      supabase
        .from("institucion_asignaturas")
        .select("asignatura_id")
        .eq("institucion_id", clase.institucion_id),
      supabase.from("asignaturas").select("id, codigo, nombre, es_principal"),
      supabase
        .from("dcd")
        .select("id, asignatura_id, codigo, descripcion")
        .eq("subnivel", subnivel)
        .order("codigo"),
      supabase.from("proyecto_dcd").select("dcd_id, es_conexion").eq("proyecto_id", proyecto.id),
    ]);

  const idsHabilitadas = new Set((habilitadas ?? []).map((h) => h.asignatura_id));
  const idsConDestrezas = new Set((destrezas ?? []).map((d) => d.asignatura_id));

  // Solo asignaturas habilitadas por la institución Y con destrezas en este
  // subnivel (Tecnología/Ingeniería no tienen DCD propias en el currículo:
  // esos componentes STEAM los aporta el prototipo del proyecto).
  const asignaturasVisibles = (asignaturas ?? [])
    .filter((a) => idsHabilitadas.has(a.id) && idsConDestrezas.has(a.id))
    .sort(
      (a, b) =>
        Number(b.es_principal) - Number(a.es_principal) || a.nombre.localeCompare(b.nombre),
    );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href={`/panel/clases/${clase.id}`}
        className="text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        ← {clase.nombre}
      </Link>
      <h1 className="mt-2 text-3xl font-bold">
        {proyecto.titulo ?? "Nuevo proyecto STEAM"}
      </h1>
      <p className="mt-1" style={{ color: "var(--text-muted)" }}>
        {clase.grado} · {proyecto.duracion_semanas} semanas
      </p>

      <DefinicionProyecto
        proyecto={{
          id: proyecto.id,
          titulo: proyecto.titulo,
          reto: proyecto.reto,
          estado: proyecto.estado,
        }}
        asignaturas={asignaturasVisibles}
        destrezas={destrezas ?? []}
        seleccionInicial={(seleccion ?? []).map((s) => ({
          dcdId: s.dcd_id,
          esConexion: s.es_conexion,
        }))}
      />
    </main>
  );
}
