"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

async function verificarLider(proyectoId: string) {
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
    .select("docente_id, institucion_id")
    .eq("id", proyecto.clase_id)
    .maybeSingle();
  if (!clase || clase.docente_id !== user.id) {
    return { error: "Solo el docente líder puede gestionar co-docentes." as const };
  }
  return { supabase, user, proyecto, clase };
}

const esquemaInvitacion = z.object({
  proyectoId: z.string().uuid(),
  docenteId: z.string().uuid(),
  asignaturaId: z.string().uuid().nullable(),
});

export async function invitarCodocente(datos: z.infer<typeof esquemaInvitacion>) {
  const validacion = esquemaInvitacion.safeParse(datos);
  if (!validacion.success) return { error: "Datos inválidos." };

  const contexto = await verificarLider(validacion.data.proyectoId);
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, user, proyecto, clase } = contexto;

  if (validacion.data.docenteId === user.id) {
    return { error: "Tú ya eres el docente líder del proyecto." };
  }

  // El invitado debe ser docente de la MISMA institución.
  const { data: invitado } = await supabase
    .from("perfiles")
    .select("id, rol, institucion_id")
    .eq("id", validacion.data.docenteId)
    .maybeSingle();
  if (!invitado || invitado.rol !== "docente" || invitado.institucion_id !== clase.institucion_id) {
    return { error: "Solo puedes invitar a docentes registrados de tu institución." };
  }

  const { error } = await supabase.from("proyecto_docentes").upsert({
    proyecto_id: proyecto.id,
    docente_id: invitado.id,
    asignatura_id: validacion.data.asignaturaId,
    invitado_por: user.id,
  });
  if (error) return { error: `No se pudo invitar al co-docente. (${error.message})` };

  revalidatePath(`/panel/proyectos/${proyecto.id}/codocentes`);
  return { ok: true as const };
}

export async function quitarCodocente(proyectoId: string, docenteId: string) {
  const contexto = await verificarLider(proyectoId);
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, proyecto } = contexto;

  const { error } = await supabase
    .from("proyecto_docentes")
    .delete()
    .eq("proyecto_id", proyecto.id)
    .eq("docente_id", docenteId);
  if (error) return { error: "No se pudo quitar al co-docente." };

  revalidatePath(`/panel/proyectos/${proyecto.id}/codocentes`);
  return { ok: true as const };
}
