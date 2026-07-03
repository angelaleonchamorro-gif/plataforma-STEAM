-- ============================================================
-- EDINUN STEAM — Bloque docente 3: co-docentes (interdisciplinario)
-- El docente líder invita a colegas de su institución al proyecto,
-- opcionalmente con la asignatura que cubre cada uno. El co-docente
-- ve el proyecto en su panel, da seguimiento y califica con su
-- propia cuenta (queda registrado quién revisó cada entrega).
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

create table proyecto_docentes (
  proyecto_id uuid not null references proyectos (id) on delete cascade,
  docente_id uuid not null references perfiles (id) on delete cascade,
  asignatura_id uuid references asignaturas (id) on delete set null,
  invitado_por uuid references perfiles (id),
  created_at timestamptz not null default now(),
  primary key (proyecto_id, docente_id)
);

create index idx_proyecto_docentes_docente on proyecto_docentes (docente_id);

-- Trazabilidad: quién revisó/calificó cada entrega y cada artículo.
alter table entregas add column revisada_por uuid references perfiles (id);
alter table articulos_cientificos add column revisado_por uuid references perfiles (id);

-- ---------- Funciones (security definer: sin ciclos de RLS) ----------

create or replace function fn_soy_codocente_de_proyecto(p_proyecto uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from proyecto_docentes pd
    where pd.proyecto_id = p_proyecto and pd.docente_id = auth.uid()
  )
$$;

create or replace function fn_soy_codocente_de_clase(p_clase uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from proyecto_docentes pd
    join proyectos p on p.id = pd.proyecto_id
    where p.clase_id = p_clase and pd.docente_id = auth.uid()
  )
$$;

-- ---------- RLS ----------

alter table proyecto_docentes enable row level security;

create policy "docente lider gestiona codocentes" on proyecto_docentes
  for all using (fn_es_docente_de_proyecto(proyecto_id));
create policy "codocente ve su invitacion" on proyecto_docentes
  for select using (docente_id = auth.uid());
create policy "codocentes se ven entre si" on proyecto_docentes
  for select using (fn_soy_codocente_de_proyecto(proyecto_id));

-- Accesos de lectura del co-docente sobre el proyecto y su contexto.
create policy "codocente ve proyectos" on proyectos
  for select using (fn_soy_codocente_de_proyecto(id));
create policy "codocente ve clases" on clases
  for select using (fn_soy_codocente_de_clase(id));
create policy "codocente ve matricula" on clase_estudiantes
  for select using (fn_soy_codocente_de_clase(clase_id));
create policy "codocente ve actividades" on actividades
  for select using (fn_soy_codocente_de_proyecto(proyecto_id));
create policy "codocente ve planificacion" on planificacion_semanas
  for select using (fn_soy_codocente_de_proyecto(proyecto_id));
create policy "codocente ve equipos" on equipos
  for select using (fn_soy_codocente_de_proyecto(proyecto_id));
create policy "codocente ve miembros" on equipo_miembros
  for select using (fn_soy_codocente_de_proyecto(proyecto_id));
create policy "codocente ve habilidades" on proyecto_habilidades
  for select using (fn_soy_codocente_de_proyecto(proyecto_id));

-- El co-docente revisa y califica (entregas y artículos).
create policy "codocente gestiona entregas" on entregas
  for all using (
    exists (
      select 1 from actividades a
      where a.id = actividad_id and fn_soy_codocente_de_proyecto(a.proyecto_id)
    )
  );
create policy "codocente gestiona articulos" on articulos_cientificos
  for all using (fn_soy_codocente_de_proyecto(proyecto_id));
create policy "codocente lee eventos" on eventos_actividad
  for select using (
    exists (
      select 1 from actividades a
      where a.id = actividad_id and fn_soy_codocente_de_proyecto(a.proyecto_id)
    )
  );

-- El co-docente también puede ver las evidencias de Storage del proyecto.
create policy "codocente lee evidencias"
on storage.objects for select
using (
  bucket_id = 'evidencias'
  and exists (
    select 1 from public.actividades a
    where a.id::text = (storage.foldername(name))[2]
      and public.fn_soy_codocente_de_proyecto(a.proyecto_id)
  )
);
