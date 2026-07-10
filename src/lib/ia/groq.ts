import Groq from "groq-sdk";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Motor de IA con doble proveedor. Filosofía EDINUN: la IA SUGIERE, el
// docente revisa y edita. Si el proveedor falla, se registra el error y la
// plataforma sigue funcionando (degradación elegante).
//
// Selección de proveedor:
//   - IA_PROVEEDOR=anthropic|groq fuerza uno explícitamente.
//   - Sin IA_PROVEEDOR: usa Anthropic si hay ANTHROPIC_API_KEY, si no Groq.
export const PROVEEDOR_IA: "anthropic" | "groq" =
  process.env.IA_PROVEEDOR === "groq"
    ? "groq"
    : process.env.IA_PROVEEDOR === "anthropic" || process.env.ANTHROPIC_API_KEY
      ? "anthropic"
      : "groq";

export const MODELO_IA =
  PROVEEDOR_IA === "anthropic" ? "claude-haiku-4-5" : "llama-3.3-70b-versatile";

// Último modelo que respondió de verdad (puede diferir de MODELO_IA si el
// proveedor principal falló y respondió el de respaldo).
export let MODELO_USADO = MODELO_IA;

// Recorta fences de markdown y ruido alrededor del objeto JSON.
function extraerJSON(texto: string): string {
  const fence = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
  const crudo = fence ? fence[1] : texto;
  const inicio = crudo.indexOf("{");
  const fin = crudo.lastIndexOf("}");
  return inicio >= 0 && fin > inicio ? crudo.slice(inicio, fin + 1) : crudo;
}

async function llamarAnthropic(
  sistema: string,
  usuario: string,
  opciones: { temperature: number; maxTokens: number },
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const respuesta = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: opciones.maxTokens,
    temperature: opciones.temperature,
    system: sistema,
    messages: [{ role: "user", content: usuario }],
  });
  MODELO_USADO = "claude-haiku-4-5";
  const bloque = respuesta.content.find((b) => b.type === "text");
  return bloque && bloque.type === "text" ? bloque.text : "{}";
}

async function llamarGroq(
  sistema: string,
  usuario: string,
  opciones: { temperature: number; maxTokens: number },
): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: opciones.temperature,
    max_tokens: opciones.maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: sistema },
      { role: "user", content: usuario },
    ],
  });
  MODELO_USADO = "llama-3.3-70b-versatile";
  return completion.choices[0]?.message?.content ?? "{}";
}

// Intenta el proveedor principal y, si falla (crédito agotado, límite,
// caída), cae automáticamente al otro si su clave está configurada.
async function completarJSON(
  sistema: string,
  usuario: string,
  opciones: { temperature: number; maxTokens: number },
): Promise<string> {
  const orden: ("anthropic" | "groq")[] =
    PROVEEDOR_IA === "anthropic" ? ["anthropic", "groq"] : ["groq", "anthropic"];

  let ultimoError: unknown;
  for (const proveedor of orden) {
    if (proveedor === "anthropic" && !process.env.ANTHROPIC_API_KEY) continue;
    if (proveedor === "groq" && !process.env.GROQ_API_KEY) continue;
    try {
      return proveedor === "anthropic"
        ? await llamarAnthropic(sistema, usuario, opciones)
        : await llamarGroq(sistema, usuario, opciones);
    } catch (error) {
      ultimoError = error;
    }
  }
  throw ultimoError;
}

// ---------- Sugerencia de 3 temas ----------

export const esquemaTemas = z.object({
  temas: z
    .array(
      z.object({
        titulo: z.string(),
        descripcion: z.string(),
        reto: z.string(),
        justificacion: z.string(),
      }),
    )
    .length(3),
});

export type TemasSugeridos = z.infer<typeof esquemaTemas>;

export interface ContextoProyecto {
  grado: string;
  edadReferencial: number;
  duracionSemanas: number;
  dcdPorAsignatura: { asignatura: string; destrezas: { codigo: string; descripcion: string }[] }[];
  // Habilidades de Tecnología e Ingeniería escritas por el docente.
  habilidades?: { componente: "tecnologia" | "ingenieria"; descripcion: string }[];
}

