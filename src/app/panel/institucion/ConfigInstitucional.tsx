"use client";

import { useState, useTransition } from "react";
import {
  guardarConfiguracionSubnivel,
  guardarAsignaturas,
  agregarAsignaturaPersonalizada,
} from "./actions";

const FRECUENCIAS = [
  { valor: "mensual", nombre: "Mensual" },
  { valor: "bimestral", nombre: "Bimestral" },
  { valor: "trimestral", nombre: "Trimestral" },
  { valor: "quimestral", nombre: "Quimestral" },
  { valor: "semestral", nombre: "Semestral" },
  { valor: "anual", nombre: "Anual" },
] as const;

type Frecuencia = (typeof FRECUENCIAS)[number]["valor"];
type Subnivel = "Elemental" | "Media" | "Superior" | "BGU";

const SUBNIVELES: { valor: Subnivel; nombre: string; grados: string }[] = [
  { valor: "Elemental", nombre: "Básica Elemental", grados: "2do a 4to EGB" },
  { valor: "Media", nombre: "Básica Media", grados: "5to a 7mo EGB" },
  { valor: "Superior", nombre: "Básica Superior", grados: "8vo a 10mo EGB" },
  { valor: "BGU", nombre: "Bachillerato", grados: "1ero a 3ero BGU" },
];

interface ConfigSubnivel {
  frecuencia: string;
  duracionMeses: number;
}

interface Asignatura {
  id: string;
  codigo: string;
  nombre: string;
  es_principal: boolean;
}

interface Props {
  configInicial: Record<string, ConfigSubnivel>;
  asignaturas: Asignatura[];
  habilitadasIniciales: string[];
}

