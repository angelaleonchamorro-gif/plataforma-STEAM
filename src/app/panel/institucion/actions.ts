"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SUBNIVELES = ["Elemental", "Media", "Superior", "BGU"] as const;

async function verificarDirectivo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Vuelve a iniciar sesión." as const };

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, institucion_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil || perfil.rol !== "directivo" || !perfil.institucion_id) {
    return { error: "Solo el directivo puede editar la configuración institucional." as const };
  }
  return { supabase, user, institucionId: perfil.institucion_id };
}

// ---------- Configuración por subnivel ----------

const esquemaSubnivel = z.object({
  subnivel: z.enum(SUBNIVELES),
  frecuencia: z.enum(["mensual", "bimestral", "trimestral", "quimestral", "semestral", "anual"]),
  duracionMeses: z.number().int().min(1).max(9),
});

export async function guardarConfiguracionSubnivel(datos: z.infer<typeof esquemaSubnivel>) {
  const validacion = esquemaSubnivel.safeParse(datos);
  if (!validacion.success) {
    return { error: "Datos inválidos: revisa la duración (1 a 9 meses)." };
  }

  const contexto = await verificarDirectivo();
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, user, institucionId } = contexto;

  const { error } = await supabase.from("configuracion_subniveles").upsert({
    institucion_id: institucionId,
    subnivel: validacion.data.subnivel,
    frecuencia_proyectos: validacion.data.frecuencia,
    duracion_meses: validacion.data.duracionMeses,
    actualizado_por: user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: `No se pudo guardar la configuración. (${error.message})` };

  revalidatePath("/panel/institucion");
  return { ok: true as const };
}

// ---------- Asignaturas habilitadas ----------

const esquemaAsignaturas = z.object({
  asignaturaIds: z.array(z.string().uuid()).min(1),
});

export async function guardarAsignaturas(datos: z.infer<typeof esquemaAsignaturas>) {
  const validacion = esquemaAsignaturas.safeParse(datos);
  if (!validacion.success) return { error: "Selecciona al menos una asignatura." };

  const contexto = await verificarDirectivo();
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, institucionId } = contexto;

  const { error: errorBorrado } = await supabase
    .from("institucion_asignaturas")
    .delete()
    .eq("institucion_id", institucionId);
  if (errorBorrado) return { error: "No se pudieron actualizar las asignaturas." };

  const { error: errorInsercion } = await supabase.from("institucion_asignaturas").insert(
    validacion.data.asignaturaIds.map((asignaturaId) => ({
      institucion_id: institucionId,
      asignatura_id: asignaturaId,
    })),
  );
  if (errorInsercion) return { error: "No se pudieron guardar las asignaturas." };

  revalidatePath("/panel/institucion");
  return { ok: true as const };
}

// ---------- Asignatura personalizada ("Otra") ----------

const esquemaAsignaturaNueva = z.object({
  nombre: z.string().min(3).max(60),
});

export async function agregarAsignaturaPersonalizada(datos: z.infer<typeof esquemaAsignaturaNueva>) {
  const validacion = esquemaAsignaturaNueva.safeParse(datos);
  if (!validacion.success) return { error: "El nombre debe tener entre 3 y 60 caracteres." };

  const contexto = await verificarDirectivo();
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, institucionId } = contexto;

  const nombre = validacion.data.nombre.trim();

  // Si ya existe en el catálogo (de esta u otra institución), se reutiliza.
  const { data: existente } = await supabase
    .from("asignaturas")
    .select("id")
    .ilike("nombre", nombre)
    .maybeSingle();

  let asignaturaId = existente?.id ?? null;
  if (!asignaturaId) {
    // Código derivado del nombre; con sufijo aleatorio para evitar colisiones.
    const base = nombre
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase()
      .slice(0, 5);
    const codigo = `${base || "ASIG"}${Math.floor(10 + Math.random() * 90)}`;
    const { data: nueva, error } = await supabase
      .from("asignaturas")
      .insert({ codigo, nombre, es_principal: false })
      .select("id")
      .single();
    if (error || !nueva) return { error: `No se pudo crear la asignatura. (${error?.message})` };
    asignaturaId = nueva.id;
  }

  // Habilitarla de una vez para la institución.
  await supabase
    .from("institucion_asignaturas")
    .upsert({ institucion_id: institucionId, asignatura_id: asignaturaId });

  revalidatePath("/panel/institucion");
  return { ok: true as const, asignaturaId };
}
