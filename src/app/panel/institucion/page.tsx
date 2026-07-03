import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfigInstitucional from "./ConfigInstitucional";

// Espacio de definición institucional (directivos): frecuencia y duración
// de proyectos POR SUBNIVEL, y asignaturas que intervienen.
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

  const [{ data: institucion }, { data: configuraciones }, { data: asignaturas }, { data: habilitadas }] =
    await Promise.all([
      supabase.from("instituciones").select("nombre").eq("id", perfil.institucion_id).maybeSingle(),
      supabase
        .from("configuracion_subniveles")
        .select("subnivel, frecuencia_proyectos, duracion_meses")
        .eq("institucion_id", perfil.institucion_id),
      supabase.from("asignaturas").select("id, codigo, nombre, es_principal").order("nombre"),
      supabase
        .from("institucion_asignaturas")
        .select("asignatura_id")
        .eq("institucion_id", perfil.institucion_id),
    ]);

  const configInicial: Record<string, { frecuencia: string; duracionMeses: number }> = {};
  for (const c of configuraciones ?? []) {
    configInicial[c.subnivel] = { frecuencia: c.frecuencia_proyectos, duracionMeses: c.duracion_meses };
  }

  const ordenadas = [...(asignaturas ?? [])].sort(
    (a, b) => Number(b.es_principal) - Number(a.es_principal) || a.nombre.localeCompare(b.nombre),
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Bienvenida, {perfil.nombres}</h1>
          <p className="mt-1" style={{ color: "var(--text-muted)" }}>
            {institucion?.nombre} · Define cómo trabajará tu institución los proyectos STEAM.
          </p>
        </div>
        <Link
          href="/panel/institucion/avances"
          className="rounded-full px-5 py-2 text-sm font-semibold text-[#151E29] transition hover:brightness-95"
          style={{ background: "var(--accent)" }}
        >
          📈 Ver avances
        </Link>
      </div>

      <ConfigInstitucional
        configInicial={configInicial}
        asignaturas={ordenadas}
        habilitadasIniciales={(habilitadas ?? []).map((h) => h.asignatura_id)}
      />
    </main>
  );
}