export default function ConfigInstitucional({
  configInicial,
  asignaturas,
  habilitadasIniciales,
}: Props) {
  const [config, setConfig] = useState<Record<string, ConfigSubnivel>>(() => {
    const base: Record<string, ConfigSubnivel> = {};
    for (const s of SUBNIVELES) {
      base[s.valor] = configInicial[s.valor] ?? { frecuencia: "trimestral", duracionMeses: 3 };
    }
    return base;
  });
  const [editando, setEditando] = useState<Subnivel | null>(null);
  const [habilitadas, setHabilitadas] = useState<Set<string>>(
    new Set(
      habilitadasIniciales.length
        ? habilitadasIniciales
        : asignaturas.filter((a) => a.es_principal).map((a) => a.id),
    ),
  );
  const [editandoAsignaturas, setEditandoAsignaturas] = useState(false);
  const [nuevaAsignatura, setNuevaAsignatura] = useState("");
  const [banner, setBanner] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [guardando, iniciarGuardado] = useTransition();

  const principales = asignaturas.filter((a) => a.es_principal);
  const conexiones = asignaturas.filter((a) => !a.es_principal);

  function actualizarSubnivel(subnivel: Subnivel, cambios: Partial<ConfigSubnivel>) {
    setConfig((previa) => ({ ...previa, [subnivel]: { ...previa[subnivel], ...cambios } }));
  }

  function guardarSubnivel(subnivel: Subnivel) {
    setBanner(null);
    iniciarGuardado(async () => {
      const datos = config[subnivel];
      const resultado = await guardarConfiguracionSubnivel({
        subnivel,
        frecuencia: datos.frecuencia as Frecuencia,
        duracionMeses: datos.duracionMeses,
      });
      if ("error" in resultado && resultado.error) {
        setBanner({ tipo: "error", texto: resultado.error });
      } else {
        setBanner({
          tipo: "exito",
          texto: `Configuración de ${SUBNIVELES.find((s) => s.valor === subnivel)?.nombre} guardada.`,
        });
        setEditando(null);
      }
    });
  }

  function alternarAsignatura(id: string) {
    setHabilitadas((previas) => {
      const nuevas = new Set(previas);
      if (nuevas.has(id)) nuevas.delete(id);
      else nuevas.add(id);
      return nuevas;
    });
  }

  function guardarSeleccionAsignaturas() {
    setBanner(null);
    iniciarGuardado(async () => {
      const resultado = await guardarAsignaturas({ asignaturaIds: [...habilitadas] });
      if ("error" in resultado && resultado.error) {
        setBanner({ tipo: "error", texto: resultado.error });
      } else {
        setBanner({ tipo: "exito", texto: "Asignaturas guardadas." });
        setEditandoAsignaturas(false);
      }
    });
  }

  function crearAsignatura() {
    if (nuevaAsignatura.trim().length < 3) return;
    setBanner(null);
    iniciarGuardado(async () => {
      const resultado = await agregarAsignaturaPersonalizada({ nombre: nuevaAsignatura.trim() });
      if ("error" in resultado && resultado.error) {
        setBanner({ tipo: "error", texto: resultado.error });
      } else {
        setBanner({
          tipo: "exito",
          texto: `Asignatura "${nuevaAsignatura.trim()}" agregada y habilitada. Recarga para verla en la lista.`,
        });
        setNuevaAsignatura("");
      }
    });
  }

  const nombreFrecuencia = (valor: string) =>
    FRECUENCIAS.find((f) => f.valor === valor)?.nombre ?? valor;

  return (
    <div className="mt-8">
      {banner && (
        <div className={`mb-5 ${banner.tipo === "exito" ? "banner-exito" : "banner-error"}`}>
          {banner.texto}
        </div>
      )}

      {/* ---------- Proyectos por subnivel ---------- */}
      <h2 className="text-xl font-bold">Proyectos por subnivel</h2>
      <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
        Define la frecuencia y duración de los proyectos para cada subnivel — los más pequeños
        pueden trabajar menos proyectos o más cortos, a tu criterio.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {SUBNIVELES.map((subnivel) => {
          const datos = config[subnivel.valor];
          const enEdicion = editando === subnivel.valor;
          return (
            <div
              key={subnivel.valor}
              className="rounded-2xl bg-white p-5"
              style={{
                border: `1px solid ${enEdicion ? "var(--accent-border-strong)" : "var(--border-light)"}`,
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{subnivel.nombre}</h3>
                  <p className="text-xs" style={{ color: "var(--text-subtle)" }}>
                    {subnivel.grados}
                  </p>
                </div>
                {!enEdicion && (
                  <button
                    onClick={() => {
                      setBanner(null);
                      setEditando(subnivel.valor);
                    }}
                    className="text-sm font-bold"
                    style={{ color: "var(--accent-hover)" }}
                  >
                    Editar
                  </button>
                )}
              </div>

              {!enEdicion ? (
                <div className="mt-3 flex gap-6 text-sm">
                  <span>
                    <span style={{ color: "var(--text-muted)" }}>Frecuencia:</span>{" "}
                    <span className="font-semibold">{nombreFrecuencia(datos.frecuencia)}</span>
                  </span>
                  <span>
                    <span style={{ color: "var(--text-muted)" }}>Duración:</span>{" "}
                    <span className="font-semibold">
                      {datos.duracionMeses} {datos.duracionMeses === 1 ? "mes" : "meses"}
                    </span>
                  </span>
                </div>
              ) : (
                <div className="mt-3">
                  <label className="block text-sm font-medium">
                    Frecuencia de proyectos
                    <select
                      value={datos.frecuencia}
                      onChange={(e) => actualizarSubnivel(subnivel.valor, { frecuencia: e.target.value })}
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
                  <label className="mt-3 block text-sm font-medium">
                    Duración:{" "}
                    <span style={{ color: "var(--accent-hover)" }}>
                      {datos.duracionMeses} {datos.duracionMeses === 1 ? "mes" : "meses"}
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={9}
                      value={datos.duracionMeses}
                      onChange={(e) =>
                        actualizarSubnivel(subnivel.valor, { duracionMeses: Number(e.target.value) })
                      }
                      className="mt-2 w-full accent-[#F69E26]"
                    />
                  </label>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => guardarSubnivel(subnivel.valor)}
                      disabled={guardando}
                      className="rounded-full px-5 py-1.5 text-sm font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
                      style={{ background: "var(--accent)" }}
                    >
                      {guardando ? "Guardando…" : "Guardar"}
                    </button>
                    <button
                      onClick={() => setEditando(null)}
                      disabled={guardando}
                      className="rounded-full border px-5 py-1.5 text-sm font-semibold transition hover:bg-black/5"
                      style={{ borderColor: "var(--border-light-strong)" }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ---------- Asignaturas ---------- */}
      <h2 className="mt-10 text-xl font-bold">Asignaturas que intervienen</h2>

      {!editandoAsignaturas ? (
        <>
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
          <button
            onClick={() => {
              setBanner(null);
              setEditandoAsignaturas(true);
            }}
            className="mt-4 rounded-full px-6 py-2.5 font-semibold text-[#151E29] transition hover:brightness-95"
            style={{ background: "var(--accent)" }}
          >
            Editar asignaturas
          </button>
        </>
      ) : (
        <div className="mt-4 rounded-2xl bg-white p-6" style={{ border: "1px solid var(--border-light)" }}>
          <h3 className="text-sm font-semibold">Asignaturas principales STEAM</h3>
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

          <h3 className="mt-6 text-sm font-semibold">Otras asignaturas (conexiones)</h3>
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

          <h3 className="mt-6 text-sm font-semibold">
            ¿Trabajan otra asignatura?
            <span className="ml-2 font-normal" style={{ color: "var(--text-subtle)" }}>
              escríbela y se agrega al catálogo de tu institución
            </span>
          </h3>
          <div className="mt-2 flex gap-2">
            <input
              value={nuevaAsignatura}
              onChange={(e) => setNuevaAsignatura(e.target.value)}
              placeholder="Ej. Robótica, Agropecuaria, Contabilidad…"
              className="w-full max-w-sm rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#F69E26]"
              style={{ borderColor: "var(--border-light-md)" }}
            />
            <button
              onClick={crearAsignatura}
              disabled={guardando || nuevaAsignatura.trim().length < 3}
              className="rounded-full border px-5 py-2 text-sm font-semibold transition hover:bg-black/5 disabled:opacity-50"
              style={{ borderColor: "var(--border-light-strong)" }}
            >
              + Agregar
            </button>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={guardarSeleccionAsignaturas}
              disabled={guardando || habilitadas.size === 0}
              className="rounded-full px-6 py-2.5 font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              {guardando ? "Guardando…" : "Guardar asignaturas"}
            </button>
            <button
              onClick={() => setEditandoAsignaturas(false)}
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
