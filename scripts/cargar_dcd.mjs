// Carga/actualiza las DCD (con sus indicadores de evaluación) a Supabase
// desde scripts/dcd_extraidas.json (generado por scripts/extraer_dcd.py).
//
// Uso:   node scripts/cargar_dcd.mjs
// Antes: ejecutar la migración 0008 (agrega la columna dcd.indicador).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const RAIZ = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const registros = JSON.parse(
  fs.readFileSync(path.join(RAIZ, "scripts", "dcd_extraidas.json"), "utf8"),
);
console.log(`DCD en el archivo: ${registros.length}`);

// Mapa código de asignatura → id.
const { data: asignaturas, error: errorAsignaturas } = await supabase
  .from("asignaturas")
  .select("id, codigo");
if (errorAsignaturas) {
  console.error("No se pudieron leer las asignaturas:", errorAsignaturas.message);
  process.exit(1);
}
const idPorCodigo = new Map(asignaturas.map((a) => [a.codigo, a.id]));

const filas = registros
  .filter((r) => idPorCodigo.has(r.asignatura))
  .map((r) => ({
    asignatura_id: idPorCodigo.get(r.asignatura),
    codigo: r.codigo,
    descripcion: r.descripcion,
    subnivel: r.subnivel,
    indicador: r.indicador ?? null,
  }));

const TAMANO_LOTE = 500;
let cargadas = 0;
for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
  const lote = filas.slice(i, i + TAMANO_LOTE);
  const { error } = await supabase
    .from("dcd")
    .upsert(lote, { onConflict: "asignatura_id,codigo" });
  if (error) {
    console.error(`Error en el lote ${i / TAMANO_LOTE + 1}:`, error.message);
    process.exit(1);
  }
  cargadas += lote.length;
}

const { count: conIndicador } = await supabase
  .from("dcd")
  .select("id", { count: "exact", head: true })
  .not("indicador", "is", null);
console.log(`✔ ${cargadas} DCD actualizadas · ${conIndicador} con indicador de evaluación.`);
