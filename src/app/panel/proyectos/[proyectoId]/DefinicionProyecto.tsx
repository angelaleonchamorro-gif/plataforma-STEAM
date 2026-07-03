"use client";

import { useMemo, useState, useTransition } from "react";
import { guardarSeleccionDcd, elegirTema, guardarHabilidades } from "./actions";

interface Asignatura {
  id: string;
  codigo: string;
  nombre: string;
  es_principal: boolean;
}

interface Destreza {
  id: string;
  asignatura_id: string;
  codigo: string;
  descripcion: string;
  indicador: string | null;
}

interface Habilidad {
  componente: "tecnologia" | "ingenieria";
  descripcion: string;
  indicador: string | null;
}

interface TemaSugerido {
  titulo: string;
  descripcion: string;
  reto: string;
  justificacion: string;
}

interface Props {
  proyecto: { id: string; titulo: string | null; reto: string | null; estado: string };
  asignaturas: Asignatura[];
  destrezas: Destreza[];
  seleccionInicial: { dcdId: string; esConexion: boolean }[];
  habilidadesIniciales: Habilidad[];
}

export default function DefinicionProyecto({
  proyecto,
  asignaturas,
  destrezas,
  seleccionInicial,
  habilidadesIniciales,
}: Props) {
  // --- Paso 1: selección de destrezas ---
  const [seleccion, setSeleccion] = useState<Map<string, boolean>>(
    new Map(seleccionInicial.map((s) => [s.dcdId, s.esConexion])),
  );
  const [seleccionGuardada, setSeleccionGuardada] = useState(seleccionInicial.length > 0);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [conexionesVisibles, setConexionesVisibles] = useState<Set<string>>(
    // Conexiones que ya tienen destrezas seleccionadas se muestran de entrada.
    new Set(
      asignaturas
        .filter(
          (a) =>
            !a.es_principal &&
            destrezas.some((d) => d.asignatura_id === a.id && seleccionInicial.some((s) => s.dcdId === d.id)),
        )
        .map((a) => a.id),
    ),
  );
  const [filtro, setFiltro] = useState("");
  const [banner, setBanner] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [guardando, iniciarGuardado] = useTransition();

  // --- Habilidades de Tecnología e Ingeniería (el docente las escribe) ---
  const [habilidades, setHabilidades] = useState<Habilidad[]>(habilidadesIniciales);
  const [bannerHabilidades, setBannerHabilidades] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [guardandoHabilidades, iniciarGuardadoHabilidades] = useTransition();

  // --- Paso 2: tema con IA ---
  const [temas, setTemas] = useState<TemaSugerido[] | null>(null);
  const [generandoTemas, setGenerandoTemas] = useState(false);
  const [bannerTema, setBannerTema] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [temaPropio, setTemaPropio] = useState(false);
  const [tituloManual, setTituloManual] = useState(proyecto.titulo ?? "");
  const [retoManual, setRetoManual] = useState(proyecto.reto ?? "");
  const [eligiendo, iniciarEleccion] = useTransition();

  const destrezasPorAsignatura = useMemo(() => {
    const mapa = new Map<string, Destreza[]>();
    for (const d of destrezas) {
      if (!mapa.has(d.asignatura_id)) mapa.set(d.asignatura_id, []);
      mapa.get(d.asignatura_id)!.push(d);
    }
    return mapa;
  }, [destrezas]);

  const principales = asignaturas.filter((a) => a.es_principal);
  const conexionesDisponibles = asignaturas.filter((a) => !a.es_principal);

  function alternarDestreza(dcdId: string, esConexion: boolean) {
    setSeleccion((previa) => {
      const nueva = new Map(previa);
      if (nueva.has(dcdId)) nueva.delete(dcdId);
      else nueva.set(dcdId, esConexion);
      return nueva;
    });
    setSeleccionGuardada(false);
  }

  function alternarAcordeon(asignaturaId: string) {
    setAbiertas((previas) => {
      const nuevas = new Set(previas);
      if (nuevas.has(asignaturaId)) nuevas.delete(asignaturaId);
      else nuevas.add(asignaturaId);
      return nuevas;
    });
  }

  function guardarSeleccion() {
    setBanner(null);
    iniciarGuardado(async () => {
      const resultado = await guardarSeleccionDcd({
        proyectoId: proyecto.id,
        seleccion: [...seleccion.entries()].map(([dcdId, esConexion]) => ({ dcdId, esConexion })),
      });
      if ("error" in resultado && resultado.error) {
        setBanner({ tipo: "error", texto: resultado.error });
      } else {
        setBanner({ tipo: "exito", texto: "Destrezas guardadas. Ya puedes pedir los temas a la IA." });
        setSeleccionGuardada(true);
      }
    });
  }

  async function generarTemas() {
    setBannerTema(null);
    setGenerandoTemas(true);
    try {
      const res = await fetch("/api/ia/temas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proyectoId: proyecto.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBannerTema({ tipo: "error", texto: data.mensaje ?? "No se pudieron generar los temas." });
      } else {
        setTemas(data.temas);
      }
    } catch {
      setBannerTema({ tipo: "error", texto: "Error de conexión al generar los temas." });
    } finally {
      setGenerandoTemas(false);
    }
  }

  function confirmarTema(titulo: string, reto: string) {
    setBannerTema(null);
    iniciarEleccion(async () => {
      const resultado = await elegirTema({ proyectoId: proyecto.id, titulo, reto });
      if ("error" in resultado && resultado.error) {
        setBannerTema({ tipo: "error", texto: resultado.error });
      } else {
        setBannerTema({ tipo: "exito", texto: "Tema guardado. El siguiente paso es generar la planificación semanal." });
      }
    });
  }

  function renderAsignatura(asignatura: Asignatura, esConexion: boolean) {
    const lista = destrezasPorAsignatura.get(asignatura.id) ?? [];
    const filtradas = filtro
      ? lista.filter(
          (d) =>
            d.descripcion.toLowerCase().includes(filtro.toLowerCase()) ||
            d.codigo.toLowerCase().includes(filtro.toLowerCase()),
        )
      : lista;
    const marcadas = lista.filter((d) => seleccion.has(d.id)).length;
    const abierta = abiertas.has(asignatura.id) || (filtro !== "" && filtradas.length > 0);

    return (
      <div
        key={asignatura.id}
        className="rounded-xl bg-white"
        style={{ border: "1px solid var(--border-light-md)" }}
      >
        <button
          type="button"
          onClick={() => alternarAcordeon(asignatura.id)}
          className="flex w-full items-center justify-between px-5 py-3.5 text-left"
        >
          <span className="font-semibold">
            {asignatura.nombre}
            {esConexion && (
              <span className="ml-2 text-xs font-medium" style={{ color: "var(--text-subtle)" }}>
                conexión
              </span>
            )}
          </span>
          <span className="flex items-center gap-3 text-sm">
            {marcadas > 0 && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                style={{ background: "var(--accent-bg)", color: "var(--accent-hover)" }}
              >
                {marcadas}
              </span>
            )}
            <span style={{ color: "var(--text-subtle)" }}>{abierta ? "▾" : "▸"}</span>
          </span>
        </button>
        {abierta && (
          <div className="max-h-80 overflow-y-auto px-5 pb-4">
            {filtradas.map((destreza) => (
              <label
                key={destreza.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-sm hover:bg-black/[0.03]"
                style={{ borderBottom: "1px solid var(--border-light)" }}
              >
                <input
                  type="checkbox"
                  checked={seleccion.has(destreza.id)}
                  onChange={() => alternarDestreza(destreza.id, esConexion)}
                  className="mt-1 accent-[#F69E26]"
                />
                <span>
                  <span className="font-mono text-xs font-semibold" style={{ color: "var(--accent-hover)" }}>
                    {destreza.codigo}
                  </span>{" "}
                  {destreza.descripcion}
                  {destreza.indicador && (
                    <span className="mt-1 block text-xs" style={{ color: "var(--text-subtle)" }}>
                      <span className="font-semibold">Indicador:</span> {destreza.indicador}
                    </span>
                  )}
                </span>
              </label>
            ))}
            {filtradas.length === 0 && (
              <p className="py-2 text-sm" style={{ color: "var(--text-subtle)" }}>
                Ninguna destreza coincide con la búsqueda.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  const temaDefinido = Boolean(proyecto.titulo && proyecto.reto) || bannerTema?.tipo === "exito";

  return (
    <div className="mt-8 flex flex-col gap-10">
      {/* ---------- PASO 1: DESTREZAS ---------- */}
      <section>
        <h2 className="text-xl font-bold">
          <span style={{ color: "var(--accent-hover)" }}>1.</span> Destrezas con criterios de desempeño
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Selecciona las destrezas que trabajará el proyecto. {seleccion.size} seleccionadas.
        </p>

        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar destreza por código o texto…"
          className="mt-4 w-full max-w-md rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#F69E26]"
          style={{ borderColor: "var(--border-light-md)" }}
        />

        <div className="mt-4 flex flex-col gap-3">
          {principales.map((a) => renderAsignatura(a, false))}
          {conexionesDisponibles
            .filter((a) => conexionesVisibles.has(a.id))
            .map((a) => renderAsignatura(a, true))}
        </div>

        {conexionesDisponibles.some((a) => !conexionesVisibles.has(a.id)) && (
          <div className="mt-4">
            <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
              + Agregar asignatura de conexión:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {conexionesDisponibles
                .filter((a) => !conexionesVisibles.has(a.id))
                .map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setConexionesVisibles((previas) => new Set(previas).add(a.id));
                      setAbiertas((previas) => new Set(previas).add(a.id));
                    }}
                    className="rounded-full border px-4 py-1.5 text-sm font-medium transition hover:bg-black/5"
                    style={{ borderColor: "var(--border-light-strong)" }}
                  >
                    + {a.nombre}
                  </button>
                ))}
            </div>
          </div>
        )}

        {banner && (
          <div className={`mt-5 ${banner.tipo === "exito" ? "banner-exito" : "banner-error"}`}>
            {banner.texto}
          </div>
        )}

        <button
          onClick={guardarSeleccion}
          disabled={guardando || seleccion.size === 0}
          className="mt-5 rounded-full px-6 py-2.5 font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {guardando ? "Guardando…" : "Guardar destrezas"}
        </button>
      </section>

      {/* ---------- HABILIDADES DE TECNOLOGÍA E INGENIERÍA ---------- */}
      <section>
        <h2 className="text-xl font-bold">
          <span style={{ color: "var(--accent-hover)" }}>1b.</span> Habilidades de Tecnología e Ingeniería
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          El currículo no define destrezas para estos componentes: escríbelas tú con su indicador
          para poder cuantificarlas (ej. &quot;Compila la programación de la placa Arduino&quot;).
        </p>

        {bannerHabilidades && (
          <div className={`mt-4 ${bannerHabilidades.tipo === "exito" ? "banner-exito" : "banner-error"}`}>
            {bannerHabilidades.texto}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3">
          {habilidades.map((habilidad, i) => (
            <div
              key={i}
              className="rounded-xl bg-white p-4"
              style={{ border: "1px solid var(--border-light-md)" }}
            >
              <div className="flex flex-wrap items-start gap-3">
                <select
                  value={habilidad.componente}
                  onChange={(e) =>
                    setHabilidades((previas) =>
                      previas.map((h, j) =>
                        j === i ? { ...h, componente: e.target.value as Habilidad["componente"] } : h,
                      ),
                    )
                  }
                  className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[#F69E26]"
                  style={{ borderColor: "var(--border-light-md)" }}
                >
                  <option value="tecnologia">Tecnología</option>
                  <option value="ingenieria">Ingeniería</option>
                </select>
                <div className="min-w-60 flex-1">
                  <input
                    value={habilidad.descripcion}
                    onChange={(e) =>
                      setHabilidades((previas) =>
                        previas.map((h, j) => (j === i ? { ...h, descripcion: e.target.value } : h)),
                      )
                    }
                    placeholder="Habilidad (ej. Programar el sensor ultrasónico del prototipo)"
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#F69E26]"
                    style={{ borderColor: "var(--border-light-md)" }}
                  />
                  <input
                    value={habilidad.indicador ?? ""}
                    onChange={(e) =>
                      setHabilidades((previas) =>
                        previas.map((h, j) =>
                          j === i ? { ...h, indicador: e.target.value || null } : h,
                        ),
                      )
                    }
                    placeholder="Indicador de evaluación (ej. Compila adecuadamente la programación de la placa)"
                    className="mt-2 w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-[#F69E26]"
                    style={{ borderColor: "var(--border-light)" }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setHabilidades((previas) => previas.filter((_, j) => j !== i))}
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-error)" }}
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              setHabilidades((previas) => [
                ...previas,
                { componente: previas.length % 2 === 0 ? "tecnologia" : "ingenieria", descripcion: "", indicador: null },
              ])
            }
            className="rounded-full border px-5 py-2 text-sm font-semibold transition hover:bg-black/5"
            style={{ borderColor: "var(--border-light-strong)" }}
          >
            + Agregar habilidad
          </button>
          {habilidades.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setBannerHabilidades(null);
                iniciarGuardadoHabilidades(async () => {
                  const resultado = await guardarHabilidades({
                    proyectoId: proyecto.id,
                    habilidades: habilidades.filter((h) => h.descripcion.trim().length >= 5),
                  });
                  if ("error" in resultado && resultado.error) {
                    setBannerHabilidades({ tipo: "error", texto: resultado.error });
                  } else {
                    setBannerHabilidades({
                      tipo: "exito",
                      texto: "Habilidades guardadas: la IA las tomará en cuenta en los temas y la planificación.",
                    });
                  }
                });
              }}
              disabled={guardandoHabilidades}
              className="rounded-full px-5 py-2 text-sm font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              {guardandoHabilidades ? "Guardando…" : "Guardar habilidades"}
            </button>
          )}
        </div>
      </section>

      {/* ---------- PASO 2: TEMA ---------- */}
      <section>
        <h2 className="text-xl font-bold">
          <span style={{ color: "var(--accent-hover)" }}>2.</span> Tema del proyecto
        </h2>

        {temaDefinido && proyecto.titulo && (
          <div
            className="mt-4 rounded-2xl p-6 text-white"
            style={{ background: "var(--primary-dark)" }}
          >
            <p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
              TEMA ELEGIDO
            </p>
            <h3 className="mt-1 text-lg font-bold">{proyecto.titulo}</h3>
            {proyecto.reto && (
              <p className="mt-2 text-sm" style={{ color: "var(--text-dark-muted)" }}>
                <span className="font-semibold text-white">Reto:</span> {proyecto.reto}
              </p>
            )}
          </div>
        )}

        {bannerTema && (
          <div className={`mt-4 ${bannerTema.tipo === "exito" ? "banner-exito" : "banner-error"}`}>
            {bannerTema.texto}
          </div>
        )}

        {!temaDefinido && (
          <>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              La IA propone 3 temas según la edad de tus estudiantes y las destrezas guardadas — o escribe el tuyo.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={generarTemas}
                disabled={generandoTemas || !seleccionGuardada}
                className="rounded-full px-6 py-2.5 font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
                style={{ background: "var(--accent)" }}
                title={!seleccionGuardada ? "Primero guarda las destrezas" : undefined}
              >
                {generandoTemas ? "Generando temas…" : "✨ Sugerir 3 temas con IA"}
              </button>
              <button
                onClick={() => setTemaPropio((v) => !v)}
                className="rounded-full border px-6 py-2.5 font-semibold transition hover:bg-black/5"
                style={{ borderColor: "var(--border-light-strong)" }}
              >
                Escribir mi propio tema
              </button>
            </div>

            {temas && (
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {temas.map((tema, i) => (
                  <div
                    key={i}
                    className="flex flex-col rounded-2xl bg-white p-5"
                    style={{ border: "1px solid var(--border-light-md)" }}
                  >
                    <h3 className="font-bold">{tema.titulo}</h3>
                    <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                      {tema.descripcion}
                    </p>
                    <p className="mt-3 text-sm">
                      <span className="font-semibold" style={{ color: "var(--accent-hover)" }}>
                        Reto:
                      </span>{" "}
                      {tema.reto}
                    </p>
                    <p className="mt-2 text-xs" style={{ color: "var(--text-subtle)" }}>
                      {tema.justificacion}
                    </p>
                    <button
                      onClick={() => confirmarTema(tema.titulo, tema.reto)}
                      disabled={eligiendo}
                      className="mt-auto pt-4 text-sm font-bold disabled:opacity-50"
                      style={{ color: "var(--accent-hover)" }}
                    >
                      Elegir este tema →
                    </button>
                  </div>
                ))}
              </div>
            )}

            {temaPropio && (
              <div
                className="mt-5 rounded-2xl bg-white p-6"
                style={{ border: "1px solid var(--border-light-md)" }}
              >
                <label className="text-sm font-medium">
                  Título del proyecto
                  <input
                    value={tituloManual}
                    onChange={(e) => setTituloManual(e.target.value)}
                    className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-[#F69E26]"
                    style={{ borderColor: "var(--border-light-md)" }}
                  />
                </label>
                <label className="mt-4 block text-sm font-medium">
                  Reto (desafío concreto y medible que resolverá el prototipo)
                  <textarea
                    value={retoManual}
                    onChange={(e) => setRetoManual(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-[#F69E26]"
                    style={{ borderColor: "var(--border-light-md)" }}
                  />
                </label>
                <button
                  onClick={() => confirmarTema(tituloManual, retoManual)}
                  disabled={eligiendo || tituloManual.length < 5 || retoManual.length < 10}
                  className="mt-4 rounded-full px-6 py-2 font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
                  style={{ background: "var(--accent)" }}
                >
                  {eligiendo ? "Guardando…" : "Guardar tema"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

    </div>
  );
}
