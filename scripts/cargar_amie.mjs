// Carga el catálogo oficial AMIE del Mineduc a Supabase.
//
// Uso:   node scripts/cargar_amie.mjs [ruta-al-excel]
// Antes: ejecutar supabase/migrations/0005_amie_catalogo.sql en Supabase.
// Lee las credenciales de .env.local (URL + service role).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const RAIZ = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const RUTA_EXCEL =
  process.argv[2] ??
  "C:/Users/MENTORIA-02/Downloads/MINEDUC_RegistrosAdministrativos_2024-2025-Inicio (1).xlsx";
const FILA_ENCABEZADO = 16; // 0-indexed: los datos del Mineduc empiezan ahí

// Institución de prueba de la editorial (no está en el registro del Mineduc).
const EDINUN = {
  codigo: "17H99999",
  nombre: "UNIDAD EDUCATIVA EDINUN",
  provincia: "PICHINCHA",
  canton: "QUITO",
  sostenimiento: "Particular",
  nivel_educacion: "Inicial, EGB y Bachillerato",
};

function leerEnvLocal() {
  const contenido = fs.readFileSync(path.join(RAIZ, ".env.local"), "utf8");
  const env = {};
  for (const linea of contenido.split(/\r?\n/)) {
    const match = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = leerEnvLocal();
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("Leyendo", RUTA_EXCEL);
const libro = XLSX.readFile(RUTA_EXCEL);
const hoja = libro.Sheets[libro.SheetNames[0]];
const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, range: FILA_ENCABEZADO });

const encabezados = filas[0].map((c) => String(c ?? "").trim());
const col = (nombre) => encabezados.findIndex((e) => e.toLowerCase() === nombre.toLowerCase());
const iAmie = col("AMIE");
const iNombre = col("Nombre_Institución");
const iProvincia = col("Provincia");
const iCanton = col("Cantón");
const iSostenimiento = col("Sostenimiento");
const iNivel = col("Nivel Educación");
if (iAmie < 0 || iNombre < 0) {
  console.error("No se encontraron las columnas AMIE / Nombre_Institución. Encabezados:", encabezados);
  process.exit(1);
}

const instituciones = new Map();
for (const fila of filas.slice(1)) {
  const codigo = String(fila[iAmie] ?? "").trim().toUpperCase();
  const nombre = String(fila[iNombre] ?? "").trim();
  if (!codigo || !nombre) continue;
  if (!instituciones.has(codigo)) {
    instituciones.set(codigo, {
      codigo,
      nombre,
      provincia: String(fila[iProvincia] ?? "").trim() || null,
      canton: String(fila[iCanton] ?? "").trim() || null,
      sostenimiento: String(fila[iSostenimiento] ?? "").trim() || null,
      nivel_educacion: String(fila[iNivel] ?? "").trim() || null,
    });
  }
}
console.log(`Filas leídas: ${filas.length - 1} · instituciones únicas: ${instituciones.size}`);

if (instituciones.has(EDINUN.codigo)) {
  console.warn(`⚠ El código ${EDINUN.codigo} ya existe en el registro oficial; EDINUN usará EDINUN01.`);
  EDINUN.codigo = "EDINUN01";
}
instituciones.set(EDINUN.codigo, EDINUN);

const registros = [...instituciones.values()];
const TAMANO_LOTE = 500;
let cargadas = 0;
for (let i = 0; i < registros.length; i += TAMANO_LOTE) {
  const lote = registros.slice(i, i + TAMANO_LOTE);
  const { error } = await supabase.from("amie_catalogo").upsert(lote, { onConflict: "codigo" });
  if (error) {
    console.error(`Error en el lote ${i / TAMANO_LOTE + 1}:`, error.message);
    process.exit(1);
  }
  cargadas += lote.length;
  if ((i / TAMANO_LOTE) % 10 === 0) {
    console.log(`  ${cargadas}/${registros.length}…`);
  }
}

const { count } = await supabase
  .from("amie_catalogo")
  .select("codigo", { count: "exact", head: true });
console.log(`✔ Carga completa: ${cargadas} enviadas · ${count} en la base.`);
console.log(`✔ Institución de prueba: ${EDINUN.nombre} → código AMIE ${EDINUN.codigo}`);
