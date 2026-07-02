import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sugerirTemas, MODELO_IA, type ContextoProyecto } from "@/lib/ia/groq";

const esquema = z.object({ proyectoId: z.string().uuid() });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ mensaje: "No autenticado." }, { status: 401 });
  }

  const cuerpo = await request.json().catch(() => null);
  const datos = esquema.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json({ mensaje: "Solicitud inválida." }, { status: 400 });
  }

  // RLS garantiza que solo el docente dueño (o estudiante matriculado) ve el
  // proyecto; verificamos además que sea el docente de la clase (Zero Trust).
  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("id, duracion_semanas, clase_id")
    .eq("id", datos.data.proyectoId)
    .maybeSingle();
  if (!proyecto) {
    return NextResponse.json({ mensaje: "Proyecto no encontrado." }, { status: 404 });
  }

  const { data: clase } = await supabase
    .from("clases")
    .select("id, grado, edad_referencial, docente_id")
    .eq("id", proyecto.clase_id)
    .maybeSingle();
  if (!clase || clase.docente_id !== user.id) {
    return NextResponse.json({ mensaje: "Solo el docente del proyecto puede generar temas." }, { status: 403 });
  }

  // DCD seleccionadas, agrupadas por asignatura.
  const { data: seleccion } = await supabase
    .from("proyecto_dcd")
    .select("dcd_id")
    .eq("proyecto_id", proyecto.id);
  if (!seleccion || seleccion.length === 0) {
    return NextResponse.json(
      { mensaje: "Selecciona primero las destrezas con criterios de desempeño." },
      { status: 400 },
    );
  }

  const { data: destrezas } = await supabase
    .from("dcd")
    .select("codigo, descripcion, asignatura_id")
    .in("id", seleccion.map((s) => s.dcd_id));
  const { data: asignaturas } = await supabase.from("asignaturas").select("id, nombre");

  const porAsignatura = new Map<string, { asignatura: string; destrezas: { codigo: string; descripcion: string }[] }>();
  for (const d of destrezas ?? []) {
    const nombre = asignaturas?.find((a) => a.id === d.asignatura_id)?.nombre ?? "Otra";
    if (!porAsignatura.has(nombre)) porAsignatura.set(nombre, { asignatura: nombre, destrezas: [] });
    porAsignatura.get(nombre)!.destrezas.push({ codigo: d.codigo, descripcion: d.descripcion });
  }

  const contexto: ContextoProyecto = {
    grado: clase.grado,
    edadReferencial: clase.edad_referencial,
    duracionSemanas: proyecto.duracion_semanas,
    dcdPorAsignatura: [...porAsignatura.values()],
  };

  const admin = createAdminClient();
  try {
    const temas = await sugerirTemas(contexto);
    // Log de trazabilidad de IA — fire-and-forget, sin await.
    void admin.from("generaciones_ia").insert({
      proyecto_id: proyecto.id,
      tipo: "temas",
      modelo: MODELO_IA,
      respuesta: temas,
      estado: "ok",
    }).then(() => undefined, () => undefined);
    return NextResponse.json(temas);
  } catch (error) {
    // Degradación elegante: se registra el fallo y el docente puede reintentar
    // o escribir su propio tema; nunca se bloquea el flujo.
    void admin.from("generaciones_ia").insert({
      proyecto_id: proyecto.id,
      tipo: "temas",
      modelo: MODELO_IA,
      estado: "error",
      error: error instanceof Error ? error.message : "desconocido",
    }).then(() => undefined, () => undefined);
    return NextResponse.json(
      { mensaje: "La IA no está disponible en este momento. Intenta de nuevo o escribe tu propio tema." },
      { status: 502 },
    );
  }
}
