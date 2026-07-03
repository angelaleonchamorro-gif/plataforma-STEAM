import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FASES_PROYECTO } from "@/types/database";
import EntregaActividad from "./EntregaActividad";

export default async function ProyectoEstudiantePage({
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

  // RLS: el proyecto solo es visible si el estudiante está matriculado.
  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("id, clase_id, titulo, reto, estado")
    .eq("id", proyectoId)
    .maybeSingle();
  if (!proyecto || proyecto.estado === "definicion" || proyecto.estado === "planificacion") {
    redirect("/panel/estudiante");
  }

  // RLS: solo llegan las actividades PUBLICADAS.
  const [{ data: actividades }, { data: entregas }] = await Promise.all([
    supabase
      .from("actividades")
      .select("id, fase, titulo, instrucciones, criterio_evaluacion, orden")
      .eq("proyecto_id", proyecto.id)
      .order("orden"),
    supabase
      .from("entregas")
      .select("actividad_id, estado, contenido, evidencia_url, retroalimentacion, calificacion")
      .eq("estudiante_id", user.id),
  ]);

  const entregasPorActividad = new Map((entregas ?? []).map((e) => [e.actividad_id, e]));

  // URLs firmadas (1 hora) para las evidencias ya subidas por el estudiante.
  const urlsFirmadas = new Map<string, string>();
  for (const entrega of entregas ?? []) {
    if (entrega.evidencia_url) {
      const { data } = await supabase.storage
        .from("evidencias")
        .createSignedUrl(entrega.evidencia_url, 3600);
      if (data?.signedUrl) urlsFirmadas.set(entrega.actividad_id, data.signedUrl);
    }
  }

  const hechas = (entregas ?? []).filter(
    (e) =>
      (e.estado === "entregada" || e.estado === "revisada") &&
      (actividades ?? []).some((a) => a.id === e.actividad_id),
  ).length;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href={`/panel/estudiante/clases/${proyecto.clase_id}`}
        className="text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        ← Proyectos de mi clase
      </Link>
      <h1 className="mt-2 text-3xl font-bold">{proyecto.titulo}</h1>
      {proyecto.reto && (
        <div
          className="mt-4 rounded-2xl p-5 text-white"
          style={{ background: "var(--primary-dark)" }}
        >
          <p className="text-xs font-bold" style={{ color: "var(--accent)" }}>
            🎯 EL RETO
          </p>
          <p className="mt-1 text-sm">{proyecto.reto}</p>
        </div>
      )}
      <p className="mt-4 text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
        {hechas} de {actividades?.length ?? 0} actividades entregadas
      </p>

      <div className="mt-8 flex flex-col gap-8">
        {FASES_PROYECTO.map((fase, indice) => {
          const actividadesFase = (actividades ?? []).filter((a) => a.fase === fase.valor);
          if (!actividadesFase.length) return null;
          return (
            <section key={fase.valor}>
              <h2 className="text-lg font-bold">
                <span style={{ color: "var(--accent-hover)" }}>Fase {indice + 1}:</span>{" "}
                {fase.nombre}
              </h2>
              <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
                {fase.descripcion}
              </p>
              <div className="mt-3 flex flex-col gap-4">
                {actividadesFase.map((actividad) => (
                  <EntregaActividad
                    key={actividad.id}
                    actividad={actividad}
                    entrega={entregasPorActividad.get(actividad.id) ?? null}
                    evidenciaUrl={urlsFirmadas.get(actividad.id) ?? null}
                    estudianteId={user.id}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
