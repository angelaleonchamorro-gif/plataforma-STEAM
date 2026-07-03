"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

async function verificarDocenteDeProyecto(proyectoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Vuelve a iniciar sesión." as const };

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("id, clase_id")
    .eq("id", proyectoId)
    .maybeSingle();
  if (!proyecto) return { error: "Proyecto no encontrado." as const };

  const { data: clase } = await supabase
    .from("clases")
    .select("docente_id")
    .eq("id", proyecto.clase_id)
    .maybeSingle();
  if (!clase || clase.docente_id !== user.id) {
    return { error: "Solo el docente del proyecto puede hacer esto." as const };
  }
  return { supabase, proyecto };
}

const esquemaSeleccion = z.object({
  proyectoId: z.string().uuid(),
  seleccion: z
    .array(z.object({ dcdId: z.string().uuid(), esConexion: z.boolean() }))
    .min(1, "Selecciona al menos una destreza")
    .max(60),
});

export async function guardarSeleccionDcd(datos: z.infer<typeof esquemaSeleccion>) {
  const validacion = esquemaSeleccion.safeParse(datos);
  if (!validacion.success) {
    return { error: "Selecciona al menos una destreza (máximo 60)." };
  }

  const contexto = await verificarDocenteDeProyecto(validacion.data.proyectoId);
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, proyecto } = contexto;

  const { error: errorBorrado } = await supabase
    .from("proyecto_dcd")
    .delete()
    .eq("proyecto_id", proyecto.id);
  if (errorBorrado) return { error: "No se pudo actualizar la selección." };

  const { error: errorInsercion } = await supabase.from("proyecto_dcd").insert(
    validacion.data.seleccion.map((s) => ({
      proyecto_id: proyecto.id,
      dcd_id: s.dcdId,
      es_conexion: s.esConexion,
    })),
  );
  if (errorInsercion) return { error: "No se pudo guardar la selección." };

  revalidatePath(`/panel/proyectos/${proyecto.id}`);
  return { ok: true as const };
}

// Habilidades de Tecnología e Ingeniería que escribe el docente (el currículo
// del Mineduc no define DCD para estos componentes STEAM).
const esquemaHabilidades = z.object({
  proyectoId: z.string().uuid(),
  habilidades: z
    .array(
      z.object({
        componente: z.enum(["tecnologia", "ingenieria"]),
        descripcion: z.string().min(5).max(500),
        indicador: z.string().max(500).nullable(),
      }),
    )
    .max(20),
});

export async function guardarHabilidades(datos: z.infer<typeof esquemaHabilidades>) {
  const validacion = esquemaHabilidades.safeParse(datos);
  if (!validacion.success) {
    return { error: "Cada habilidad necesita una descripción de al menos 5 caracteres." };
  }

  const contexto = await verificarDocenteDeProyecto(validacion.data.proyectoId);
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, proyecto } = contexto;

  const { error: errorBorrado } = await supabase
    .from("proyecto_habilidades")
    .delete()
    .eq("proyecto_id", proyecto.id);
  if (errorBorrado) return { error: `No se pudieron actualizar las habilidades. (${errorBorrado.message})` };

  if (validacion.data.habilidades.length) {
    const { error } = await supabase.from("proyecto_habilidades").insert(
      validacion.data.habilidades.map((h, orden) => ({
        proyecto_id: proyecto.id,
        componente: h.componente,
        descripcion: h.descripcion,
        indicador: h.indicador,
        orden,
      })),
    );
    if (error) return { error: `No se pudieron guardar las habilidades. (${error.message})` };
  }

  revalidatePath(`/panel/proyectos/${proyecto.id}`);
  return { ok: true as const };
}

const esquemaTema = z.object({
  proyectoId: z.string().uuid(),
  titulo: z.string().min(5).max(200),
  reto: z.string().min(10).max(1000),
});

export async function elegirTema(datos: z.infer<typeof esquemaTema>) {
  const validacion = esquemaTema.safeParse(datos);
  if (!validacion.success) {
    return { error: "El tema necesita un título y un reto descriptivo." };
  }

  const contexto = await verificarDocenteDeProyecto(validacion.data.proyectoId);
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, proyecto } = contexto;

  const { error } = await supabase
    .from("proyectos")
    .update({ titulo: validacion.data.titulo, reto: validacion.data.reto })
    .eq("id", proyecto.id);
  if (error) return { error: "No se pudo guardar el tema." };

  revalidatePath(`/panel/proyectos/${proyecto.id}`);
  return { ok: true as const };
}

// ---------- Actividades de la planificación ----------

async function verificarDocenteDeActividad(actividadId: string) {
  const supabase = await createClient();
  const { data: actividad } = await supabase
    .from("actividades")
    .select("id, proyecto_id")
    .eq("id", actividadId)
    .maybeSingle();
  if (!actividad) return { error: "Actividad no encontrada." as const };

  const contexto = await verificarDocenteDeProyecto(actividad.proyecto_id);
  if ("error" in contexto) return { error: contexto.error };
  return { supabase, actividad, proyectoId: actividad.proyecto_id };
}

