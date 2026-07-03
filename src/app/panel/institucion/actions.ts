"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const esquemaConfig = z.object({
  frecuencia: z.enum(["mensual", "bimestral", "trimestral", "quimestral", "semestral", "anual"]),
  duracionMeses: z.number().int().min(1).max(9),
  asignaturaIds: z.array(z.string().uuid()).min(1),
});

export type DatosConfig = z.infer<typeof esquemaConfig>;

export async function guardarConfiguracion(datos: DatosConfig) {
  const validacion = esquemaConfig.safeParse(datos);
  if (!validacion.success) {
    return { error: "Datos inválidos. Revisa la duración (1 a 9 meses) y selecciona al menos una asignatura." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Vuelve a iniciar sesión." };

  // Zero Trust: rol e institución se resuelven en servidor; además la RLS
  // solo permite escribir estas tablas al directivo de su institución.
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, institucion_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil || perfil.rol !== "directivo" || !perfil.institucion_id) {
    return { error: "Solo el directivo puede editar la configuración institucional." };
  }

  const { frecuencia, duracionMeses, asignaturaIds } = validacion.data;

  const { error: errorConfig } = await supabase.from("configuracion_institucional").upsert({
    institucion_id: perfil.institucion_id,
    frecuencia_proyectos: frecuencia,
    duracion_meses: duracionMeses,
    actualizado_por: user.id,
    updated_at: new Date().toISOString(),
  });
  if (errorConfig) return { error: "No se pudo guardar la configuración." };

  // Reemplazar el set de asignaturas habilitadas.
  const { error: errorBorrado } = await supabase
    .from("institucion_asignaturas")
    .delete()
    .eq("institucion_id", perfil.institucion_id);
  if (errorBorrado) return { error: "No se pudieron actualizar las asignaturas." };

  const { error: errorInsercion } = await supabase.from("institucion_asignaturas").insert(
    asignaturaIds.map((asignaturaId) => ({
      institucion_id: perfil.institucion_id!,
      asignatura_id: asignaturaId,
    })),
  );
  if (errorInsercion) return { error: "No se pudieron guardar las asignaturas." };

  revalidatePath("/panel/institucion");
  return { ok: true as const };
}
