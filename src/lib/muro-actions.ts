"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const esquemaComentario = z.object({
  entregaId: z.string().uuid(),
  texto: z.string().min(1).max(1000),
  // Ruta del muro que hay que refrescar (docente o estudiante).
  ruta: z.string().max(200),
});

export async function comentarMuro(datos: z.infer<typeof esquemaComentario>) {
  const validacion = esquemaComentario.safeParse(datos);
  if (!validacion.success) return { error: "El comentario debe tener entre 1 y 1000 caracteres." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Vuelve a iniciar sesión." };

  // Zero Trust: la RLS valida con fn_puedo_comentar_entrega, pero verificamos
  // también aquí para dar un mensaje claro.
  const { data: puede } = await supabase.rpc("fn_puedo_comentar_entrega", {
    p_entrega: validacion.data.entregaId,
  });
  if (!puede) return { error: "No puedes comentar en esta publicación." };

  const { error } = await supabase.from("comentarios_muro").insert({
    entrega_id: validacion.data.entregaId,
    autor_id: user.id,
    texto: validacion.data.texto.trim(),
  });
  if (error) return { error: `No se pudo publicar el comentario. (${error.message})` };

  revalidatePath(validacion.data.ruta);
  return { ok: true as const };
}

export async function eliminarComentarioMuro(comentarioId: string, ruta: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Vuelve a iniciar sesión." };

  // La RLS solo permite borrar al autor o al docente líder (moderación).
  const { error } = await supabase.from("comentarios_muro").delete().eq("id", comentarioId);
  if (error) return { error: "No se pudo eliminar el comentario." };

  revalidatePath(ruta);
  return { ok: true as const };
}