function bloqueHabilidades(contexto: ContextoProyecto): string {
  if (!contexto.habilidades?.length) return "";
  const tec = contexto.habilidades.filter((h) => h.componente === "tecnologia");
  const ing = contexto.habilidades.filter((h) => h.componente === "ingenieria");
  let bloque = "\n\nHabilidades definidas por el docente:";
  if (tec.length) bloque += `\nTecnología:\n${tec.map((h) => `  - ${h.descripcion}`).join("\n")}`;
  if (ing.length) bloque += `\nIngeniería:\n${ing.map((h) => `  - ${h.descripcion}`).join("\n")}`;
  return bloque;
}

export async function sugerirTemas(contexto: ContextoProyecto): Promise<TemasSugeridos> {
  const listaDcd = contexto.dcdPorAsignatura
    .map(
      (a) =>
        `${a.asignatura}:\n${a.destrezas.map((d) => `  - ${d.codigo}: ${d.descripcion}`).join("\n")}`,
    )
    .join("\n\n");

  const sistema = `Eres un experto en pedagogía STEAM y en el currículo ecuatoriano del Ministerio de Educación.
Propones temas de proyectos escolares STEAM apropiados para la edad de los estudiantes, que integren las destrezas con criterios de desempeño (DCD) seleccionadas por el docente.
Cada tema debe culminar en un PROTOTIPO construible con materiales fungibles accesibles en Ecuador.
Respondes SIEMPRE en español y SOLO con JSON válido con esta forma exacta:
{"temas":[{"titulo":"...","descripcion":"...","reto":"...","justificacion":"..."}]}
- "titulo": nombre atractivo del proyecto (máx. 10 palabras).
- "descripcion": 2-3 oraciones de qué trata el proyecto.
- "reto": el desafío concreto y medible que los estudiantes deben resolver con su prototipo.
- "justificacion": cómo el tema integra las DCD seleccionadas.
Devuelve exactamente 3 temas.`;

  const usuario = `Grado: ${contexto.grado}
Edad de los estudiantes: ${contexto.edadReferencial} años
Duración del proyecto: ${contexto.duracionSemanas} semanas

Destrezas con criterios de desempeño seleccionadas:

${listaDcd}${bloqueHabilidades(contexto)}

Sugiere 3 temas de proyecto STEAM.`;

  const crudo = await completarJSON(sistema, usuario, { temperature: 0.8, maxTokens: 2048 });
  return esquemaTemas.parse(JSON.parse(extraerJSON(crudo)));
}

// ---------- Planificación semanal + actividades por fase ----------

// Validación TOLERANTE: los modelos a veces omiten claves opcionales o
// devuelven null donde esperamos string — se normaliza en vez de rechazar
// toda la planificación (nullish acepta null Y undefined).
const textoONulo = z
  .string()
  .nullish()
  .transform((v) => v ?? null);

export const esquemaPlanificacion = z.object({
  semanas: z.array(
    z.object({
      numero: z.coerce.number().int().min(1),
      fase: z.enum([
        "socializacion",
        "indagacion",
        "diseno_plan_accion",
        "prototipado",
        "pruebas_rediseno",
        "divulgacion",
      ]),
      objetivo: z
        .string()
        .nullish()
        .transform((v) => v ?? "Trabajo de la semana"),
      descripcion: z
        .string()
        .nullish()
        .transform((v) => v ?? ""),
      actividades: z.array(
        z.object({
          titulo: z.string(),
          instrucciones: z.string(),
          criterioEvaluacion: z
            .string()
            .nullish()
            .transform((v) => v ?? ""),
          codigoDcd: textoONulo,
          asignatura: textoONulo,
          recursos: textoONulo,
          evidencia: textoONulo,
        }),
      ),
    }),
  ),
});

export type PlanificacionGenerada = z.infer<typeof esquemaPlanificacion>;

