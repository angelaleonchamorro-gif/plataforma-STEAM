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

  // Proyectos donde soy co-docente (invitaciones de colegas).
  const { data: invitaciones } = await supabase
    .from("proyecto_docentes")
    .select("proyecto_id")
    .eq("docente_id", user.id);
  const { data: compartidos } = invitaciones?.length
    ? await supabase
        .from("proyectos")
        .select("id, titulo, estado, clase_id")
        .in("id", invitaciones.map((i) => i.proyecto_id))
    : { data: [] };
  const { data: clasesCompartidas } = compartidos?.length
    ? await supabase
        .from("clases")
        .select("id, nombre, grado")
        .in("id", compartidos.map((p) => p.clase_id))
    : { data: [] };

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

      {(compartidos?.length ?? 0) > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold">🤝 Proyectos compartidos conmigo</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Proyectos interdisciplinarios donde participas como co-docente: revisa la información
            del proyecto y sus actividades, mira el muro, da seguimiento y califica.
          </p>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            {compartidos!.map((proyecto) => {
              const clase = (clasesCompartidas ?? []).find((c) => c.id === proyecto.clase_id);
              return (
                <Link
                  key={proyecto.id}
                  href={`/panel/proyectos/${proyecto.id}`}
                  className="rounded-2xl bg-white p-6 transition hover:-translate-y-1"
                  style={{ border: "1px solid var(--accent-border)", background: "var(--accent-bg-subtle)" }}
                >
                  <h3 className="font-semibold">{proyecto.titulo ?? "Proyecto en definición"}</h3>
                  <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                    {clase ? `${clase.nombre} · ${clase.grado}` : ""}
                  </p>
                  <p className="mt-3 text-sm font-semibold" style={{ color: "var(--accent-hover)" }}>
                    Ver proyecto →
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
