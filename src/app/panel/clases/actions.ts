"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { GRADOS, subnivelDeGrado } from "@/lib/curriculo";

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
  if (error || !clase) {
    return { error: `No se pudo crear la clase.${error ? ` (${error.message})` : ""}` };
  }

  revalidatePath("/panel/clases");
  return { ok: true as const, claseId: clase.id };
}

const esquemaEdicionClase = z.object({
  claseId: z.string().uuid(),
  nombre: z.string().min(2).max(80),
  grado: z.string().refine((g) => GRADOS.some((info) => info.grado === g), "Grado inválido"),
  edadReferencial: z.number().int().min(5).max(20),
});

export async function actualizarClase(datos: z.infer<typeof esquemaEdicionClase>) {
  const validacion = esquemaEdicionClase.safeParse(datos);
  if (!validacion.success) return { error: "Revisa los datos de la clase." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Vuelve a iniciar sesión." };

  const { data: clase } = await supabase
    .from("clases")
    .select("id, docente_id, grado")
    .eq("id", validacion.data.claseId)
    .maybeSingle();
  if (!clase || clase.docente_id !== user.id) {
    return { error: "Solo el docente de la clase puede editarla." };
  }

  // El grado define el subnivel de las destrezas: si ya hay proyectos,
  // cambiarlo dejaría las DCD seleccionadas fuera de subnivel.
  if (validacion.data.grado !== clase.grado) {
    const { count } = await supabase
      .from("proyectos")
      .select("id", { count: "exact", head: true })
      .eq("clase_id", clase.id);
    if ((count ?? 0) > 0) {
      return {
        error: "No se puede cambiar el grado: la clase ya tiene proyectos con destrezas de ese subnivel. Puedes editar el nombre y la edad.",
      };
    }
  }

  const { error } = await supabase
    .from("clases")
    .update({
      nombre: validacion.data.nombre,
      grado: validacion.data.grado,
      edad_referencial: validacion.data.edadReferencial,
    })
    .eq("id", clase.id);
  if (error) return { error: `No se pudo actualizar la clase. (${error.message})` };

  revalidatePath(`/panel/clases/${clase.id}`);
  revalidatePath("/panel/clases");
  return { ok: true as const };
}

export async function eliminarClase(claseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Vuelve a iniciar sesión." };

  const { data: clase } = await supabase
    .from("clases")
    .select("id, docente_id")
    .eq("id", claseId)
    .maybeSingle();
  if (!clase || clase.docente_id !== user.id) {
    return { error: "Solo el docente de la clase puede eliminarla." };
  }

  // El borrado arrastra en cascada proyectos, matrícula, actividades y
  // entregas. Las cuentas de los estudiantes NO se eliminan.
  const { error } = await supabase.from("clases").delete().eq("id", clase.id);
  if (error) return { error: `No se pudo eliminar la clase. (${error.message})` };

  revalidatePath("/panel/clases");
  return { ok: true as const };
}

export async function eliminarProyecto(proyectoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Vuelve a iniciar sesión." };

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("id, clase_id")
    .eq("id", proyectoId)
    .maybeSingle();
  if (!proyecto) return { error: "Proyecto no encontrado." };

  const { data: clase } = await supabase
    .from("clases")
    .select("id, docente_id")
    .eq("id", proyecto.clase_id)
    .maybeSingle();
  if (!clase || clase.docente_id !== user.id) {
    return { error: "Solo el docente líder puede eliminar el proyecto." };
  }

  const { error } = await supabase.from("proyectos").delete().eq("id", proyecto.id);
  if (error) return { error: `No se pudo eliminar el proyecto. (${error.message})` };

  revalidatePath(`/panel/clases/${clase.id}`);
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
    .select("id, institucion_id, docente_id, grado")
    .eq("id", claseId)
    .maybeSingle();
  if (!clase || clase.docente_id !== user.id) redirect("/panel/clases");

  // La duración viene de la definición institucional DEL SUBNIVEL de la clase
  // (meses → semanas).
  const subnivel = subnivelDeGrado(clase.grado);
  const { data: config } = subnivel
    ? await supabase
        .from("configuracion_subniveles")
        .select("duracion_meses")
        .eq("institucion_id", clase.institucion_id)
        .eq("subnivel", subnivel)
        .maybeSingle()
    : { data: null };
  const semanas = Math.min(36, Math.max(4, (config?.duracion_meses ?? 1) * 4));

  const { data: proyecto, error } = await supabase
    .from("proyectos")
    .insert({ clase_id: clase.id, duracion_semanas: semanas })
    .select("id")
    .single();
  if (error || !proyecto) redirect(`/panel/clases/${claseId}`);

  redirect(`/panel/proyectos/${proyecto.id}`);
}
