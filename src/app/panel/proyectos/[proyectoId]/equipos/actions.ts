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
    return { error: "Solo el docente del proyecto puede gestionar equipos." as const };
  }
  return { supabase, proyecto };
}

const esquemaEquipo = z.object({
  proyectoId: z.string().uuid(),
  nombre: z.string().min(2).max(60),
});

export async function crearEquipo(datos: z.infer<typeof esquemaEquipo>) {
  const validacion = esquemaEquipo.safeParse(datos);
  if (!validacion.success) return { error: "El nombre del equipo debe tener entre 2 y 60 caracteres." };

  const contexto = await verificarDocenteDeProyecto(validacion.data.proyectoId);
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, proyecto } = contexto;

  const { error } = await supabase
    .from("equipos")
    .insert({ proyecto_id: proyecto.id, nombre: validacion.data.nombre.trim() });
  if (error) {
    const duplicado = error.message.includes("duplicate") || error.code === "23505";
    return { error: duplicado ? "Ya existe un equipo con ese nombre en este proyecto." : `No se pudo crear el equipo. (${error.message})` };
  }

  revalidatePath(`/panel/proyectos/${proyecto.id}/equipos`);
  return { ok: true as const };
}

export async function eliminarEquipo(proyectoId: string, equipoId: string) {
  const contexto = await verificarDocenteDeProyecto(proyectoId);
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, proyecto } = contexto;

  const { error } = await supabase
    .from("equipos")
    .delete()
    .eq("id", equipoId)
    .eq("proyecto_id", proyecto.id);
  if (error) return { error: "No se pudo eliminar el equipo." };

  revalidatePath(`/panel/proyectos/${proyecto.id}/equipos`);
  return { ok: true as const };
}

const esquemaMiembro = z.object({
  proyectoId: z.string().uuid(),
  equipoId: z.string().uuid(),
  estudianteId: z.string().uuid(),
  rol: z.string().max(60).nullable(),
});

export async function asignarMiembro(datos: z.infer<typeof esquemaMiembro>) {
  const validacion = esquemaMiembro.safeParse(datos);
  if (!validacion.success) return { error: "Datos inválidos." };

  const contexto = await verificarDocenteDeProyecto(validacion.data.proyectoId);
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, proyecto } = contexto;

  // El equipo debe pertenecer al proyecto (evita mover estudiantes entre proyectos).
  const { data: equipo } = await supabase
    .from("equipos")
    .select("id")
    .eq("id", validacion.data.equipoId)
    .eq("proyecto_id", proyecto.id)
    .maybeSingle();
  if (!equipo) return { error: "Equipo no encontrado en este proyecto." };

  // Un estudiante, un equipo por proyecto: si estaba en otro, se lo mueve.
  await supabase
    .from("equipo_miembros")
    .delete()
    .eq("proyecto_id", proyecto.id)
    .eq("estudiante_id", validacion.data.estudianteId);

  const { error } = await supabase.from("equipo_miembros").insert({
    equipo_id: equipo.id,
    proyecto_id: proyecto.id,
    estudiante_id: validacion.data.estudianteId,
    rol: validacion.data.rol,
  });
  if (error) return { error: `No se pudo asignar al estudiante. (${error.message})` };

  revalidatePath(`/panel/proyectos/${proyecto.id}/equipos`);
  return { ok: true as const };
}

export async function actualizarRol(datos: z.infer<typeof esquemaMiembro>) {
  const validacion = esquemaMiembro.safeParse(datos);
  if (!validacion.success) return { error: "Datos inválidos." };

  const contexto = await verificarDocenteDeProyecto(validacion.data.proyectoId);
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, proyecto } = contexto;

  const { error } = await supabase
    .from("equipo_miembros")
    .update({ rol: validacion.data.rol })
    .eq("equipo_id", validacion.data.equipoId)
    .eq("estudiante_id", validacion.data.estudianteId);
  if (error) return { error: "No se pudo actualizar el rol." };

  revalidatePath(`/panel/proyectos/${proyecto.id}/equipos`);
  return { ok: true as const };
}

export async function quitarMiembro(proyectoId: string, equipoId: string, estudianteId: string) {
  const contexto = await verificarDocenteDeProyecto(proyectoId);
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, proyecto } = contexto;

  const { error } = await supabase
    .from("equipo_miembros")
    .delete()
    .eq("equipo_id", equipoId)
    .eq("estudiante_id", estudianteId);
  if (error) return { error: "No se pudo quitar al estudiante." };

  revalidatePath(`/panel/proyectos/${proyecto.id}/equipos`);
  return { ok: true as const };
}
