import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MuroActividades from "@/components/MuroActividades";

// Muro colaborativo — vista del estudiante: ve los trabajos de sus
// compañeros y puede comentar. Sin calificaciones ni retroalimentación.
export default async function MuroEstudiantePage({
  params,
  searchParams,
}: {
  params: Promise<{ proyectoId: string }>;
  searchParams: Promise<{ actividad?: string }>;
}) {
  const { proyectoId } = await params;
  const { actividad: actividadParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // RLS: el proyecto solo es visible si el estudiante está matriculado.
  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("id, titulo, estado")
    .eq("id", proyectoId)
    .maybeSingle();
  if (!proyecto || proyecto.estado === "definicion" || proyecto.estado === "planificacion") {
    redirect("/panel/estudiante");
  }

  // RLS: solo llegan las publicadas.
  const { data: actividades } = await supabase
    .from("actividades")
    .select("id, titulo")
    .eq("proyecto_id", proyecto.id)
    .order("orden");

  const seleccionada =
    (actividades ?? []).find((a) => a.id === actividadParam) ?? (actividades ?? [])[0] ?? null;

  const [{ data: tarjetas }, { data: comentarios }] = seleccionada
    ? await Promise.all([
        supabase.rpc("fn_muro_actividad", { p_actividad: seleccionada.id }),
        supabase.rpc("fn_comentarios_actividad", { p_actividad: seleccionada.id }),
      ])
    : [{ data: [] }, { data: [] }];

  const urlsFirmadas: Record<string, string> = {};
  for (const tarjeta of tarjetas ?? []) {
    if (tarjeta.evidencia_url) {
      const { data } = await supabase.storage
        .from("evidencias")
        .createSignedUrl(tarjeta.evidencia_url, 3600);
      if (data?.signedUrl) urlsFirmadas[tarjeta.entrega_id] = data.signedUrl;
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href={`/panel/estudiante/proyectos/${proyecto.id}`}
        className="text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        ← {proyecto.titulo}
      </Link>
      <h1 className="mt-2 text-3xl font-bold">🧱 Muro del proyecto</h1>
      <p className="mt-1" style={{ color: "var(--text-muted)" }}>
        Los trabajos de tu clase. Mira lo que hicieron tus compañeros y déjales un comentario
        respetuoso y constructivo. 💬
      </p>

      {!actividades?.length ? (
        <div
          className="mt-8 rounded-2xl bg-white p-10 text-center"
          style={{ border: "1px solid var(--border-light)" }}
        >
          <p className="font-semibold">Aún no hay actividades publicadas</p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {actividades.map((actividad) => (
              <Link
                key={actividad.id}
                href={`/panel/estudiante/proyectos/${proyecto.id}/muro?actividad=${actividad.id}`}
                className="whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold transition"
                style={
                  seleccionada?.id === actividad.id
                    ? { background: "var(--accent)", borderColor: "var(--accent)", color: "#151E29" }
                    : { borderColor: "var(--border-light-strong)" }
                }
              >
                {actividad.titulo}
              </Link>
            ))}
          </div>

          <MuroActividades
            tarjetas={tarjetas ?? []}
            comentarios={comentarios ?? []}
            urlsFirmadas={urlsFirmadas}
            usuarioId={user.id}
            esDocente={false}
            ruta={`/panel/estudiante/proyectos/${proyecto.id}/muro`}
          />
        </>
      )}
    </main>
  );
}
