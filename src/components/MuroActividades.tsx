"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { comentarMuro, eliminarComentarioMuro } from "@/lib/muro-actions";

// Fondos pastel rotativos para el aire tipo Padlet.
const FONDOS = ["#fff9ec", "#f0f7ff", "#f4fff0", "#fdf2f8", "#f5f3ff"];

interface Tarjeta {
  entrega_id: string;
  estudiante_id: string;
  nombres: string;
  apellidos: string;
  contenido: string | null;
  evidencia_url: string | null; // path en storage (se muestra vía URL firmada)
  entregada_at: string | null;
}

interface Comentario {
  comentario_id: string;
  entrega_id: string;
  autor_id: string;
  autor_nombre: string;
  autor_rol: string;
  texto: string;
  created_at: string;
}

interface Props {
  tarjetas: Tarjeta[];
  comentarios: Comentario[];
  urlsFirmadas: Record<string, string>; // entrega_id → URL firmada de la evidencia
  usuarioId: string;
  esDocente: boolean; // docente líder: puede moderar (borrar cualquier comentario)
  ruta: string; // ruta actual para revalidar tras comentar
}

const ETIQUETA_ROL: Record<string, string> = {
  docente: "Docente",
  directivo: "Directivo",
};

export default function MuroActividades({
  tarjetas,
  comentarios,
  urlsFirmadas,
  usuarioId,
  esDocente,
  ruta,
}: Props) {
  const router = useRouter();
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  function comentar(entregaId: string) {
    const texto = (textos[entregaId] ?? "").trim();
    if (!texto) return;
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await comentarMuro({ entregaId, texto, ruta });
      if ("error" in resultado && resultado.error) {
        setError(resultado.error);
      } else {
        setTextos((previos) => ({ ...previos, [entregaId]: "" }));
        router.refresh();
      }
    });
  }

  function eliminar(comentarioId: string) {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await eliminarComentarioMuro(comentarioId, ruta);
      if ("error" in resultado && resultado.error) setError(resultado.error);
      else router.refresh();
    });
  }

  if (!tarjetas.length) {
    return (
      <div
        className="mt-6 rounded-2xl bg-white p-10 text-center"
        style={{ border: "1px solid var(--border-light)" }}
      >
        <p className="font-semibold">Todavía no hay publicaciones en este muro</p>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Cuando los estudiantes entreguen esta actividad, sus trabajos aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {error && <div className="banner-error mb-4">{error}</div>}

      <div className="columns-1 gap-4 md:columns-2 lg:columns-3">
        {tarjetas.map((tarjeta, i) => {
          const comentariosTarjeta = comentarios.filter((c) => c.entrega_id === tarjeta.entrega_id);
          const url = urlsFirmadas[tarjeta.entrega_id];
          const esImagen = url && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(tarjeta.evidencia_url ?? "");
          return (
            <div
              key={tarjeta.entrega_id}
              className="mb-4 break-inside-avoid rounded-2xl p-4"
              style={{ background: FONDOS[i % FONDOS.length], border: "1px solid var(--border-light-md)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: "var(--primary-dark)" }}
                >
                  {tarjeta.nombres[0]}
                  {tarjeta.apellidos[0]}
                </span>
                <span className="text-sm font-bold">
                  {tarjeta.nombres} {tarjeta.apellidos}
                </span>
              </div>

              {tarjeta.contenido && (
                <p className="mt-3 whitespace-pre-wrap text-sm">{tarjeta.contenido}</p>
              )}

              {url &&
                (esImagen ? (
                  <a href={url} target="_blank">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Evidencia de ${tarjeta.nombres}`}
                      className="mt-3 max-h-64 w-full rounded-xl object-cover"
                    />
                  </a>
                ) : (
                  <a
                    href={url}
                    target="_blank"
                    className="mt-3 inline-block text-sm font-semibold underline"
                    style={{ color: "var(--accent-hover)" }}
                  >
                    📎 Ver evidencia
                  </a>
                ))}

              {/* Comentarios */}
              <div className="mt-3 border-t pt-2" style={{ borderColor: "var(--border-light-md)" }}>
                {comentariosTarjeta.map((comentario) => (
                  <div key={comentario.comentario_id} className="group mt-1.5 text-sm">
                    <span className="font-semibold">
                      {comentario.autor_nombre}
                      {ETIQUETA_ROL[comentario.autor_rol] && (
                        <span
                          className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                          style={{ background: "var(--accent-bg)", color: "var(--accent-hover)" }}
                        >
                          {ETIQUETA_ROL[comentario.autor_rol]}
                        </span>
                      )}
                    </span>{" "}
                    <span style={{ color: "var(--text-muted)" }}>{comentario.texto}</span>
                    {(comentario.autor_id === usuarioId || esDocente) && (
                      <button
                        onClick={() => eliminar(comentario.comentario_id)}
                        disabled={pendiente}
                        className="ml-2 hidden text-xs font-semibold group-hover:inline"
                        style={{ color: "var(--color-error)" }}
                        title="Eliminar comentario"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                <div className="mt-2 flex gap-2">
                  <input
                    value={textos[tarjeta.entrega_id] ?? ""}
                    onChange={(e) =>
                      setTextos((previos) => ({ ...previos, [tarjeta.entrega_id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") comentar(tarjeta.entrega_id);
                    }}
                    placeholder="Escribe un comentario…"
                    className="w-full rounded-full border bg-white px-3 py-1.5 text-sm outline-none focus:border-[#F69E26]"
                    style={{ borderColor: "var(--border-light-md)" }}
                  />
                  <button
                    onClick={() => comentar(tarjeta.entrega_id)}
                    disabled={pendiente || !(textos[tarjeta.entrega_id] ?? "").trim()}
                    className="rounded-full px-3 py-1.5 text-sm font-bold text-[#151E29] transition hover:brightness-95 disabled:opacity-40"
                    style={{ background: "var(--accent)" }}
                  >
                    ➤
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
