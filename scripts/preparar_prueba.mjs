// Crea (o reutiliza) datos de prueba para depuración local:
// docente de prueba + clase + proyecto con destrezas seleccionadas.
// Uso: node scripts/preparar_prueba.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const RAIZ = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const env = {};
for (const linea of fs.readFileSync(path.join(RAIZ, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CORREO = "docente.prueba@edinunsteam.com";
const CLAVE = "prueba-steam-2026";

// Institución EDINUN (creada por la directiva) o cualquiera existente.
let { data: institucion } = await admin
  .from("instituciones")
  .select("id, nombre")
  .eq("codigo_amie", "17H99999")
  .maybeSingle();
if (!institucion) {
  ({ data: institucion } = await admin.from("instituciones").select("id, nombre").limit(1).maybeSingle());
}
if (!institucion) {
  console.error("No hay instituciones registradas. Registra la directiva primero.");
  process.exit(1);
}

// Docente de prueba.
let docenteId;
const { data: perfilExistente } = await admin
  .from("perfiles")
  .select("id")
  .eq("email", CORREO)
  .maybeSingle();
if (perfilExistente) {
  docenteId = perfilExistente.id;
} else {
  const { data: usuario, error } = await admin.auth.admin.createUser({
    email: CORREO,
    password: CLAVE,
    email_confirm: true,
  });
  if (error) {
    console.error("No se pudo crear el usuario:", error.message);
    process.exit(1);
  }
  docenteId = usuario.user.id;
  await admin.from("perfiles").insert({
    id: docenteId,
    institucion_id: institucion.id,
    rol: "docente",
    nombres: "Docente",
    apellidos: "De Prueba",
    email: CORREO,
  });
}

// Clase de prueba.
let { data: clase } = await admin
  .from("clases")
  .select("id")
  .eq("docente_id", docenteId)
  .maybeSingle();
if (!clase) {
  ({ data: clase } = await admin
    .from("clases")
    .insert({
      institucion_id: institucion.id,
      docente_id: docenteId,
      nombre: "7mo A (prueba)",
      grado: "7mo EGB",
      edad_referencial: 11,
    })
    .select("id")
    .single());
}

// Proyecto con destrezas seleccionadas (subnivel Media).
let { data: proyecto } = await admin
  .from("proyectos")
  .select("id, titulo")
  .eq("clase_id", clase.id)
  .maybeSingle();
if (!proyecto) {
  ({ data: proyecto } = await admin
    .from("proyectos")
    .insert({ clase_id: clase.id, duracion_semanas: 8 })
    .select("id, titulo")
    .single());
  const { data: destrezas } = await admin
    .from("dcd")
    .select("id")
    .eq("subnivel", "Media")
    .limit(6);
  await admin.from("proyecto_dcd").insert(
    (destrezas ?? []).map((d) => ({ proyecto_id: proyecto.id, dcd_id: d.id, es_conexion: false })),
  );
}

console.log("Institución:", institucion.nombre);
console.log("Docente:", CORREO, "· clave:", CLAVE);
console.log("Clase:", clase.id);
console.log("Proyecto:", proyecto.id, "· titulo:", proyecto.titulo ?? "(sin tema)");
console.log("URL local:", `http://localhost:3000/panel/proyectos/${proyecto.id}`);