export async function generarPlanificacion(
  contexto: ContextoProyecto & { titulo: string; reto: string },
): Promise<PlanificacionGenerada> {
  const listaDcd = contexto.dcdPorAsignatura
    .map(
      (a) =>
        `${a.asignatura}:\n${a.destrezas.map((d) => `  - ${d.codigo}: ${d.descripcion}`).join("\n")}`,
    )
    .join("\n\n");

  const esBachillerato = /bgu|bachillerato/i.test(contexto.grado);

  const sistema = `Eres un experto en pedagogía STEAM y en el currículo ecuatoriano.
Generas la planificación semanal completa de un proyecto STEAM, distribuida en 6 fases EN ESTE ORDEN:
1. "socializacion": crear la situación que plantea el reto + preguntas de reflexión para generar desequilibrio cognitivo en los estudiantes.
2. "indagacion": actividades que desarrollan las DCD seleccionadas, cada una con su actividad de evaluación (asigna el código de la DCD en "codigoDcd").
3. "diseno_plan_accion": los estudiantes diseñan el prototipo, listan materiales fungibles y describen el proceso de construcción.
4. "prototipado": construcción del prototipo.
5. "pruebas_rediseno": cuantificar el desempeño del prototipo contra el reto; si no cumple, iterar mejoras.
6. "divulgacion": ${esBachillerato ? "redacción de un artículo científico con estructura IMRD (introducción, metodología, resultados, discusión)" : "preparar una exposición, carteles o video explicando los resultados del proyecto"}.

Reglas:
- Distribuye las semanas proporcionalmente: la indagación y el prototipado llevan más tiempo.
- Cada semana tiene 1 a 3 actividades fungibles concretas que el estudiante REALIZA y ENTREGA (evidencia).
- Las instrucciones se dirigen al estudiante, en lenguaje apropiado a su edad.
- El criterio de evaluación describe qué observará el docente para valorar la actividad.
- Materiales siempre fungibles y accesibles en Ecuador (cartón, botellas, sorbetes, etc.).
- Lenguaje neutro y no comparativo entre estudiantes.
- "codigoDcd" solo en actividades de indagación que desarrollan una DCD específica; en el resto, null.
- "asignatura": a qué asignatura corresponde la actividad (usa EXACTAMENTE uno de los nombres de asignatura del contexto, o "Tecnología" / "Ingeniería" para actividades de esos componentes; null si es transversal).
- "recursos": materiales o insumos concretos que necesita la actividad (ej. "Cartón, botellas plásticas, tijeras" o "Video sobre contaminación, cuestionario").
- "evidencia": el producto verificable que entrega el estudiante (ej. "Participación en el foro", "Bocetos del prototipo", "Resultados de las encuestas", "Rutina de pensamiento Veo-pienso-me pregunto").
- IMPORTANTE: incluye SIEMPRE las 7 claves de cada actividad (titulo, instrucciones, criterioEvaluacion, codigoDcd, asignatura, recursos, evidencia); si una no aplica usa null, NUNCA omitas la clave.
- Si el proyecto dura más de 16 semanas: usa exactamente 1 o 2 actividades por semana y redacta instrucciones concisas (máximo 2 oraciones), para que la respuesta no sea excesivamente larga.
Respondes SOLO con JSON válido: {"semanas":[{"numero":1,"fase":"socializacion","objetivo":"...","descripcion":"...","actividades":[{"titulo":"...","instrucciones":"...","criterioEvaluacion":"...","codigoDcd":null,"asignatura":"...","recursos":"...","evidencia":"..."}]}]}`;

  const usuario = `Proyecto: ${contexto.titulo}
Reto: ${contexto.reto}
Grado: ${contexto.grado} (${contexto.edadReferencial} años)
Duración total: ${contexto.duracionSemanas} semanas (genera exactamente ese número de semanas)

Destrezas con criterios de desempeño:

${listaDcd}${bloqueHabilidades(contexto)}

Genera la planificación semanal completa con sus actividades.`;

  // Reintento automático: si la primera respuesta no valida (JSON malformado
  // o claves faltantes), se pide una vez más recordando el formato exacto.
  let ultimoError: unknown;
  for (let intento = 0; intento < 2; intento++) {
    const recordatorio =
      intento === 0
        ? ""
        : "\n\nRECUERDA: responde SOLO el objeto JSON, con TODAS las claves de cada actividad (usa null si no aplica) y sin texto adicional.";
    try {
      const crudo = await completarJSON(sistema, usuario + recordatorio, {
        temperature: 0.6,
        maxTokens: 16000,
      });
      return esquemaPlanificacion.parse(JSON.parse(extraerJSON(crudo)));
    } catch (error) {
      ultimoError = error;
    }
  }
  throw ultimoError;
}
