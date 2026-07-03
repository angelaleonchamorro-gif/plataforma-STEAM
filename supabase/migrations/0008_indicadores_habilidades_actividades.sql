-- ============================================================
-- EDINUN STEAM — Bloque docente 1:
-- 1) dcd.indicador: indicador de evaluación del currículo (para rúbricas)
-- 2) proyecto_habilidades: habilidades de Tecnología e Ingeniería que el
--    docente escribe (el currículo del Mineduc no trae DCD para ellas)
-- 3) actividades enriquecidas: asignatura, recursos y evidencia esperada
--    (formato de la Planificación Microcurricular STEAM)
-- Ejecutar en el SQL Editor de Supabase.
-- Después de ejecutarla: node scripts/cargar_dcd.mjs (recarga las DCD
-- con sus indicadores).
-- ============================================================

alter table dcd add column indicador text;

alter table actividades
  add column asignatura_id uuid references asignaturas (id) on delete set null,
  add column recursos text,
  add column evidencia text;

create table proyecto_habilidades (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos (id) on delete cascade,
  componente text not null check (componente in ('tecnologia', 'ingenieria')),
  descripcion text not null,
  indicador text,
  orden int not null default 0
);

create index idx_habilidades_proyecto on proyecto_habilidades (proyecto_id);

alter table proyecto_habilidades enable row level security;

create policy "docente gestiona habilidades" on proyecto_habilidades
  for all using (fn_es_docente_de_proyecto(proyecto_id));
create policy "estudiante ve habilidades" on proyecto_habilidades
  for select using (fn_es_estudiante_de_proyecto(proyecto_id));
create policy "directivo ve habilidades" on proyecto_habilidades
  for select using (fn_soy_directivo_de_proyecto(proyecto_id));
