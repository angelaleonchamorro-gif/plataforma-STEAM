import Groq from "groq-sdk";
import { z } from "zod";

// Motor de IA (Groq). Filosofía EDINUN: la IA SUGIERE, el docente revisa y
// edita. Si Groq falla, se registra el error y la plataforma sigue funcionando
// (degradación elegante) — nunca se bloquea el flujo del docente.

export const MODELO_IA = "llama-3.3-70b-versatile";

function clienteGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
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

  const completion = await clienteGroq().chat.completions.create({
    model: MODELO_IA,
    temperature: 0.8,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Eres un experto en pedagogía STEAM y en el currículo ecuatoriano del Ministerio de Educación.
Propones temas de proyectos escolares STEAM apropiados para la edad de los estudiantes, que integren las destrezas con criterios de desempeño (DCD) seleccionadas por el docente.
Cada tema debe culminar en un PROTOTIPO construible con materiales fungibles accesibles en Ecuador.
Respondes SIEMPRE en español y SOLO con JSON válido con esta forma exacta:
{"temas":[{"titulo":"...","descripcion":"...","reto":"...","justificacion":"..."}]}
- "titulo": nombre atractivo del proyecto (máx. 10 palabras).
- "descripcion": 2-3 oraciones de qué trata el proyecto.
- "reto": el desafío concreto y medible que los estudiantes deben resolver con su prototipo.
- "justificacion": cómo el tema integra las DCD seleccionadas.
Devuelve exactamente 3 temas.`,
      },
      {
        role: "user",
        content: `Grado: ${contexto.grado}
Edad de los estudiantes: ${contexto.edadReferencial} años
Duración del proyecto: ${contexto.duracionSemanas} semanas

Destrezas con criterios de desempeño seleccionadas:

${listaDcd}${bloqueHabilidades(contexto)}

Sugiere 3 temas de proyecto STEAM.`,
      },
    ],
  });

  const crudo = completion.choices[0]?.message?.content ?? "{}";
  return esquemaTemas.parse(JSON.parse(crudo));
}

// ---------- Planificación semanal + actividades por fase ----------

export const esquemaPlanificacion = z.object({
  semanas: z.array(
    z.object({
      numero: z.number().int().min(1),
      fase: z.enum([
        "socializacion",
        "indagacion",
        "diseno_plan_accion",
        "prototipado",
        "pruebas_rediseno",
        "divulgacion",
      ]),
      objetivo: z.string(),
      descripcion: z.string(),
      actividades: z.array(
        z.object({
          titulo: z.string(),
          instrucciones: z.string(),
          criterioEvaluacion: z.string(),
          codigoDcd: z.string().nullable(),
          asignatura: z.string().nullable(),
          recursos: z.string().nullable(),
          evidencia: z.string().nullable(),
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

  const completion = await clienteGroq().chat.completions.create({
    model: MODELO_IA,
    temperature: 0.6,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Eres un experto en pedagogía STEAM y en el currículo ecuatoriano.
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
Respondes SOLO con JSON válido: {"semanas":[{"numero":1,"fase":"socializacion","objetivo":"...","descripcion":"...","actividades":[{"titulo":"...","instrucciones":"...","criterioEvaluacion":"...","codigoDcd":null,"asignatura":"...","recursos":"...","evidencia":"..."}]}]}`,
      },
      {
        role: "user",
        content: `Proyecto: ${contexto.titulo}
Reto: ${contexto.reto}
Grado: ${contexto.grado} (${contexto.edadReferencial} años)
Duración total: ${contexto.duracionSemanas} semanas (genera exactamente ese número de semanas)

Destrezas con criterios de desempeño:

${listaDcd}${bloqueHabilidades(contexto)}

Genera la planificación semanal completa con sus actividades.`,
      },
    ],
  });

  const crudo = completion.choices[0]?.message?.content ?? "{}";
  return esquemaPlanificacion.parse(JSON.parse(crudo));
}
