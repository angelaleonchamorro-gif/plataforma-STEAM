import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FASES_PROYECTO } from "@/types/database";
import { subnivelDeGrado } from "@/lib/curriculo";
import type { SeccionesArticulo } from "@/lib/articulo";
import RevisionEntrega from "./RevisionEntrega";
import RevisionArticulo from "./RevisionArticulo";

// Tablero de trazabilidad del docente: estado de cada estudiante en cada
// actividad publicada, con revisión (retroalimentación + calificación).
export default async function SeguimientoPage({
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
    .select("id, clase_id, titulo, estado")
    .eq("id", proyectoId)
    .maybeSingle();
  if (!proyecto) redirect("/panel/clases");

  const { data: clase } = await supabase
    .from("clases")
    .select("id, nombre, grado, docente_id")
    .eq("id", proyecto.clase_id)
    .maybeSingle();
  if (!clase || clase.docente_id !== user.id) redirect("/panel/clases");

  const esBachillerato = subnivelDeGrado(clase.grado) === "BGU";

  const [{ data: actividades }, { data: matriculas }, { data: equipos }, { data: miembros }] =
    await Promise.all([
      supabase
        .from("actividades")
        .select("id, fase, titulo, publicada, orden")
        .eq("proyecto_id", proyecto.id)
        .eq("publicada", true)
        .order("orden"),
      supabase.from("clase_estudiantes").select("estudiante_id").eq("clase_id", clase.id),
      supabase.from("equipos").select("id, nombre").eq("proyecto_id", proyecto.id),
      supabase
        .from("equipo_miembros")
        .select("equipo_id, estudiante_id")
        .eq("proyecto_id", proyecto.id),
    ]);

  const equipoPorEstudiante: Record<string, { id: string; nombre: string }> = {};
  for (const miembro of miembros ?? []) {
    const equipo = (equipos ?? []).find((e) => e.id === miembro.equipo_id);
    if (equipo) equipoPorEstudiante[miembro.estudiante_id] = equipo;
  }

  const { data: estudiantes } = matriculas?.length
    ? await supabase
        .from("perfiles")
        .select("id, nombres, apellidos")
        .in("id", matriculas.map((m) => m.estudiante_id))
        .order("apellidos")
    : { data: [] };

  const { data: articulos } = esBachillerato
    ? await supabase
        .from("articulos_cientificos")
        .select("id, estudiante_id, secciones, estado, entregado_at, retroalimentacion, calificacion")
        .eq("proyecto_id", proyecto.id)
    : { data: [] };

  const { data: entregas } = actividades?.length
    ? await supabase
        .from("entregas")
        .select(
          "id, actividad_id, estudiante_id, estado, contenido, evidencia_url, entregada_at, retroalimentacion, calificacion",
        )
        .in("actividad_id", actividades.map((a) => a.id))
    : { data: [] };

  // URLs firmadas (1 hora) de las evidencias, para verlas desde el tablero.
  const urlsFirmadas: Record<string, string> = {};
  for (const entrega of entregas ?? []) {
    if (entrega.evidencia_url) {
      const { data } = await supabase.storage
        .from("evidencias")
        .createSignedUrl(entrega.evidencia_url, 3600);
      if (data?.signedUrl) urlsFirmadas[entrega.id] = data.signedUrl;
    }
  }

  const totalEsperadas = (actividades?.length ?? 0) * (estudiantes?.length ?? 0);
  const recibidas = (entregas ?? []).filter(
    (e) => e.estado === "entregada" || e.estado === "revisada",
  ).length;
  const revisadas = (entregas ?? []).filter((e) => e.estado === "revisada").length;

  function nombreFase(fase: string) {
    return FASES_PROYECTO.find((f) => f.valor === fase)?.nombre ?? fase;
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href={`/panel/proyectos/${proyecto.id}`}
        className="text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        ← {proyecto.titulo ?? "Proyecto"}
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Seguimiento del proyecto</h1>
      <p className="mt-1" style={{ color: "var(--text-muted)" }}>
        {clase.nombre} · trazabilidad de las actividades de tus estudiantes
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-4">
        {[
          { titulo: "ESTUDIANTES", valor: estudiantes?.length ?? 0 },
          { titulo: "ACTIVIDADES PUBLICADAS", valor: actividades?.length ?? 0 },
          {
            titulo: "ENTREGAS RECIBIDAS",
            valor: `${recibidas}${totalEsperadas ? ` / ${totalEsperadas}` : ""}`,
          },
          { titulo: "REVISADAS", valor: revisadas },
        ].map((tarjeta) => (
          <div
            key={tarjeta.titulo}
            className="rounded-2xl bg-white p-5"
            style={{ border: "1px solid var(--border-light)" }}
          >
            <h2 className="text-xs font-semibold tracking-wide" style={{ color: "var(--text-muted)" }}>
              {tarjeta.titulo}
            </h2>
            <p className="mt-1 text-2xl font-bold">{tarjeta.valor}</p>
          </div>
        ))}
      </div>

      {!actividades?.length ? (
        <div
          className="mt-8 rounded-2xl bg-white p-10 text-center"
          style={{ border: "1px solid var(--border-light)" }}
        >
          <p className="font-semibold">Aún no hay actividades publicadas</p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Publica las actividades de la planificación para que tus estudiantes empiecen a trabajar.
          </p>
        </div>
      ) : !estudiantes?.length ? (
        <div
          className="mt-8 rounded-2xl bg-white p-10 text-center"
          style={{ border: "1px solid var(--border-light)" }}
        >
          <p className="font-semibold">Todavía no hay estudiantes matriculados</p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Comparte el código de la clase para que se registren.
          </p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {esBachillerato && (
            <RevisionArticulo
              estudiantes={estudiantes}
              articulos={(articulos ?? []).map((a) => ({
                ...a,
                secciones: (a.secciones as SeccionesArticulo) ?? {},
              }))}
            />
          )}
          {actividades.map((actividad) => (
            <RevisionEntrega
              key={actividad.id}
              actividad={{
                id: actividad.id,
                titulo: actividad.titulo,
                fase: nombreFase(actividad.fase),
              }}
              estudiantes={estudiantes}
              entregas={(entregas ?? []).filter((e) => e.actividad_id === actividad.id)}
              urlsFirmadas={urlsFirmadas}
              equipoPorEstudiante={equipoPorEstudiante}
            />
          ))}
        </div>
      )}
    </main>
  );
}
