-- ============================================================
-- EDINUN STEAM — Configuración por subnivel + avances del directivo
-- 1) La frecuencia y duración de proyectos se define POR SUBNIVEL
--    (Elemental, Media, Superior, BGU), a discreción del directivo.
-- 2) El directivo puede VER (solo lectura) los proyectos, actividades,
--    matrícula y entregas de su institución para seguir los avances.
-- 3) El directivo puede crear asignaturas personalizadas ("Otra").
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

-- ---------- 1. Configuración por subnivel ----------

create table configuracion_subniveles (
  institucion_id uuid not null references instituciones (id) on delete cascade,
  subnivel text not null check (subnivel in ('Elemental', 'Media', 'Superior', 'BGU')),
  frecuencia_proyectos text not null default 'trimestral',
  duracion_meses int not null default 3 check (duracion_meses between 1 and 9),
  actualizado_por uuid references perfiles (id),
  updated_at timestamptz not null default now(),
  primary key (institucion_id, subnivel)
);

alter table configuracion_subniveles enable row level security;

create policy "institucion ve su configuracion por subnivel" on configuracion_subniveles
  for select using (institucion_id = fn_mi_institucion());
create policy "directivo gestiona configuracion por subnivel" on configuracion_subniveles
  for all using (
    institucion_id = fn_mi_institucion() and fn_mi_rol() = 'directivo'
  );

-- Migrar la configuración global existente a los 4 subniveles.
insert into configuracion_subniveles
  (institucion_id, subnivel, frecuencia_proyectos, duracion_meses, actualizado_por)
select ci.institucion_id, s.subnivel, ci.frecuencia_proyectos, ci.duracion_meses, ci.actualizado_por
from configuracion_institucional ci
cross join (values ('Elemental'), ('Media'), ('Superior'), ('BGU')) as s (subnivel)
on conflict do nothing;

drop table configuracion_institucional;

-- ---------- 2. Visibilidad de avances para el directivo ----------

create or replace function fn_soy_directivo_de_clase(p_clase uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from clases c
    join perfiles p on p.id = auth.uid()
    where c.id = p_clase
      and p.rol = 'directivo'
      and p.institucion_id = c.institucion_id
  )
$$;

create or replace function fn_soy_directivo_de_proyecto(p_proyecto uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from proyectos pr
    join clases c on c.id = pr.clase_id
    join perfiles p on p.id = auth.uid()
    where pr.id = p_proyecto
      and p.rol = 'directivo'
      and p.institucion_id = c.institucion_id
  )
$$;

create policy "directivo ve proyectos de su institucion" on proyectos
  for select using (fn_soy_directivo_de_clase(clase_id));

create policy "directivo ve matricula de su institucion" on clase_estudiantes
  for select using (fn_soy_directivo_de_clase(clase_id));

create policy "directivo ve actividades de su institucion" on actividades
  for select using (fn_soy_directivo_de_proyecto(proyecto_id));

create policy "directivo ve planificacion de su institucion" on planificacion_semanas
  for select using (fn_soy_directivo_de_proyecto(proyecto_id));

create policy "directivo ve entregas de su institucion" on entregas
  for select using (
    exists (
      select 1 from actividades a
      where a.id = actividad_id and fn_soy_directivo_de_proyecto(a.proyecto_id)
    )
  );

-- ---------- 3. Asignaturas personalizadas ----------

create policy "directivo crea asignaturas personalizadas" on asignaturas
  for insert with check (fn_mi_rol() = 'directivo' and es_principal = false);
