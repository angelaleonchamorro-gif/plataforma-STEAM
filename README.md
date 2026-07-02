# EDINUN STEAM

Plataforma para la **generación y seguimiento de proyectos escolares STEAM** basados en el currículo ecuatoriano (destrezas con criterios de desempeño del Mineduc), con IA (Groq) como motor de sugerencia de temas y planificaciones.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript estricto — un solo repo full-stack
- **Tailwind v4** + tokens CSS del sistema de diseño EDINUN Conecta (Poppins, acento `#F69E26`, navy `#151E29`, espaciado áureo)
- **Supabase** — PostgreSQL + Auth + RLS (Zero Trust: toda regla de acceso vive en la base)
- **Groq** (`llama-3.3-70b-versatile`) — sugerencia de 3 temas y generación de planificación semanal + actividades
- **Vercel** — hosting

## Cómo funciona (metodología)

1. **Directivos** definen la configuración institucional: frecuencia de proyectos, duración (1–9 meses) y asignaturas que intervienen.
2. **El docente crea su clase** y dentro de ella selecciona las **DCD del currículo** por asignatura (principales: CCNN, Tecnología, Ingeniería, Arte, Matemática; botón "+" para conexiones con otras asignaturas).
3. **La IA sugiere 3 temas** acordes a la edad de los estudiantes y las destrezas seleccionadas.
4. **La IA genera** la planificación semanal, el cronograma y las actividades fungibles, organizadas en las 6 fases: **Socialización → Indagación → Diseño y plan de acción → Prototipado → Pruebas y rediseño → Divulgación** (artículo científico en BGU; exposición/carteles/videos en grados menores). El docente revisa, edita y **publica** — la IA sugiere, no decide.
5. **Los estudiantes** desarrollan y entregan las actividades; cada entrega y evento genera **trazabilidad para el docente** (tablas `entregas` y `eventos_actividad`).

## Setup

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En el **SQL Editor** de Supabase ejecuta `supabase/migrations/0001_esquema_inicial.sql`.
3. Copia `.env.example` a `.env.local` y completa las 4 variables (Supabase URL, anon key, service role key, y `GROQ_API_KEY` de [console.groq.com](https://console.groq.com/keys)).
4. Instala y arranca:

```bash
npm install
npm run dev
```

5. Verificación de tipos: `npm run typecheck`.

## Estructura

```
supabase/migrations/    esquema SQL completo (enums, tablas, RLS, seed de asignaturas)
src/
  app/
    page.tsx            landing pública
    auth/               login + registro (rol resuelto server-side)
    panel/              redirección por rol → institucion | clases | estudiante
    api/auth/registro/  creación de cuentas (directivo/docente/estudiante)
    api/ia/temas/       POST → 3 temas sugeridos por Groq
    api/ia/planificacion/ POST → planificación semanal + actividades (borrador)
  lib/
    supabase/           clientes browser / server / admin (service role)
    ia/groq.ts          prompts y esquemas Zod de la generación con IA
  types/database.ts     tipos de la BD (formato supabase gen types) + FASES_PROYECTO
```

## Datos del currículo (DCD)

La tabla `dcd` se alimenta desde los **PDF del Mineduc**. El proceso de extracción y seed está pendiente: colocar los PDF en `curriculo/pdfs/` y se genera un script de seed por asignatura/subnivel.

## Principios heredados de EDINUN Conecta

- **Zero Trust**: validación siempre en servidor (RLS + verificación de ownership en cada route handler).
- **La IA sugiere, el docente decide**: todo lo generado es borrador editable; si Groq falla, se registra en `generaciones_ia` y el flujo continúa (degradación elegante).
- **Lenguaje sensible**: copy neutro y no comparativo en todo lo que ve el estudiante.
- **Feedback inline**: banners verde/oxide (`.banner-exito` / `.banner-error`), sin toasts.
- **Secretos nunca al cliente**: `SUPABASE_SERVICE_ROLE_KEY` y `GROQ_API_KEY` solo en servidor.

## Roadmap

- [x] Sprint 0: scaffold, esquema BD + RLS, auth por rol, integración Groq, paneles base
- [ ] Sprint 1: extracción de DCD desde PDF del Mineduc + seed
- [ ] Sprint 2: configuración institucional editable (directivo)
- [ ] Sprint 3: creación de clases + selector de DCD por asignatura (con botón "+" de conexiones)
- [ ] Sprint 4: flujo IA completo en UI (3 temas → elegir → planificación → editar → publicar)
- [ ] Sprint 5: portal estudiante (actividades por fase, entregas con evidencia a Storage)
- [ ] Sprint 6: tablero de trazabilidad del docente (estados de entrega, eventos, retroalimentación)
- [ ] Sprint 7: divulgación diferenciada por nivel (plantilla de artículo científico BGU / recursos de exposición)
