"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ETIQUETA_ROL: Record<string, string> = {
  directivo: "Directivo",
  docente: "Docente",
  estudiante: "Estudiante",
};

export default function NavbarPanel({
  nombres,
  rol,
}: {
  nombres: string;
  rol: string;
}) {
  const router = useRouter();

  async function cerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="glass sticky top-0 z-50 flex items-center justify-between px-8 py-4 print:hidden">
      <Link href="/panel" className="text-lg font-bold text-white">
        EDINUN <span style={{ color: "var(--accent)" }}>STEAM</span>
      </Link>
      <div className="flex items-center gap-5">
        <span className="text-sm" style={{ color: "var(--text-dark-muted)" }}>
          {nombres} · {ETIQUETA_ROL[rol] ?? rol}
        </span>
        <button
          onClick={cerrarSesion}
          className="rounded-full border px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10"
          style={{ borderColor: "var(--border-dark-strong)" }}
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}
