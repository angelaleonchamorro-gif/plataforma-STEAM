import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Portal del estudiante: sus clases y, dentro de cada una, las actividades
// publicadas del proyecto.
export default async function EstudiantePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, nombres")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil || perfil.rol !== "estudiante") redirect("/panel");

  const { data: matriculas } = await supabase
    .from("clase_estudiantes")
    .select("clase_id")
    .eq("estudiante_id", user.id);

  const { data: clases } = matriculas?.length
    ? await supabase
        .from("clases")
        .select("id, nombre, grado")
        .in("id", matriculas.map((m) => m.clase_id))
    : { data: [] };

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-bold">Hola, {perfil.nombres}</h1>
      <p className="mt-1" style={{ color: "var(--text-muted)" }}>
        MIS CLASES
      </p>

      {!clases?.length ? (
        <div
          className="mt-10 rounded-2xl bg-white p-10 text-center"
          style={{ border: "1px solid var(--border-light)" }}
        >
          <p className="font-semibold">Todavía no estás en ninguna clase</p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Pide a tu docente el código de clase para unirte.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {clases.map((clase) => (
            <div
              key={clase.id}
              className="rounded-2xl bg-white p-6"
              style={{ border: "1px solid var(--border-light)" }}
            >
              <h2 className="font-semibold">{clase.nombre}</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                {clase.grado}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-sm" style={{ color: "var(--text-subtle)" }}>
        Las actividades del proyecto aparecerán aquí cuando tu docente las publique.
      </p>
    </main>
  );
}
