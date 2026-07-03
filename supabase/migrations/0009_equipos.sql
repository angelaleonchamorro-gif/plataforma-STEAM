-- ============================================================
-- EDINUN STEAM — Bloque docente 2: equipos de trabajo con roles
-- Trabajo colaborativo: el docente arma equipos por proyecto y
-- asigna un rol a cada integrante. Un estudiante pertenece a UN
-- equipo por proyecto.
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

create table equipos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos (id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now(),
  unique (proyecto_id, nombre)
);

create table equipo_miembros (
  equipo_id uuid not null references equipos (id) on delete cascade,
  -- Denormalizado para garantizar "un equipo por proyecto por estudiante".
  proyecto_id uuid not null references proyectos (id) on delete cascade,
  estudiante_id uuid not null references perfiles (id) on delete cascade,
  rol text,
  primary key (equipo_id, estudiante_id),
  unique (proyecto_id, estudiante_id)
);

create index idx_equipos_proyecto on equipos (proyecto_id);
create index idx_equipo_miembros_estudiante on equipo_miembros (estudiante_id);

alter table equipos enable row level security;
alter table equipo_miembros enable row level security;

create policy "docente gestiona equipos" on equipos
  for all using (fn_es_docente_de_proyecto(proyecto_id));
create policy "estudiante ve equipos" on equipos
  for select using (fn_es_estudiante_de_proyecto(proyecto_id));
create policy "directivo ve equipos" on equipos
  for select using (fn_soy_directivo_de_proyecto(proyecto_id));

create policy "docente gestiona miembros" on equipo_miembros
  for all using (fn_es_docente_de_proyecto(proyecto_id));
create policy "estudiante ve miembros" on equipo_miembros
  for select using (fn_es_estudiante_de_proyecto(proyecto_id));
create policy "directivo ve miembros" on equipo_miembros
  for select using (fn_soy_directivo_de_proyecto(proyecto_id));
