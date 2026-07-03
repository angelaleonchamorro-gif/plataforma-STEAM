"use client";

import { useState, useTransition } from "react";
import { guardarConfiguracion } from "./actions";

const FRECUENCIAS = [
  { valor: "mensual", nombre: "Mensual" },
  { valor: "bimestral", nombre: "Bimestral" },
  { valor: "trimestral", nombre: "Trimestral" },
  { valor: "quimestral", nombre: "Quimestral" },
  { valor: "semestral", nombre: "Semestral" },
  { valor: "anual", nombre: "Anual" },
] as const;

type Frecuencia = (typeof FRECUENCIAS)[number]["valor"];

interface Asignatura {
  id: string;
  codigo: string;
  nombre: string;
  es_principal: boolean;
}

interface Props {
  frecuenciaInicial: string;
  duracionInicial: number;
  asignaturas: Asignatura[];
  habilitadasIniciales: string[];
}

export default function ConfigInstitucional({
  frecuenciaInicial,
  duracionInicial,
  asignaturas,
  habilitadasIniciales,
}: Props) {
  const [editando, setEditando] = useState(false);
  const [frecuencia, setFrecuencia] = useState(frecuenciaInicial);
  const [duracion, setDuracion] = useState(duracionInicial);
  // Si aún no hay asignaturas habilitadas, pre-marcar las 5 principales STEAM.
  const [habilitadas, setHabilitadas] = useState<Set<string>>(
    new Set(
      habilitadasIniciales.length
        ? habilitadasIniciales
        : asignaturas.filter((a) => a.es_principal).map((a) => a.id),
    ),
  );
  const [banner, setBanner] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [guardando, iniciarGuardado] = useTransition();

  const principales = asignaturas.filter((a) => a.es_principal);
  const conexiones = asignaturas.filter((a) => !a.es_principal);

  function alternarAsignatura(id: string) {
    setHabilitadas((previas) => {
      const nuevas = new Set(previas);
      if (nuevas.has(id)) nuevas.delete(id);
      else nuevas.add(id);
      return nuevas;
    });
  }

  function guardar() {
    setBanner(null);
    iniciarGuardado(async () => {
      const resultado = await guardarConfiguracion({
        frecuencia: frecuencia as Frecuencia,
        duracionMeses: duracion,
        asignaturaIds: [...habilitadas],
      });
      if ("error" in resultado && resultado.error) {
        setBanner({ tipo: "error", texto: resultado.error });
      } else {
        setBanner({ tipo: "exito", texto: "Configuración guardada correctamente." });
        setEditando(false);
      }
    });
  }

  const nombreFrecuencia =
    FRECUENCIAS.find((f) => f.valor === frecuencia)?.nombre ?? "Sin definir";

  return (
    <div className="mt-8">
      {banner && (
        <div className={`mb-5 ${banner.tipo === "exito" ? "banner-exito" : "banner-error"}`}>
          {banner.texto}
        </div>
      )}

      {!editando ? (
        <>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-6" style={{ border: "1px solid var(--border-light)" }}>
              <h2 className="text-xs font-semibold tracking-wide" style={{ color: "var(--text-muted)" }}>
                FRECUENCIA DE PROYECTOS
              </h2>
              <p className="mt-2 text-2xl font-bold">{nombreFrecuencia}</p>
            </div>
            <div className="rounded-2xl bg-white p-6" style={{ border: "1px solid var(--border-light)" }}>
              <h2 className="text-xs font-semibold tracking-wide" style={{ color: "var(--text-muted)" }}>
                DURACIÓN POR PROYECTO
              </h2>
              <p className="mt-2 text-2xl font-bold">
                {duracion} {duracion === 1 ? "mes" : "meses"}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6" style={{ border: "1px solid var(--border-light)" }}>
              <h2 className="text-xs font-semibold tracking-wide" style={{ color: "var(--text-muted)" }}>
                ASIGNATURAS HABILITADAS
              </h2>
              <p className="mt-2 text-2xl font-bold">{habilitadas.size}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-white p-6" style={{ border: "1px solid var(--border-light)" }}>
            <h2 className="text-xs font-semibold tracking-wide" style={{ color: "var(--text-muted)" }}>
              ASIGNATURAS QUE INTERVIENEN EN LOS PROYECTOS
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {asignaturas
                .filter((a) => habilitadas.has(a.id))
                .map((a) => (
                  <span
                    key={a.id}
                    className="rounded-full px-3 py-1 text-sm font-medium"
                    style={{
                      background: a.es_principal ? "var(--accent-bg)" : "var(--surface-bg-light)",
                      color: a.es_principal ? "var(--accent-hover)" : "var(--text-primary)",
                      border: `1px solid ${a.es_principal ? "var(--accent-border)" : "var(--border-light-md)"}`,
                    }}
                  >
                    {a.nombre}
                  </span>
                ))}
            </div>
          </div>

          <button
            onClick={() => {
              setBanner(null);
              setEditando(true);
            }}
            className="mt-6 rounded-full px-6 py-2.5 font-semibold text-[#151E29] transition hover:brightness-95"
            style={{ background: "var(--accent)" }}
          >
            Editar configuración
          </button>
        </>
      ) : (
        <div className="rounded-2xl bg-white p-6" style={{ border: "1px solid var(--border-light)" }}>
          <div className="grid gap-6 md:grid-cols-2">
            <label className="text-sm font-medium">
              Frecuencia de proyectos
              <select
                value={frecuencia}
                onChange={(e) => setFrecuencia(e.target.value)}
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 outline-none focus:border-[#F69E26]"
                style={{ borderColor: "var(--border-light-md)" }}
              >
                {FRECUENCIAS.map((f) => (
                  <option key={f.valor} value={f.valor}>
                    {f.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium">
              Duración de cada proyecto: <span style={{ color: "var(--accent-hover)" }}>{duracion} {duracion === 1 ? "mes" : "meses"}</span>
              <input
                type="range"
                min={1}
                max={9}
                value={duracion}
                onChange={(e) => setDuracion(Number(e.target.value))}
                className="mt-3 w-full accent-[#F69E26]"
              />
              <span className="flex justify-between text-xs font-normal" style={{ color: "var(--text-subtle)" }}>
                <span>1 mes</span>
                <span>9 meses</span>
              </span>
            </label>
          </div>

          <h3 className="mt-8 text-sm font-semibold">Asignaturas principales STEAM</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {principales.map((a) => (
              <label
                key={a.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 text-sm"
                style={{
                  borderColor: habilitadas.has(a.id) ? "var(--accent-border-strong)" : "var(--border-light-md)",
                  background: habilitadas.has(a.id) ? "var(--accent-bg-subtle)" : "transparent",
                }}
              >
                <input
                  type="checkbox"
                  checked={habilitadas.has(a.id)}
                  onChange={() => alternarAsignatura(a.id)}
                  className="accent-[#F69E26]"
                />
                {a.nombre}
              </label>
            ))}
          </div>

          <h3 className="mt-6 text-sm font-semibold">
            Otras asignaturas (conexiones)
            <span className="ml-2 font-normal" style={{ color: "var(--text-subtle)" }}>
              los docentes podrán añadir destrezas de estas asignaturas a sus proyectos
            </span>
          </h3>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {conexiones.map((a) => (
              <label
                key={a.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 text-sm"
                style={{
                  borderColor: habilitadas.has(a.id) ? "var(--accent-border-strong)" : "var(--border-light-md)",
                  background: habilitadas.has(a.id) ? "var(--accent-bg-subtle)" : "transparent",
                }}
              >
                <input
                  type="checkbox"
                  checked={habilitadas.has(a.id)}
                  onChange={() => alternarAsignatura(a.id)}
                  className="accent-[#F69E26]"
                />
                {a.nombre}
              </label>
            ))}
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={guardar}
              disabled={guardando || habilitadas.size === 0}
              className="rounded-full px-6 py-2.5 font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              {guardando ? "Guardando…" : "Guardar configuración"}
            </button>
            <button
              onClick={() => {
                setEditando(false);
                setBanner(null);
              }}
              disabled={guardando}
              className="rounded-full border px-6 py-2.5 font-semibold transition hover:bg-black/5"
              style={{ borderColor: "var(--border-light-strong)" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
