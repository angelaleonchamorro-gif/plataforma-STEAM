"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  crearEquipo,
  eliminarEquipo,
  asignarMiembro,
  actualizarRol,
  quitarMiembro,
} from "./actions";

const ROLES_SUGERIDOS = [
  "Coordinador/a",
  "Investigador/a",
  "Diseñador/a",
  "Constructor/a",
  "Comunicador/a",
];

interface Estudiante {
  id: string;
  nombres: string;
  apellidos: string;
}

interface Equipo {
  id: string;
  nombre: string;
}

interface Miembro {
  equipo_id: string;
  estudiante_id: string;
  rol: string | null;
}

interface Props {
  proyectoId: string;
  estudiantes: Estudiante[];
  equipos: Equipo[];
  miembros: Miembro[];
}

export default function GestionEquipos({ proyectoId, estudiantes, equipos, miembros }: Props) {
  const router = useRouter();
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [banner, setBanner] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  const equipoDeEstudiante = new Map(miembros.map((m) => [m.estudiante_id, m]));
  const sinEquipo = estudiantes.filter((e) => !equipoDeEstudiante.has(e.id));

  function ejecutar(accion: () => Promise<{ error?: string } | { ok: true }>) {
    setBanner(null);
    iniciarTransicion(async () => {
      const resultado = await accion();
      if ("error" in resultado && resultado.error) {
        setBanner({ tipo: "error", texto: resultado.error });
      } else {
        router.refresh();
      }
    });
  }

  function crear(e: React.FormEvent) {
    e.preventDefault();
    if (nombreNuevo.trim().length < 2) return;
    ejecutar(() => crearEquipo({ proyectoId, nombre: nombreNuevo.trim() }));
    setNombreNuevo("");
  }

  return (
    <div className="mt-8">
      {banner && (
        <div className={`mb-5 ${banner.tipo === "exito" ? "banner-exito" : "banner-error"}`}>
          {banner.texto}
        </div>
      )}

      <form onSubmit={crear} className="flex flex-wrap gap-3">
        <input
          value={nombreNuevo}
          onChange={(e) => setNombreNuevo(e.target.value)}
          placeholder="Nombre del equipo (ej. Los Innovadores)"
          className="w-full max-w-sm rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#F69E26]"
          style={{ borderColor: "var(--border-light-md)" }}
        />
        <button
          type="submit"
          disabled={pendiente || nombreNuevo.trim().length < 2}
          className="rounded-full px-6 py-2 text-sm font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          + Crear equipo
        </button>
      </form>

      <datalist id="roles-sugeridos">
        {ROLES_SUGERIDOS.map((rol) => (
          <option key={rol} value={rol} />
        ))}
      </datalist>

      {equipos.length === 0 ? (
        <div
          className="mt-6 rounded-2xl bg-white p-8 text-center"
          style={{ border: "1px solid var(--border-light)" }}
        >
          <p className="font-semibold">Aún no hay equipos</p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Crea el primero y asigna a los estudiantes con su rol.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {equipos.map((equipo) => {
            const integrantes = miembros
              .filter((m) => m.equipo_id === equipo.id)
              .map((m) => ({
                ...m,
                perfil: estudiantes.find((e) => e.id === m.estudiante_id),
              }))
              .filter((m) => m.perfil);
            return (
              <div
                key={equipo.id}
                className="rounded-2xl bg-white p-5"
                style={{ border: "1px solid var(--border-light)" }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-bold">{equipo.nombre}</h2>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar el equipo "${equipo.nombre}"? Sus integrantes quedarán sin equipo.`)) {
                        ejecutar(() => eliminarEquipo(proyectoId, equipo.id));
                      }
                    }}
                    disabled={pendiente}
                    className="text-xs font-semibold"
                    style={{ color: "var(--color-error)" }}
                  >
                    Eliminar
                  </button>
                </div>

                {integrantes.length === 0 && (
                  <p className="mt-2 text-sm" style={{ color: "var(--text-subtle)" }}>
                    Sin integrantes todavía.
                  </p>
                )}

                {integrantes.map((miembro) => (
                  <div key={miembro.estudiante_id} className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="min-w-40 text-sm font-medium">
                      {miembro.perfil!.apellidos} {miembro.perfil!.nombres}
                    </span>
                    <input
                      list="roles-sugeridos"
                      defaultValue={miembro.rol ?? ""}
                      placeholder="Rol (ej. Coordinador/a)"
                      onBlur={(e) => {
                        const rol = e.target.value.trim() || null;
                        if (rol !== (miembro.rol ?? null)) {
                          ejecutar(() =>
                            actualizarRol({
                              proyectoId,
                              equipoId: equipo.id,
                              estudianteId: miembro.estudiante_id,
                              rol,
                            }),
                          );
                        }
                      }}
                      className="w-44 rounded-lg border px-2 py-1 text-xs outline-none focus:border-[#F69E26]"
                      style={{ borderColor: "var(--border-light-md)" }}
                    />
                    <button
                      onClick={() => ejecutar(() => quitarMiembro(proyectoId, equipo.id, miembro.estudiante_id))}
                      disabled={pendiente}
                      className="text-xs font-semibold"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mt-8 text-lg font-bold">
        Sin equipo ({sinEquipo.length})
      </h2>
      {sinEquipo.length === 0 ? (
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Todos los estudiantes tienen equipo. 🎉
        </p>
      ) : (
        <div className="mt-3 rounded-2xl bg-white" style={{ border: "1px solid var(--border-light)" }}>
          {sinEquipo.map((estudiante, i) => (
            <div
              key={estudiante.id}
              className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
              style={i > 0 ? { borderTop: "1px solid var(--border-light)" } : undefined}
            >
              <span className="text-sm font-medium">
                {estudiante.apellidos} {estudiante.nombres}
              </span>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    ejecutar(() =>
                      asignarMiembro({
                        proyectoId,
                        equipoId: e.target.value,
                        estudianteId: estudiante.id,
                        rol: null,
                      }),
                    );
                  }
                }}
                disabled={pendiente || equipos.length === 0}
                className="rounded-lg border bg-white px-3 py-1.5 text-sm outline-none focus:border-[#F69E26]"
                style={{ borderColor: "var(--border-light-md)" }}
              >
                <option value="">Asignar a equipo…</option>
                {equipos.map((equipo) => (
                  <option key={equipo.id} value={equipo.id}>
                    {equipo.nombre}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
