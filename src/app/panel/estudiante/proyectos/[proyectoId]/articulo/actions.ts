"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SECCIONES_ARTICULO } from "@/lib/articulo";

const esquemaArticulo = z.object({
  proyectoId: z.string().uuid(),
  secciones: z.record(z.string(), z.string().max(10000)),
  entregar: z.boolean(),
});

export async function guardarArticulo(datos: z.infer<typeof esquemaArticulo>) {
  const validacion = esquemaArticulo.safeParse(datos);
  if (!validacion.success) return { error: "Revisa el contenido del artículo." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Vuelve a iniciar sesión." };

  // RLS: el proyecto solo es visible si el estudiante está matriculado.
  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("id, estado")
    .eq("id", validacion.data.proyectoId)
    .maybeSingle();
  if (!proyecto || proyecto.estado === "definicion" || proyecto.estado === "planificacion") {
    return { error: "Este proyecto no está disponible." };
  }

  // Solo se guardan las claves conocidas de la plantilla IMRD.
  const clavesValidas = new Set(SECCIONES_ARTICULO.map((s) => s.clave));
  const secciones = Object.fromEntries(
    Object.entries(validacion.data.secciones).filter(([clave]) => clavesValidas.has(clave)),
  );

  if (validacion.data.entregar) {
    const titulo = (secciones["titulo"] ?? "").trim();
    const resumen = (secciones["resumen"] ?? "").trim();
    if (!titulo || !resumen) {
      return { error: "Para entregar, el artículo necesita al menos título y resumen." };
    }
  }

  const { error } = await supabase.from("articulos_cientificos").upsert(
    {
      proyecto_id: proyecto.id,
      estudiante_id: user.id,
      secciones,
      estado: validacion.data.entregar ? "entregada" : "en_progreso",
      entregado_at: validacion.data.entregar ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "proyecto_id,estudiante_id" },
  );
  if (error) return { error: "No se pudo guardar el artículo." };

  revalidatePath(`/panel/estudiante/proyectos/${proyecto.id}/articulo`);
  return { ok: true as const };
}
