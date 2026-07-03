-- ============================================================
-- EDINUN STEAM — Bloque docente 4: muro colaborativo (tipo Padlet)
-- Las entregas de una actividad se ven como tarjetas en un muro,
-- visible para docentes, co-docentes Y estudiantes de la clase, con
-- comentarios de todos. IMPORTANTE: el muro NUNCA expone
-- calificaciones ni retroalimentación formal (por eso se lee a
-- través de funciones security definer con columnas controladas).
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

-- ¿Puedo ver el muro de esta actividad? (estudiante matriculado,
-- docente líder, co-docente o directivo; solo actividades publicadas)
create or replace function fn_puedo_ver_muro(p_actividad uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from actividades a
    where a.id = p_actividad
      and a.publicada
      and (
        fn_es_estudiante_de_proyecto(a.proyecto_id)
        or fn_es_docente_de_proyecto(a.proyecto_id)
        or fn_soy_codocente_de_proyecto(a.proyecto_id)
        or fn_soy_directivo_de_proyecto(a.proyecto_id)
      )
  )
$$;

-- Tarjetas del muro: SOLO columnas seguras (sin nota ni retroalimentación).
create or replace function fn_muro_actividad(p_actividad uuid)
returns table (
  entrega_id uuid,
  estudiante_id uuid,
  nombres text,
  apellidos text,
  contenido text,
  evidencia_url text,
  entregada_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select e.id, e.estudiante_id, p.nombres, p.apellidos,
         e.contenido, e.evidencia_url, e.entregada_at
  from entregas e
  join perfiles p on p.id = e.estudiante_id
  where e.actividad_id = p_actividad
    and e.estado in ('entregada', 'revisada')
    and fn_puedo_ver_muro(p_actividad)
  order by e.entregada_at desc nulls last
$$;

-- ---------- Comentarios del muro ----------

create table comentarios_muro (
  id uuid primary key default gen_random_uuid(),
  entrega_id uuid not null references entregas (id) on delete cascade,
  autor_id uuid not null references perfiles (id) on delete cascade,
  texto text not null check (length(texto) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index idx_comentarios_entrega on comentarios_muro (entrega_id, created_at);

-- ¿Puedo comentar/ver comentarios de esta entrega? (misma regla del muro)
create or replace function fn_puedo_comentar_entrega(p_entrega uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from entregas e
    where e.id = p_entrega
      and e.estado in ('entregada', 'revisada')
      and fn_puedo_ver_muro(e.actividad_id)
  )
$$;

alter table comentarios_muro enable row level security;

create policy "participantes ven comentarios" on comentarios_muro
  for select using (fn_puedo_comentar_entrega(entrega_id));
create policy "participantes comentan" on comentarios_muro
  for insert with check (autor_id = auth.uid() and fn_puedo_comentar_entrega(entrega_id));
create policy "autor elimina su comentario" on comentarios_muro
  for delete using (autor_id = auth.uid());
create policy "docente modera comentarios" on comentarios_muro
  for delete using (
    exists (
      select 1 from entregas e
      join actividades a on a.id = e.actividad_id
      where e.id = entrega_id and fn_es_docente_de_proyecto(a.proyecto_id)
    )
  );

-- Comentarios con nombre y rol del autor (los estudiantes no pueden leer
-- perfiles ajenos directamente; esta función entrega solo lo necesario).
create or replace function fn_comentarios_actividad(p_actividad uuid)
returns table (
  comentario_id uuid,
  entrega_id uuid,
  autor_id uuid,
  autor_nombre text,
  autor_rol rol_usuario,
  texto text,
  created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select c.id, c.entrega_id, c.autor_id,
         p.nombres || ' ' || p.apellidos, p.rol, c.texto, c.created_at
  from comentarios_muro c
  join perfiles p on p.id = c.autor_id
  join entregas e on e.id = c.entrega_id
  where e.actividad_id = p_actividad
    and fn_puedo_ver_muro(p_actividad)
  order by c.created_at
$$;

-- Los estudiantes del proyecto ven las evidencias de las actividades
-- publicadas (necesario para el muro).
create policy "estudiantes ven evidencias del muro"
on storage.objects for select
using (
  bucket_id = 'evidencias'
  and exists (
    select 1 from public.actividades a
    where a.id::text = (storage.foldername(name))[2]
      and a.publicada
      and public.fn_es_estudiante_de_proyecto(a.proyecto_id)
  )
);
