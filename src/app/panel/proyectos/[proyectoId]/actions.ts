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
