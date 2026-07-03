import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FASES_PROYECTO } from "@/types/database";
import { subnivelDeGrado } from "@/lib/curriculo";
import BotonImprimir from "./BotonImprimir";

// Documento imprimible de la planificación: lo que el docente presenta
// a la institución (datos del proyecto, DCD y cronograma con actividades).
export default async function ImprimirPlanificacionPage({
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
    .select("id, clase_id, titulo, reto, duracion_semanas, fecha_inicio")
    .eq("id", proyectoId)
    .maybeSingle();
  if (!proyecto) redirect("/panel/clases");

  const { data: clase } = await supabase
    .from("clases")
    .select("id, nombre, grado, institucion_id, docente_id")
    .eq("id", proyecto.clase_id)
    .maybeSingle();
  if (!clase || clase.docente_id !== user.id) redirect("/panel/clases");

  const [
    { data: perfil },
    { data: institucion },
    { data: seleccion },
    { data: semanas },
    { data: actividades },
  ] = await Promise.all([
    supabase.from("perfiles").select("nombres, apellidos").eq("id", user.id).maybeSingle(),
    supabase.from("instituciones").select("nombre").eq("id", clase.institucion_id).maybeSingle(),
    supabase.from("proyecto_dcd").select("dcd_id, es_conexion").eq("proyecto_id", proyecto.id),
    supabase
      .from("planificacion_semanas")
      .select("id, numero_semana, fase, objetivo, descripcion")
      .eq("proyecto_id", proyecto.id)
      .order("numero_semana"),
    supabase
      .from("actividades")
      .select("id, semana_id, dcd_id, titulo, instrucciones, criterio_evaluacion, orden")
      .eq("proyecto_id", proyecto.id)
      .order("orden"),
  ]);

  const idsDcd = (seleccion ?? []).map((s) => s.dcd_id);
  const { data: destrezas } = idsDcd.length
    ? await supabase.from("dcd").select("id, asignatura_id, codigo, descripcion").in("id", idsDcd)
    : { data: [] };
  const { data: asignaturas } = await supabase.from("asignaturas").select("id, nombre");

  const nombreAsignatura = (id: string) =>
    asignaturas?.find((a) => a.id === id)?.nombre ?? "Otra";
  const codigoDcd = new Map((destrezas ?? []).map((d) => [d.id, d.codigo]));
  const conexiones = new Set((seleccion ?? []).filter((s) => s.es_conexion).map((s) => s.dcd_id));

  type DestrezaFila = { id: string; asignatura_id: string; codigo: string; descripcion: string };
  const porAsignatura = new Map<string, DestrezaFila[]>();
  for (const d of destrezas ?? []) {
    const nombre = nombreAsignatura(d.asignatura_id);
    if (!porAsignatura.has(nombre)) porAsignatura.set(nombre, []);
    porAsignatura.get(nombre)!.push(d);
  }

  const nombreFase = (fase: string) =>
    FASES_PROYECTO.find((f) => f.valor === fase)?.nombre ?? fase;

  return (
    <main className="mx-auto max-w-3xl bg-white px-10 py-10 print:max-w-none print:px-0 print:py-0">
      <BotonImprimir />

      <header className="border-b-2 pb-4" style={{ borderColor: "#151E29" }}>
        <h1 className="text-2xl font-extrabold">Planificación de Proyecto STEAM</h1>
        <table className="mt-3 w-full text-sm">
          <tbody>
            <tr>
              <td className="py-0.5 pr-3 font-semibold">Institución:</td>
              <td>{institucion?.nombre}</td>
              <td className="py-0.5 pr-3 font-semibold">Docente:</td>
              <td>{perfil ? `${perfil.nombres} ${perfil.apellidos}` : ""}</td>
            </tr>
            <tr>
              <td className="py-0.5 pr-3 font-semibold">Clase:</td>
              <td>{clase.nombre}</td>
              <td className="py-0.5 pr-3 font-semibold">Grado:</td>
              <td>
                {clase.grado} (subnivel {subnivelDeGrado(clase.grado)})
              </td>
            </tr>
            <tr>
              <td className="py-0.5 pr-3 font-semibold">Duración:</td>
              <td>{proyecto.duracion_semanas} semanas</td>
              <td className="py-0.5 pr-3 font-semibold">Fecha de inicio:</td>
              <td>{proyecto.fecha_inicio ?? "Por definir"}</td>
            </tr>
          </tbody>
        </table>
      </header>

      <section className="mt-6">
        <h2 className="text-lg font-bold">Proyecto: {proyecto.titulo}</h2>
        {proyecto.reto && (
          <p className="mt-1 text-sm">
            <span className="font-semibold">Reto:</span> {proyecto.reto}
          </p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold">Destrezas con criterios de desempeño</h2>
        {[...porAsignatura.entries()].map(([nombre, lista]) => (
          <div key={nombre} className="mt-3">
            <h3 className="text-sm font-bold">{nombre}</h3>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {(lista ?? []).map((d) => (
                <li key={d.id} className="py-0.5">
                  <span className="font-mono font-semibold">{d.codigo}</span>
                  {conexiones.has(d.id) && <span className="italic"> (conexión)</span>}: {d.descripcion}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold">Cronograma semanal</h2>
        {(semanas ?? []).map((semana) => {
          const actividadesSemana = (actividades ?? []).filter((a) => a.semana_id === semana.id);
          return (
            <div
              key={semana.id}
              className="mt-4 break-inside-avoid rounded-lg border p-4"
              style={{ borderColor: "#d1d5db" }}
            >
              <p className="text-sm font-bold">
                Semana {semana.numero_semana} · Fase: {nombreFase(semana.fase)}
              </p>
              <p className="mt-1 text-sm font-semibold">{semana.objetivo}</p>
              {semana.descripcion && <p className="mt-0.5 text-sm">{semana.descripcion}</p>}
              {actividadesSemana.map((actividad, i) => (
                <div key={actividad.id} className="mt-2 pl-4 text-sm">
                  <p className="font-semibold">
                    Actividad {i + 1}: {actividad.titulo}
                    {actividad.dcd_id && codigoDcd.get(actividad.dcd_id) && (
                      <span className="font-mono font-normal"> [{codigoDcd.get(actividad.dcd_id)}]</span>
                    )}
                  </p>
                  <p>{actividad.instrucciones}</p>
                  {actividad.criterio_evaluacion && (
                    <p className="italic">Evaluación: {actividad.criterio_evaluacion}</p>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </section>

      <footer className="mt-10 grid grid-cols-2 gap-10 text-center text-sm">
        <div>
          <div className="mx-auto w-56 border-t pt-1" style={{ borderColor: "#151E29" }}>
            Firma del docente
          </div>
        </div>
        <div>
          <div className="mx-auto w-56 border-t pt-1" style={{ borderColor: "#151E29" }}>
            Firma del directivo
          </div>
        </div>
      </footer>
    </main>
  );
}
