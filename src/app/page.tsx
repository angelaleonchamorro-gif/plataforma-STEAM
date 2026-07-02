import Link from "next/link";

const FASES = [
  { nombre: "Socialización", desc: "El reto y las preguntas que despiertan la curiosidad" },
  { nombre: "Indagación", desc: "Desarrollo de destrezas del currículo con evaluación" },
  { nombre: "Diseño y plan de acción", desc: "Prototipo, materiales y proceso de construcción" },
  { nombre: "Prototipado", desc: "Manos a la obra: construcción del prototipo" },
  { nombre: "Pruebas y rediseño", desc: "Medir el desempeño y mejorar" },
  { nombre: "Divulgación", desc: "Artículo científico, exposición, carteles o videos" },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <nav className="glass sticky top-0 z-50 flex items-center justify-between px-8 py-4">
        <span className="text-lg font-bold text-white">
          EDINUN <span style={{ color: "var(--accent)" }}>STEAM</span>
        </span>
        <div className="flex gap-4">
          <Link
            href="/auth/login"
            className="rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:opacity-80"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/auth/registro"
            className="rounded-full px-5 py-2 text-sm font-semibold text-[#151E29] transition hover:brightness-95"
            style={{ background: "var(--accent)" }}
          >
            Crear cuenta
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-8 pt-24 pb-16 text-center">
        <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
          Proyectos <span className="gradient-text">STEAM</span> con el
          <br />
          currículo ecuatoriano
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg" style={{ color: "var(--text-muted)" }}>
          Selecciona las destrezas con criterios de desempeño, deja que la IA te
          proponga temas y planificaciones, y da seguimiento al trabajo de tus
          estudiantes en cada fase del proyecto.
        </p>
        <Link
          href="/auth/registro"
          className="mt-10 inline-block rounded-full px-8 py-3 font-semibold text-[#151E29] shadow-lg transition hover:brightness-95"
          style={{ background: "var(--accent)", boxShadow: "0 10px 30px var(--accent-shadow)" }}
        >
          Empezar ahora
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-8 pb-24">
        <h2 className="mb-8 text-center text-2xl font-bold">
          Las 6 fases del proyecto
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {FASES.map((fase, i) => (
            <div
              key={fase.nombre}
              className="rounded-2xl bg-white p-6 transition hover:-translate-y-1"
              style={{ border: "1px solid var(--border-light)", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
            >
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-[#151E29]"
                style={{ background: "var(--accent-bg)", color: "var(--accent-hover)" }}
              >
                {i + 1}
              </span>
              <h3 className="mt-3 font-semibold">{fase.nombre}</h3>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                {fase.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
