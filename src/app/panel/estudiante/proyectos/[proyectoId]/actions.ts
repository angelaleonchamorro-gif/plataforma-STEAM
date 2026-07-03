"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const esquemaEntrega = z.object({
  actividadId: z.string().uuid(),
  contenido: z.string().max(8000),
  evidenciaPath: z.string().max(500).nullable(),
});

async function contextoEstudiante(actividadId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Vuelve a iniciar sesión." as const };

  // La RLS solo devuelve la actividad si está PUBLICADA y el estudiante está
  // matriculado en la clase del proyecto — es el guard de acceso.
  const { data: actividad } = await supabase
    .from("actividades")
    .select("id, proyecto_id, publicada")
    .eq("id", actividadId)
    .maybeSingle();
  if (!actividad || !actividad.publicada) {
    return { error: "Esta actividad no está disponible." as const };
  }
  return { supabase, user, actividad };
}

// Trazabilidad fina: fire-and-forget, nunca bloquea el flujo del estudiante.
function registrarEvento(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actividadId: string,
  estudianteId: string,
  tipoEvento: string,
) {
  void supabase
    .from("eventos_actividad")
    .insert({ actividad_id: actividadId, estudiante_id: estudianteId, tipo_evento: tipoEvento })
    .then(
      () => undefined,
      () => undefined,
    );
}

export async function guardarAvance(datos: z.infer<typeof esquemaEntrega>) {
  const validacion = esquemaEntrega.safeParse(datos);
  if (!validacion.success) return { error: "Revisa el contenido de tu avance." };

  const contexto = await contextoEstudiante(validacion.data.actividadId);
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, user, actividad } = contexto;

  const { error } = await supabase.from("entregas").upsert(
    {
      actividad_id: actividad.id,
      estudiante_id: user.id,
      estado: "en_progreso",
      contenido: validacion.data.contenido,
      evidencia_url: validacion.data.evidenciaPath,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "actividad_id,estudiante_id" },
  );
  if (error) return { error: "No se pudo guardar tu avance." };

  registrarEvento(supabase, actividad.id, user.id, "guardo_avance");
  revalidatePath(`/panel/estudiante/proyectos/${actividad.proyecto_id}`);
  return { ok: true as const };
}

export async function entregarActividad(datos: z.infer<typeof esquemaEntrega>) {
  const validacion = esquemaEntrega.safeParse(datos);
  if (!validacion.success) return { error: "Revisa el contenido de tu entrega." };
  if (!validacion.data.contenido.trim() && !validacion.data.evidenciaPath) {
    return { error: "Escribe tu respuesta o adjunta una evidencia antes de entregar." };
  }

  const contexto = await contextoEstudiante(validacion.data.actividadId);
  if ("error" in contexto) return { error: contexto.error };
  const { supabase, user, actividad } = contexto;

  const { error } = await supabase.from("entregas").upsert(
    {
      actividad_id: actividad.id,
      estudiante_id: user.id,
      estado: "entregada",
      contenido: validacion.data.contenido,
      evidencia_url: validacion.data.evidenciaPath,
      entregada_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "actividad_id,estudiante_id" },
  );
  if (error) return { error: "No se pudo registrar tu entrega." };

  registrarEvento(supabase, actividad.id, user.id, "entrego");
  revalidatePath(`/panel/estudiante/proyectos/${actividad.proyecto_id}`);
  return { ok: true as const };
}
