import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  if (!perfil || perfil.rol !== "directivo") redirect("/panel");

  const { data: config } = await supabase
    .from("configuracion_institucional")
    .select("frecuencia_proyectos, duracion_meses")
    .eq("institucion_id", perfil.institucion_id!)
    .maybeSingle();

  const { data: habilitadas } = await supabase
    .from("institucion_asignaturas")
    .select("asignatura_id")
    .eq("institucion_id", perfil.institucion_id!);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">Bienvenido, {perfil.nombres}</h1>
      <p className="mt-1" style={{ color: "var(--text-muted)" }}>
        Define cómo trabajará tu institución los proyectos STEAM.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-6" style={{ border: "1px solid var(--border-light)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
            FRECUENCIA DE PROYECTOS
          </h2>
          <p className="mt-2 text-2xl font-bold capitalize">
            {config?.frecuencia_proyectos ?? "Sin definir"}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6" style={{ border: "1px solid var(--border-light)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
            DURACIÓN POR PROYECTO
          </h2>
          <p className="mt-2 text-2xl font-bold">
            {config ? `${config.duracion_meses} ${config.duracion_meses === 1 ? "mes" : "meses"}` : "Sin definir"}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6" style={{ border: "1px solid var(--border-light)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
            ASIGNATURAS HABILITADAS
          </h2>
          <p className="mt-2 text-2xl font-bold">{habilitadas?.length ?? 0}</p>
        </div>
      </div>

      <p className="mt-8 text-sm" style={{ color: "var(--text-subtle)" }}>
        La edición de la configuración institucional llega en la siguiente iteración.
      </p>
    </main>
  );
}
