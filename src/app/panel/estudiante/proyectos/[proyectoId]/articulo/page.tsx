import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { subnivelDeGrado } from "@/lib/curriculo";
import type { SeccionesArticulo } from "@/lib/articulo";
import EditorArticulo from "./EditorArticulo";

export default async function ArticuloPage({
  params,
}: {
  params: Promise<{ proyectoId: string }>;
}) {
  const { proyectoId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("id, clase_id, titulo, reto, estado")
    .eq("id", proyectoId)
    .maybeSingle();
  if (!proyecto || proyecto.estado === "definicion" || proyecto.estado === "planificacion") {
    redirect("/panel/estudiante");
  }

  // El artículo científico es el producto de divulgación de BACHILLERATO.
  const { data: clase } = await supabase
    .from("clases")
    .select("grado")
    .eq("id", proyecto.clase_id)
    .maybeSingle();
  if (!clase || subnivelDeGrado(clase.grado) !== "BGU") {
    redirect(`/panel/estudiante/proyectos/${proyecto.id}`);
  }

  const { data: articulo } = await supabase
    .from("articulos_cientificos")
    .select("secciones, estado, retroalimentacion, calificacion")
    .eq("proyecto_id", proyecto.id)
    .eq("estudiante_id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/panel/estudiante/proyectos/${proyecto.id}`}
        className="text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        ← {proyecto.titulo}
      </Link>
      <h1 className="mt-2 text-3xl font-bold">📄 Mi artículo científico</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
        El producto final de tu proyecto: comunica tu investigación con la estructura de un
        artículo científico real (introducción, métodos, resultados y discusión).
      </p>

      <EditorArticulo
        proyectoId={proyecto.id}
        seccionesIniciales={(articulo?.secciones as SeccionesArticulo) ?? {}}
        estado={articulo?.estado ?? "pendiente"}
        retroalimentacion={articulo?.retroalimentacion ?? null}
        calificacion={articulo?.calificacion ?? null}
      />
    </main>
  );
}
