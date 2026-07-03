import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Portal del estudiante: sus clases.
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
            <Link
              key={clase.id}
              href={`/panel/estudiante/clases/${clase.id}`}
              className="rounded-2xl bg-white p-6 transition hover:-translate-y-1"
              style={{ border: "1px solid var(--border-light)", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
            >
              <h2 className="font-semibold">{clase.nombre}</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                {clase.grado}
              </p>
              <p className="mt-3 text-sm font-semibold" style={{ color: "var(--accent-hover)" }}>
                Ver proyectos →
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
