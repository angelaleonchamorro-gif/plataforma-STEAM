"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { eliminarProyecto } from "../../clases/actions";

interface Props {
  proyectoId: string;
  claseId: string;
  titulo: string | null;
  tieneEntregas: boolean;
}

export default function EliminarProyecto({ proyectoId, claseId, titulo, tieneEntregas }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  function eliminar() {
    const aviso = tieneEntregas
      ? "⚠️ Este proyecto YA TIENE ENTREGAS de estudiantes que se perderán para siempre."
      : "Se eliminará el proyecto con su planificación y actividades.";
    const confirmacion = prompt(
      `${aviso}\nEsta acción NO se puede deshacer.\n\nPara confirmar, escribe: ELIMINAR`,
    );
    if (confirmacion?.trim().toUpperCase() !== "ELIMINAR") return;

    setError(null);
    iniciarTransicion(async () => {
      const resultado = await eliminarProyecto(proyectoId);
      if ("error" in resultado && resultado.error) {
        setError(resultado.error);
      } else {
        router.push(`/panel/clases/${claseId}`);
        router.refresh();
      }
    });
  }

  return (
    <section className="mt-12 border-t pt-6" style={{ borderColor: "var(--border-light)" }}>
      {error && <div className="banner-error mb-4">{error}</div>}
      <button
        onClick={eliminar}
        disabled={pendiente}
        className="rounded-full border px-5 py-2 text-sm font-semibold transition disabled:opacity-50"
        style={{
          borderColor: "var(--color-error-border)",
          color: "var(--color-error)",
          background: "var(--color-error-bg)",
        }}
      >
        {pendiente ? "Eliminando…" : `🗑 Eliminar el proyecto${titulo ? ` "${titulo}"` : ""}`}
      </button>
    </section>
  );
}
