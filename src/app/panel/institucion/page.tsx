import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfigInstitucional from "./ConfigInstitucional";

// Espacio de definición institucional (directivos): frecuencia de proyectos,
// duración disponible (1–9 meses) y asignaturas que intervienen.
export default async function InstitucionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, nombres, institucion_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil || perfil.rol !== "directivo" || !perfil.institucion_id) redirect("/panel");

  const [{ data: institucion }, { data: config }, { data: asignaturas }, { data: habilitadas }] =
    await Promise.all([
      supabase.from("instituciones").select("nombre").eq("id", perfil.institucion_id).maybeSingle(),
      supabase
        .from("configuracion_institucional")
        .select("frecuencia_proyectos, duracion_meses")
        .eq("institucion_id", perfil.institucion_id)
        .maybeSingle(),
      supabase.from("asignaturas").select("id, codigo, nombre, es_principal").order("nombre"),
      supabase
        .from("institucion_asignaturas")
        .select("asignatura_id")
        .eq("institucion_id", perfil.institucion_id),
    ]);

  // Principales STEAM primero, luego conexiones, ambas alfabéticas.
  const ordenadas = [...(asignaturas ?? [])].sort(
    (a, b) => Number(b.es_principal) - Number(a.es_principal) || a.nombre.localeCompare(b.nombre),
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-bold">Bienvenido, {perfil.nombres}</h1>
      <p className="mt-1" style={{ color: "var(--text-muted)" }}>
        {institucion?.nombre} · Define cómo trabajará tu institución los proyectos STEAM.
      </p>

      <ConfigInstitucional
        frecuenciaInicial={config?.frecuencia_proyectos ?? "trimestral"}
        duracionInicial={config?.duracion_meses ?? 3}
        asignaturas={ordenadas}
        habilitadasIniciales={(habilitadas ?? []).map((h) => h.asignatura_id)}
      />
    </main>
  );
}
