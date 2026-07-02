import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generarPlanificacion, MODELO_IA, type ContextoProyecto } from "@/lib/ia/groq";

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

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("id, titulo, reto, duracion_semanas, clase_id")
    .eq("id", datos.data.proyectoId)
    .maybeSingle();
  if (!proyecto) {
    return NextResponse.json({ mensaje: "Proyecto no encontrado." }, { status: 404 });
  }
  if (!proyecto.titulo || !proyecto.reto) {
    return NextResponse.json(
      { mensaje: "Define primero el tema y el reto del proyecto." },
      { status: 400 },
    );
  }

  const { data: clase } = await supabase
    .from("clases")
    .select("id, grado, edad_referencial, docente_id")
    .eq("id", proyecto.clase_id)
    .maybeSingle();
  if (!clase || clase.docente_id !== user.id) {
    return NextResponse.json(
      { mensaje: "Solo el docente del proyecto puede generar la planificación." },
      { status: 403 },
    );
  }

  const { data: seleccion } = await supabase
    .from("proyecto_dcd")
    .select("dcd_id")
    .eq("proyecto_id", proyecto.id);
  const { data: destrezas } = await supabase
    .from("dcd")
    .select("id, codigo, descripcion, asignatura_id")
    .in("id", (seleccion ?? []).map((s) => s.dcd_id));
  const { data: asignaturas } = await supabase.from("asignaturas").select("id, nombre");

  const porAsignatura = new Map<string, { asignatura: string; destrezas: { codigo: string; descripcion: string }[] }>();
  for (const d of destrezas ?? []) {
    const nombre = asignaturas?.find((a) => a.id === d.asignatura_id)?.nombre ?? "Otra";
    if (!porAsignatura.has(nombre)) porAsignatura.set(nombre, { asignatura: nombre, destrezas: [] });
    porAsignatura.get(nombre)!.destrezas.push({ codigo: d.codigo, descripcion: d.descripcion });
  }

  const contexto: ContextoProyecto & { titulo: string; reto: string } = {
    grado: clase.grado,
    edadReferencial: clase.edad_referencial,
    duracionSemanas: proyecto.duracion_semanas,
    dcdPorAsignatura: [...porAsignatura.values()],
    titulo: proyecto.titulo,
    reto: proyecto.reto,
  };

  const admin = createAdminClient();
  try {
    const plan = await generarPlanificacion(contexto);

    // Persistir como BORRADOR editable: semanas + actividades (publicada=false).
    // El docente revisa, ajusta y publica — la IA sugiere, no decide.
    for (const semana of plan.semanas) {
      const { data: semanaCreada } = await supabase
        .from("planificacion_semanas")
        .upsert(
          {
            proyecto_id: proyecto.id,
            numero_semana: semana.numero,
            fase: semana.fase,
            objetivo: semana.objetivo,
            descripcion: semana.descripcion,
          },
          { onConflict: "proyecto_id,numero_semana" },
        )
        .select("id")
        .single();

      let orden = 0;
      for (const actividad of semana.actividades) {
        const dcdId =
          actividad.codigoDcd
            ? destrezas?.find((d) => d.codigo === actividad.codigoDcd)?.id ?? null
            : null;
        await supabase.from("actividades").insert({
          proyecto_id: proyecto.id,
          semana_id: semanaCreada?.id ?? null,
          fase: semana.fase,
          dcd_id: dcdId,
          titulo: actividad.titulo,
          instrucciones: actividad.instrucciones,
          criterio_evaluacion: actividad.criterioEvaluacion,
          orden: orden++,
          generada_por_ia: true,
          publicada: false,
        });
      }
    }

    await supabase.from("proyectos").update({ estado: "planificacion" }).eq("id", proyecto.id);

    void admin.from("generaciones_ia").insert({
      proyecto_id: proyecto.id,
      tipo: "planificacion",
      modelo: MODELO_IA,
      respuesta: plan,
      estado: "ok",
    }).then(() => undefined, () => undefined);

    return NextResponse.json(plan);
  } catch (error) {
    void admin.from("generaciones_ia").insert({
      proyecto_id: proyecto.id,
      tipo: "planificacion",
      modelo: MODELO_IA,
      estado: "error",
      error: error instanceof Error ? error.message : "desconocido",
    }).then(() => undefined, () => undefined);
    return NextResponse.json(
      { mensaje: "La IA no está disponible en este momento. Intenta de nuevo en unos minutos." },
      { status: 502 },
    );
  }
}
