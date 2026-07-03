"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { GRADOS } from "@/lib/curriculo";

const esquemaClase = z.object({
  nombre: z.string().min(2).max(80),
  grado: z.string().refine((g) => GRADOS.some((info) => info.grado === g), "Grado inválido"),
  edadReferencial: z.number().int().min(5).max(20),
});

export async function crearClase(datos: z.infer<typeof esquemaClase>) {
  const validacion = esquemaClase.safeParse(datos);
  if (!validacion.success) return { error: "Revisa los datos de la clase." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Vuelve a iniciar sesión." };

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, institucion_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil || perfil.rol !== "docente" || !perfil.institucion_id) {
    return { error: "Solo un docente con institución puede crear clases." };
  }

  const { data: clase, error } = await supabase
    .from("clases")
    .insert({
      institucion_id: perfil.institucion_id,
      docente_id: user.id,
      nombre: validacion.data.nombre,
      grado: validacion.data.grado,
      edad_referencial: validacion.data.edadReferencial,
    })
    .select("id")
    .single();
  if (error || !clase) return { error: "No se pudo crear la clase." };

  revalidatePath("/panel/clases");
  return { ok: true as const, claseId: clase.id };
}

export async function crearProyecto(claseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Ownership: la RLS solo devuelve la clase si es del docente autenticado.
  const { data: clase } = await supabase
    .from("clases")
    .select("id, institucion_id, docente_id")
    .eq("id", claseId)
    .maybeSingle();
  if (!clase || clase.docente_id !== user.id) redirect("/panel/clases");

  // La duración viene de la definición institucional (meses → semanas).
  const { data: config } = await supabase
    .from("configuracion_institucional")
    .select("duracion_meses")
    .eq("institucion_id", clase.institucion_id)
    .maybeSingle();
  const semanas = Math.min(36, Math.max(4, (config?.duracion_meses ?? 1) * 4));

  const { data: proyecto, error } = await supabase
    .from("proyectos")
    .insert({ clase_id: clase.id, duracion_semanas: semanas })
    .select("id")
    .single();
  if (error || !proyecto) redirect(`/panel/clases/${claseId}`);

  redirect(`/panel/proyectos/${proyecto.id}`);
}
