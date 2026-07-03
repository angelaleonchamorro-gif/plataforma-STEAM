"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

interface Fila {
  nombres: string;
  apellidos: string;
  correo?: string;
}

interface Resultado {
  nombres: string;
  apellidos: string;
  correo: string;
  contrasena: string | null;
  error: string | null;
}

export default function CargaMasiva({ claseId }: { claseId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [banner, setBanner] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  function descargarPlantilla() {
    const hoja = XLSX.utils.aoa_to_sheet([
      ["Nombres", "Apellidos", "Correo (opcional)"],
      ["María José", "Andrade Pérez", ""],
      ["Juan Carlos", "Castro López", "jcastro@ejemplo.com"],
    ]);
    hoja["!cols"] = [{ wch: 22 }, { wch: 22 }, { wch: 28 }];
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Estudiantes");
    XLSX.writeFile(libro, "plantilla-estudiantes.xlsx");
  }

  async function leerArchivo(archivo: File) {
    setBanner(null);
    const datos = await archivo.arrayBuffer();
    const libro = XLSX.read(datos);
    const hoja = libro.Sheets[libro.SheetNames[0]];
    const crudas = XLSX.utils.sheet_to_json<(string | number)[]>(hoja, { header: 1 });

    const leidas: Fila[] = [];
    for (const fila of crudas.slice(1)) {
      const nombres = String(fila[0] ?? "").trim();
      const apellidos = String(fila[1] ?? "").trim();
      const correo = String(fila[2] ?? "").trim();
      if (nombres && apellidos) leidas.push({ nombres, apellidos, correo: correo || undefined });
    }

    if (!leidas.length) {
      setBanner({
        tipo: "error",
        texto: "No se encontraron filas válidas. Usa la plantilla: Nombres | Apellidos | Correo (opcional).",
      });
      return;
    }
    if (leidas.length > 60) {
      setBanner({ tipo: "error", texto: "Máximo 60 estudiantes por carga. Divide el archivo." });
      return;
    }
    setFilas(leidas);
  }

  function descargarCredenciales(resultados: Resultado[]) {
    const hoja = XLSX.utils.aoa_to_sheet([
      ["Nombres", "Apellidos", "Correo", "Contraseña temporal", "Estado"],
      ...resultados.map((r) => [
        r.nombres,
        r.apellidos,
        r.correo,
        r.contrasena ?? "—",
        r.error ?? "Cuenta creada",
      ]),
    ]);
    hoja["!cols"] = [{ wch: 20 }, { wch: 20 }, { wch: 36 }, { wch: 18 }, { wch: 26 }];
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Credenciales");
    XLSX.writeFile(libro, "credenciales-estudiantes.xlsx");
  }

  async function procesar() {
    setCargando(true);
    setBanner(null);
    try {
      const res = await fetch("/api/clases/carga-masiva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claseId, estudiantes: filas }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ tipo: "error", texto: data.mensaje ?? "No se pudo procesar la carga." });
        return;
      }
      const resultados: Resultado[] = data.resultados;
      const creados = resultados.filter((r) => !r.error).length;
      const fallidos = resultados.length - creados;

      descargarCredenciales(resultados);
      setBanner({
        tipo: creados > 0 ? "exito" : "error",
        texto:
          `${creados} cuenta${creados === 1 ? "" : "s"} creada${creados === 1 ? "" : "s"}` +
          (fallidos ? ` · ${fallidos} con error (ver Excel)` : "") +
          ". Se descargó el Excel con las credenciales: guárdalo, las contraseñas no se vuelven a mostrar.",
      });
      setFilas([]);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setBanner({ tipo: "error", texto: "Error de conexión al procesar la carga." });
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl bg-white p-6" style={{ border: "1px solid var(--border-light)" }}>
      <h3 className="font-semibold">Carga masiva desde Excel</h3>
      <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
        Sube un Excel con Nombres, Apellidos y Correo (opcional — si falta, el sistema lo genera).
        Las cuentas se crean con contraseña temporal y recibes un Excel con las credenciales.
      </p>

      {banner && (
        <div className={`mt-4 ${banner.tipo === "exito" ? "banner-exito" : "banner-error"}`}>
          {banner.texto}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={descargarPlantilla}
          className="rounded-full border px-5 py-2 text-sm font-semibold transition hover:bg-black/5"
          style={{ borderColor: "var(--border-light-strong)" }}
        >
          ⬇ Descargar plantilla
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) void leerArchivo(archivo);
          }}
          className="text-sm file:mr-3 file:rounded-full file:border-0 file:px-4 file:py-1.5 file:text-sm file:font-semibold"
          style={{ color: "var(--text-muted)" }}
        />
      </div>

      {filas.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold">
            {filas.length} estudiante{filas.length === 1 ? "" : "s"} en el archivo:
          </p>
          <ul className="mt-2 max-h-40 overflow-y-auto text-sm" style={{ color: "var(--text-muted)" }}>
            {filas.map((f, i) => (
              <li key={i} className="py-0.5">
                {f.apellidos} {f.nombres}
                {f.correo ? ` · ${f.correo}` : " · correo generado automáticamente"}
              </li>
            ))}
          </ul>
          <button
            onClick={procesar}
            disabled={cargando}
            className="mt-4 rounded-full px-6 py-2.5 font-semibold text-[#151E29] transition hover:brightness-95 disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {cargando ? "Creando cuentas…" : `Crear ${filas.length} cuenta${filas.length === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
    </div>
  );
}
