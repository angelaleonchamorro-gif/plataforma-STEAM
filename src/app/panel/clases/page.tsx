import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NuevaClaseForm from "./NuevaClaseForm";

// Hub del docente: sus clases.
export default async function ClasesPage() {
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
  if (!perfil || perfil.rol !== "docente") redirect("/panel");

  const { data: clases } = await supabase
    .from("clases")
    .select("id, nombre, grado, codigo_invitacion")
    .eq("docente_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-bold">Hola, {perfil.nombres}</h1>
      <p className="mt-1" style={{ color: "var(--text-muted)" }}>
        MIS CLASES
      </p>

      <NuevaClaseForm />

      {!clases?.length ? (
        <div
          className="mt-8 rounded-2xl bg-white p-10 text-center"
          style={{ border: "1px solid var(--border-light)" }}
        >
          <p className="font-semibold">Aún no tienes clases</p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Crea tu primera clase para empezar a generar proyectos STEAM.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {clases.map((clase) => (
            <Link
              key={clase.id}
              href={`/panel/clases/${clase.id}`}
              className="rounded-2xl p-6 text-white transition hover:-translate-y-1"
              style={{ background: "var(--primary-dark)", boxShadow: "0 6px 24px rgba(21,30,41,0.25)" }}
            >
              <h2 className="font-semibold">{clase.nombre}</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--text-dark-muted)" }}>
                {clase.grado}
              </p>
              <p className="mt-4 text-xs" style={{ color: "var(--text-dark-subtle)" }}>
                Código de clase:{" "}
                <span className="font-mono font-semibold" style={{ color: "var(--accent)" }}>
                  {clase.codigo_invitacion}
                </span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
