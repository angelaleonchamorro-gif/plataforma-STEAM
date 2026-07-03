-- ============================================================
-- EDINUN STEAM — Artículo científico (divulgación BGU)
-- Cada estudiante de bachillerato redacta un artículo con
-- estructura IMRD como producto de la fase de divulgación.
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

create table articulos_cientificos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos (id) on delete cascade,
  estudiante_id uuid not null references perfiles (id) on delete cascade,
  -- Secciones IMRD: {titulo, resumen, introduccion, materiales_metodos,
  --                  resultados, discusion, conclusiones, referencias}
  secciones jsonb not null default '{}',
  estado estado_entrega not null default 'en_progreso',
  entregado_at timestamptz,
  retroalimentacion text,
  calificacion numeric(5, 2),
  revisado_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (proyecto_id, estudiante_id)
);

create index idx_articulos_proyecto on articulos_cientificos (proyecto_id);

alter table articulos_cientificos enable row level security;

create policy "estudiante gestiona su articulo" on articulos_cientificos
  for all using (estudiante_id = auth.uid())
  with check (estudiante_id = auth.uid() and fn_es_estudiante_de_proyecto(proyecto_id));

create policy "docente gestiona articulos de sus proyectos" on articulos_cientificos
  for all using (fn_es_docente_de_proyecto(proyecto_id));
