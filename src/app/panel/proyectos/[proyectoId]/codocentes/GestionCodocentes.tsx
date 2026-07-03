"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { invitarCodocente, quitarCodocente } from "./actions";

interface Docente {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
}

interface Codocente {
  docente_id: string;
  asignatura_id: string | null;
}

interface Asignatura {
  id: string;
  nombre: string;
}

interface Props {
  proyectoId: string;
  docentes: Docente[];
  codocentes: Codocente[];
  asignaturas: Asignatura[];
}

export default function GestionCodocentes({ proyectoId, docentes, codocentes, asignaturas }: Props) {
  const router = useRouter();
  const [docenteSeleccionado, setDocenteSeleccionado] = useState("");
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState("");
  const [banner, setBanner] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  const idsCodocentes = new Set(codocentes.map((c) => c.docente_id));
  const invitables = docentes.filter((d) => !idsCodocentes.has(d.id));
  const nombreAsignatura = (id: string | null) =>
    asignaturas.find((a) => a.id === id)?.nombre ?? null;

  function invitar() {
    if (!docenteSeleccionado) return;
    setBanner(null);
    iniciarTransicion(async () => {
      const resultado = await invitarCodocente({
        proyectoId,
        docenteId: docenteSeleccionado,
        asignaturaId: asignaturaSeleccionada || null,
      });
      if ("error" in resultado && resultado.error) {
        setBanner({ tipo: "error", texto: resultado.error });
      } else {
        setBanner({
          tipo: "exito",
          texto: "Co-docente invitado: el proyecto ya le aparece en su panel, en 'Proyectos compartidos conmigo'.",
        });
        setDocenteSeleccionado("");
        setAsignaturaSeleccionada("");
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-8">
      {banner && (
        <div className={`mb-5 ${banner.tipo === "exito" ? "banner-exito" : "banner-error"}`}>
          {banner.texto}
        </div>
      )}

      <div className="rounded-2xl bg-white p-6" style={{ border: "1px solid var(--border-light)" }}>
        <h2 className="font-semibold">Invitar a un colega</h2>
        {invitables.length === 0 ? (
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            No hay más docentes registrados en tu institución para invitar. Comparte el código AMIE
            para que tus colegas se registren.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-3">
            <select
              value={docenteSeleccionado}
              onChange={(e) => setDocenteSeleccionado(e.target.value)}
              className="min-w-64 rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[#F69E26]"
              style={{ borderColor: "var(--border-light-md)" }}
            >
              <option value="">Selecciona al docente…</option>
              {invitables.map((docente) => (
                <option key={docente.id} value={docente.id}>
                  {docente.apellidos} {docente.nombres} ({docente.email})
                </option>
              ))}
            </select>
            <select
              value={asignaturaSeleccionada}
              onChange={(e) => setAsignaturaSeleccionada(e.target.value)}
              className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[#F69E26]"
              style={{ borderColor: "var(--border-light-md)" }}
            >
              <option value="">Asignatura que cubre (opcional)</option>
              {asignaturas.map((asignatura) => (
                <option key={asignatura.id} value={asignatura.id}>
                  {asignatura.nombre}
                </option>
              ))}
            </select>
            <button
              onClick={invitar}
              disabled={pendiente || !docenteSeleccionado}
              className="rounded-full px-6 py-2 text-sm font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              {pendiente ? "Invitando…" : "Invitar"}
            </button>
          </div>
        )}
      </div>

      <h2 className="mt-8 text-lg font-bold">Co-docentes del proyecto ({codocentes.length})</h2>
      {codocentes.length === 0 ? (
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Aún no has invitado a nadie.
        </p>
      ) : (
        <div className="mt-3 rounded-2xl bg-white" style={{ border: "1px solid var(--border-light)" }}>
          {codocentes.map((codocente, i) => {
            const docente = docentes.find((d) => d.id === codocente.docente_id);
            return (
              <div
                key={codocente.docente_id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
                style={i > 0 ? { borderTop: "1px solid var(--border-light)" } : undefined}
              >
                <span className="text-sm font-medium">
                  {docente ? `${docente.apellidos} ${docente.nombres}` : "Docente"}
                  {nombreAsignatura(codocente.asignatura_id) && (
                    <span
                      className="ml-2 rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ background: "rgba(59,130,246,0.1)", color: "#2563eb" }}
                    >
                      {nombreAsignatura(codocente.asignatura_id)}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => {
                    if (confirm("¿Quitar a este co-docente del proyecto? Sus calificaciones ya registradas se conservan.")) {
                      iniciarTransicion(async () => {
                        const resultado = await quitarCodocente(proyectoId, codocente.docente_id);
                        if ("error" in resultado && resultado.error) {
                          setBanner({ tipo: "error", texto: resultado.error });
                        } else {
                          router.refresh();
                        }
                      });
                    }
                  }}
                  disabled={pendiente}
                  className="text-xs font-semibold"
                  style={{ color: "var(--color-error)" }}
                >
                  Quitar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