const esquemaActividad = z.object({
  actividadId: z.string().uuid(),
  titulo: z.string().min(3).max(200),
  instrucciones: z.string().min(10).max(4000),
  criterioEvaluacion: z.string().max(2000).nullable(),
  recursos: z.string().max(1000).nullable(),
  evidencia: z.string().max(1000).nullable(),
  asignaturaId: z.string().uuid().nullable(),
});

export async function actualizarActividad(datos: z.infer<typeof esquemaActividad>) {
  const validacion = esquemaActividad.safeParse(datos);
  if (!validacion.success) return { error: "Revisa el título y las instrucciones." };

  const contexto = await verificarDocenteDeActividad(validacion.data.actividadId);
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, actividad, proyectoId } = contexto;

  const { error } = await supabase
    .from("actividades")
    .update({
      titulo: validacion.data.titulo,
      instrucciones: validacion.data.instrucciones,
      criterio_evaluacion: validacion.data.criterioEvaluacion,
      recursos: validacion.data.recursos,
      evidencia: validacion.data.evidencia,
      asignatura_id: validacion.data.asignaturaId,
      generada_por_ia: false, // el docente la hizo suya al editarla
    })
    .eq("id", actividad.id);
  if (error) return { error: "No se pudo guardar la actividad." };

  revalidatePath(`/panel/proyectos/${proyectoId}`);
  return { ok: true as const };
}

export async function eliminarActividad(actividadId: string) {
  const contexto = await verificarDocenteDeActividad(actividadId);
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, actividad, proyectoId } = contexto;

  const { error } = await supabase.from("actividades").delete().eq("id", actividad.id);
  if (error) return { error: "No se pudo eliminar la actividad." };

  revalidatePath(`/panel/proyectos/${proyectoId}`);
  return { ok: true as const };
}

export async function alternarPublicacion(actividadId: string, publicada: boolean) {
  const contexto = await verificarDocenteDeActividad(actividadId);
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, actividad, proyectoId } = contexto;

  const { error } = await supabase
    .from("actividades")
    .update({ publicada })
    .eq("id", actividad.id);
  if (error) return { error: "No se pudo cambiar la publicación." };

  if (publicada) {
    // Con la primera actividad publicada el proyecto ya es visible para los
    // estudiantes: pasa a ejecución (sin esperar a "Publicar todas").
    await supabase
      .from("proyectos")
      .update({ estado: "en_ejecucion" })
      .eq("id", proyectoId)
      .in("estado", ["definicion", "planificacion"]);
    await supabase
      .from("proyectos")
      .update({ fecha_inicio: new Date().toISOString().slice(0, 10) })
      .eq("id", proyectoId)
      .is("fecha_inicio", null);
  }

  revalidatePath(`/panel/proyectos/${proyectoId}`);
  return { ok: true as const };
}

// Borra la planificación (semanas + actividades) para regenerarla con la IA.
// Bloqueado si ya existen entregas de estudiantes: se perdería su trabajo.
export async function eliminarPlanificacion(proyectoId: string) {
  const contexto = await verificarDocenteDeProyecto(proyectoId);
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, proyecto } = contexto;

  const { data: actividades } = await supabase
    .from("actividades")
    .select("id")
    .eq("proyecto_id", proyecto.id);

  if (actividades?.length) {
    const { count } = await supabase
      .from("entregas")
      .select("id", { count: "exact", head: true })
      .in("actividad_id", actividades.map((a) => a.id));
    if ((count ?? 0) > 0) {
      return {
        error:
          "No se puede regenerar: ya hay entregas de estudiantes en estas actividades. Edita las actividades una a una.",
      };
    }
  }

  await supabase.from("actividades").delete().eq("proyecto_id", proyecto.id);
  await supabase.from("planificacion_semanas").delete().eq("proyecto_id", proyecto.id);
  await supabase.from("proyectos").update({ estado: "planificacion" }).eq("id", proyecto.id);

  revalidatePath(`/panel/proyectos/${proyecto.id}`);
  return { ok: true as const };
}

export async function publicarTodas(proyectoId: string) {
  const contexto = await verificarDocenteDeProyecto(proyectoId);
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, proyecto } = contexto;

  const { error } = await supabase
    .from("actividades")
    .update({ publicada: true })
    .eq("proyecto_id", proyecto.id);
  if (error) return { error: "No se pudieron publicar las actividades." };

  // El proyecto pasa a ejecución; la fecha de inicio solo se fija la primera vez.
  await supabase.from("proyectos").update({ estado: "en_ejecucion" }).eq("id", proyecto.id);
  await supabase
    .from("proyectos")
    .update({ fecha_inicio: new Date().toISOString().slice(0, 10) })
    .eq("id", proyecto.id)
    .is("fecha_inicio", null);

  revalidatePath(`/panel/proyectos/${proyecto.id}`);
  return { ok: true as const };
}
