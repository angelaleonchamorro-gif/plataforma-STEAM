"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const esquemaRevision = z.object({
  entregaId: z.string().uuid(),
  retroalimentacion: z.string().max(2000),
  calificacion: z.number().min(0).max(10).nullable(),
});

// Puede revisar/calificar: el docente líder del proyecto O un co-docente
// invitado (trabajo interdisciplinario).
async function puedeRevisar(
  supabase: Awaited<ReturnType<typeof createClient>>,
  proyectoId: string,
): Promise<boolean> {
  const [{ data: esDocente }, { data: esCodocente }] = await Promise.all([
    supabase.rpc("fn_es_docente_de_proyecto", { p_proyecto: proyectoId }),
    supabase.rpc("fn_soy_codocente_de_proyecto", { p_proyecto: proyectoId }),
  ]);
  return Boolean(esDocente) || Boolean(esCodocente);
}

export async function revisarEntrega(datos: z.infer<typeof esquemaRevision>) {
  const validacion = esquemaRevision.safeParse(datos);
  if (!validacion.success) return { error: "La calificación debe estar entre 0 y 10." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Vuelve a iniciar sesión." };

  // La RLS solo permite leer/editar entregas de proyectos del docente; se
  // verifica igualmente el ownership resolviendo la cadena completa.
  const { data: entrega } = await supabase
    .from("entregas")
    .select("id, actividad_id")
    .eq("id", validacion.data.entregaId)
    .maybeSingle();
  if (!entrega) return { error: "Entrega no encontrada." };

  const { data: actividad } = await supabase
    .from("actividades")
    .select("id, proyecto_id")
    .eq("id", entrega.actividad_id)
    .maybeSingle();
  if (!actividad) return { error: "Actividad no encontrada." };

  if (!(await puedeRevisar(supabase, actividad.proyecto_id))) {
    return { error: "Solo el docente o un co-docente del proyecto puede revisar entregas." };
  }

  const { error } = await supabase
    .from("entregas")
    .update({
      estado: "revisada",
      retroalimentacion: validacion.data.retroalimentacion || null,
      calificacion: validacion.data.calificacion,
      revisada_at: new Date().toISOString(),
      revisada_por: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entrega.id);
  if (error) return { error: "No se pudo guardar la revisión." };

  revalidatePath(`/panel/proyectos/${actividad.proyecto_id}/seguimiento`);
  return { ok: true as const };
}

// Calificación por equipo: la nota y retroalimentación se replican a todos
// los integrantes (luego se puede ajustar individualmente a cada uno).
const esquemaRevisionEquipo = z.object({
  actividadId: z.string().uuid(),
  equipoId: z.string().uuid(),
  retroalimentacion: z.string().max(2000),
  calificacion: z.number().min(0).max(10).nullable(),
});

export async function revisarEquipo(datos: z.infer<typeof esquemaRevisionEquipo>) {
  const validacion = esquemaRevisionEquipo.safeParse(datos);
  if (!validacion.success) return { error: "La calificación debe estar entre 0 y 10." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Vuelve a iniciar sesión." };

  const { data: actividad } = await supabase
    .from("actividades")
    .select("id, proyecto_id")
    .eq("id", validacion.data.actividadId)
    .maybeSingle();
  if (!actividad) return { error: "Actividad no encontrada." };

  if (!(await puedeRevisar(supabase, actividad.proyecto_id))) {
    return { error: "Solo el docente o un co-docente del proyecto puede calificar." };
  }

  // Miembros del equipo (el equipo debe ser del mismo proyecto).
  const { data: miembros } = await supabase
    .from("equipo_miembros")
    .select("estudiante_id")
    .eq("equipo_id", validacion.data.equipoId)
    .eq("proyecto_id", actividad.proyecto_id);
  if (!miembros?.length) return { error: "El equipo no tiene integrantes." };

  const ahora = new Date().toISOString();
  const { error } = await supabase.from("entregas").upsert(
    miembros.map((m) => ({
      actividad_id: actividad.id,
      estudiante_id: m.estudiante_id,
      estado: "revisada" as const,
      retroalimentacion: validacion.data.retroalimentacion || null,
      calificacion: validacion.data.calificacion,
      revisada_at: ahora,
      revisada_por: user.id,
      updated_at: ahora,
    })),
    { onConflict: "actividad_id,estudiante_id" },
  );
  if (error) return { error: `No se pudo calificar al equipo. (${error.message})` };

  revalidatePath(`/panel/proyectos/${actividad.proyecto_id}/seguimiento`);
  return { ok: true as const, integrantes: miembros.length };
}

const esquemaRevisionArticulo = z.object({
  articuloId: z.string().uuid(),
  retroalimentacion: z.string().max(2000),
  calificacion: z.number().min(0).max(10).nullable(),
});

export async function revisarArticulo(datos: z.infer<typeof esquemaRevisionArticulo>) {
  const validacion = esquemaRevisionArticulo.safeParse(datos);
  if (!validacion.success) return { error: "La calificación debe estar entre 0 y 10." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Vuelve a iniciar sesión." };

  const { data: articulo } = await supabase
    .from("articulos_cientificos")
    .select("id, proyecto_id")
    .eq("id", validacion.data.articuloId)
    .maybeSingle();
  if (!articulo) return { error: "Artículo no encontrado." };

  if (!(await puedeRevisar(supabase, articulo.proyecto_id))) {
    return { error: "Solo el docente o un co-docente del proyecto puede revisar artículos." };
  }

  const { error } = await supabase
    .from("articulos_cientificos")
    .update({
      estado: "revisada",
      retroalimentacion: validacion.data.retroalimentacion || null,
      calificacion: validacion.data.calificacion,
      revisado_at: new Date().toISOString(),
      revisado_por: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", articulo.id);
  if (error) return { error: "No se pudo guardar la revisión." };

  revalidatePath(`/panel/proyectos/${articulo.proyecto_id}/seguimiento`);
  return { ok: true as const };
}
