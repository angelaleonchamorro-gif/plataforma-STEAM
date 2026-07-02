-- ============================================================
-- EDINUN STEAM — Esquema inicial
-- Plataforma de generación y seguimiento de proyectos STEAM
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ---------- ENUMS ----------

create type rol_usuario as enum ('directivo', 'docente', 'estudiante');

create type fase_proyecto as enum (
  'socializacion',        -- reto + preguntas de reflexión (desequilibrio cognitivo)
  'indagacion',           -- desarrollo de DCD + evaluación
  'diseno_plan_accion',   -- diseño del prototipo, materiales, proceso
  'prototipado',          -- construcción
  'pruebas_rediseno',     -- cuantificar desempeño, mejoras
  'divulgacion'           -- artículo científico (BGU) / exposición, carteles, videos (menores)
);

create type estado_proyecto as enum ('definicion', 'planificacion', 'en_ejecucion', 'finalizado');

create type estado_entrega as enum ('pendiente', 'en_progreso', 'entregada', 'revisada');

create type tipo_generacion_ia as enum ('temas', 'planificacion', 'actividades');

create type estado_generacion_ia as enum ('ok', 'error');

-- ---------- INSTITUCIONES Y PERFILES ----------

create table instituciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  codigo_amie text unique,
  created_at timestamptz not null default now()
);

create table perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  institucion_id uuid references instituciones (id) on delete set null,
  rol rol_usuario not null default 'estudiante',
  nombres text not null,
  apellidos text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Espacio de definición institucional (directivos):
-- frecuencia de proyectos, duración disponible (1 a 9 meses) y asignaturas.
create table configuracion_institucional (
  institucion_id uuid primary key references instituciones (id) on delete cascade,
  frecuencia_proyectos text not null default 'trimestral',
  duracion_meses int not null default 3 check (duracion_meses between 1 and 9),
  actualizado_por uuid references perfiles (id),
  updated_at timestamptz not null default now()
);

-- ---------- CURRÍCULO ----------

-- Catálogo global de asignaturas. Las 5 principales STEAM van marcadas.
create table asignaturas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,   -- 'CN', 'MAT', 'TEC', 'ING', 'ECA', 'LL', 'CS', 'EF'...
  nombre text not null,
  es_principal boolean not null default false
);

-- Asignaturas habilitadas por cada institución para sus proyectos.
create table institucion_asignaturas (
  institucion_id uuid not null references instituciones (id) on delete cascade,
  asignatura_id uuid not null references asignaturas (id) on delete cascade,
  primary key (institucion_id, asignatura_id)
);

-- Destrezas con criterios de desempeño (seed desde los PDF del Mineduc).
create table dcd (
  id uuid primary key default gen_random_uuid(),
  asignatura_id uuid not null references asignaturas (id) on delete cascade,
  codigo text not null,          -- ej. 'CN.4.1.1'
  descripcion text not null,
  subnivel text not null,        -- 'Preparatoria','Elemental','Media','Superior','BGU'
  grado text,                    -- opcional: '8vo EGB', '1ero BGU'...
  unique (asignatura_id, codigo)
);

-- ---------- CLASES Y MATRÍCULA ----------

create table clases (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones (id) on delete cascade,
  docente_id uuid not null references perfiles (id) on delete cascade,
  nombre text not null,
  grado text not null,                 -- '8vo EGB', '1ero BGU'...
  edad_referencial int not null,       -- edad promedio, insumo para la IA
  codigo_invitacion text not null unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now()
);

create table clase_estudiantes (
  clase_id uuid not null references clases (id) on delete cascade,
  estudiante_id uuid not null references perfiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (clase_id, estudiante_id)
);

-- ---------- PROYECTOS STEAM ----------

create table proyectos (
  id uuid primary key default gen_random_uuid(),
  clase_id uuid not null references clases (id) on delete cascade,
  estado estado_proyecto not null default 'definicion',
  titulo text,                         -- tema elegido (de los 3 sugeridos o editado)
  reto text,                           -- situación/reto de la fase de socialización
  duracion_semanas int not null default 4 check (duracion_semanas between 4 and 36),
  fecha_inicio date,
  created_at timestamptz not null default now()
);

-- DCD seleccionadas para el proyecto. es_conexion = asignatura añadida con el botón "+".
create table proyecto_dcd (
  proyecto_id uuid not null references proyectos (id) on delete cascade,
  dcd_id uuid not null references dcd (id) on delete cascade,
  es_conexion boolean not null default false,
  primary key (proyecto_id, dcd_id)
);

-- Planificación semanal generada por la IA y editable por el docente.
create table planificacion_semanas (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos (id) on delete cascade,
  numero_semana int not null,
  fase fase_proyecto not null,
  objetivo text not null,
  descripcion text,
  unique (proyecto_id, numero_semana)
);

-- Actividades fungibles que desarrollan los estudiantes.
create table actividades (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos (id) on delete cascade,
  semana_id uuid references planificacion_semanas (id) on delete set null,
  fase fase_proyecto not null,
  dcd_id uuid references dcd (id) on delete set null,  -- DCD que desarrolla (fase indagación)
  titulo text not null,
  instrucciones text not null,
  criterio_evaluacion text,            -- cómo se evalúa la actividad
  orden int not null default 0,
  generada_por_ia boolean not null default false,
  publicada boolean not null default false,  -- visible para estudiantes solo si true
  created_at timestamptz not null default now()
);

-- ---------- TRAZABILIDAD ----------

-- Entrega de cada estudiante por actividad: el registro grueso de trazabilidad.
create table entregas (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references actividades (id) on delete cascade,
  estudiante_id uuid not null references perfiles (id) on delete cascade,
  estado estado_entrega not null default 'pendiente',
  contenido text,
  evidencia_url text,                  -- foto/documento en Supabase Storage
  entregada_at timestamptz,
  retroalimentacion text,
  calificacion numeric(5, 2),
  revisada_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (actividad_id, estudiante_id)
);

-- Eventos finos de trazabilidad (fire-and-forget: métricas, no transacciones).
create table eventos_actividad (
  id bigint generated always as identity primary key,
  actividad_id uuid not null references actividades (id) on delete cascade,
  estudiante_id uuid references perfiles (id) on delete set null,
  tipo_evento text not null,           -- 'abrio', 'inicio', 'guardo_avance', 'entrego', 'reviso'...
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Log de generaciones de IA (degradación elegante: si Groq falla, se registra y no rompe).
create table generaciones_ia (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos (id) on delete cascade,
  tipo tipo_generacion_ia not null,
  modelo text not null,
  respuesta jsonb,
  estado estado_generacion_ia not null,
  error text,
  created_at timestamptz not null default now()
);

-- ---------- ÍNDICES ----------

create index idx_perfiles_institucion on perfiles (institucion_id);
create index idx_dcd_asignatura_subnivel on dcd (asignatura_id, subnivel);
create index idx_clases_docente on clases (docente_id);
create index idx_proyectos_clase on proyectos (clase_id);
create index idx_actividades_proyecto on actividades (proyecto_id);
create index idx_entregas_actividad on entregas (actividad_id);
create index idx_entregas_estudiante on entregas (estudiante_id);
create index idx_eventos_actividad on eventos_actividad (actividad_id, created_at);

-- ---------- FUNCIONES AUXILIARES (para RLS) ----------

create or replace function fn_mi_rol() returns rol_usuario
language sql stable security definer set search_path = public as $$
  select rol from perfiles where id = auth.uid()
$$;

create or replace function fn_mi_institucion() returns uuid
language sql stable security definer set search_path = public as $$
  select institucion_id from perfiles where id = auth.uid()
$$;

-- ¿El docente autenticado es dueño de la clase del proyecto?
create or replace function fn_es_docente_de_proyecto(p_proyecto uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from proyectos p
    join clases c on c.id = p.clase_id
    where p.id = p_proyecto and c.docente_id = auth.uid()
  )
$$;

-- ¿El estudiante autenticado está matriculado en la clase del proyecto?
create or replace function fn_es_estudiante_de_proyecto(p_proyecto uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from proyectos p
    join clase_estudiantes ce on ce.clase_id = p.clase_id
    where p.id = p_proyecto and ce.estudiante_id = auth.uid()
  )
$$;

-- ---------- RLS (Zero Trust: nada visible sin política explícita) ----------

alter table instituciones enable row level security;
alter table perfiles enable row level security;
alter table configuracion_institucional enable row level security;
alter table asignaturas enable row level security;
alter table institucion_asignaturas enable row level security;
alter table dcd enable row level security;
alter table clases enable row level security;
alter table clase_estudiantes enable row level security;
alter table proyectos enable row level security;
alter table proyecto_dcd enable row level security;
alter table planificacion_semanas enable row level security;
alter table actividades enable row level security;
alter table entregas enable row level security;
alter table eventos_actividad enable row level security;
alter table generaciones_ia enable row level security;

-- Instituciones: visibles para sus miembros.
create policy "miembros ven su institucion" on instituciones
  for select using (id = fn_mi_institucion());

-- Perfiles: cada uno ve/edita el suyo; directivo y docente ven perfiles de su institución.
create policy "yo veo mi perfil" on perfiles
  for select using (id = auth.uid());
create policy "yo actualizo mi perfil" on perfiles
  for update using (id = auth.uid());
create policy "yo creo mi perfil" on perfiles
  for insert with check (id = auth.uid());
create policy "staff ve perfiles de su institucion" on perfiles
  for select using (
    institucion_id = fn_mi_institucion()
    and fn_mi_rol() in ('directivo', 'docente')
  );

-- Configuración institucional: la ve toda la institución; la edita el directivo.
create policy "institucion ve su configuracion" on configuracion_institucional
  for select using (institucion_id = fn_mi_institucion());
create policy "directivo gestiona configuracion" on configuracion_institucional
  for all using (
    institucion_id = fn_mi_institucion() and fn_mi_rol() = 'directivo'
  );

-- Catálogos de currículo: lectura para todo usuario autenticado.
create policy "catalogo asignaturas" on asignaturas
  for select using (auth.uid() is not null);
create policy "catalogo dcd" on dcd
  for select using (auth.uid() is not null);

-- Asignaturas habilitadas por institución.
create policy "institucion ve sus asignaturas" on institucion_asignaturas
  for select using (institucion_id = fn_mi_institucion());
create policy "directivo gestiona asignaturas" on institucion_asignaturas
  for all using (
    institucion_id = fn_mi_institucion() and fn_mi_rol() = 'directivo'
  );

-- Clases: el docente gestiona las suyas; el estudiante ve donde está matriculado;
-- el directivo ve las de su institución.
create policy "docente gestiona sus clases" on clases
  for all using (docente_id = auth.uid());
create policy "estudiante ve sus clases" on clases
  for select using (
    exists (select 1 from clase_estudiantes ce
            where ce.clase_id = id and ce.estudiante_id = auth.uid())
  );
create policy "directivo ve clases de su institucion" on clases
  for select using (
    institucion_id = fn_mi_institucion() and fn_mi_rol() = 'directivo'
  );

-- Matrícula.
create policy "docente gestiona matricula" on clase_estudiantes
  for all using (
    exists (select 1 from clases c where c.id = clase_id and c.docente_id = auth.uid())
  );
create policy "estudiante ve su matricula" on clase_estudiantes
  for select using (estudiante_id = auth.uid());
create policy "estudiante se une por codigo" on clase_estudiantes
  for insert with check (estudiante_id = auth.uid());

-- Proyectos y sus piezas.
create policy "docente gestiona sus proyectos" on proyectos
  for all using (
    exists (select 1 from clases c where c.id = clase_id and c.docente_id = auth.uid())
  );
create policy "estudiante ve proyectos de su clase" on proyectos
  for select using (fn_es_estudiante_de_proyecto(id));

create policy "docente gestiona proyecto_dcd" on proyecto_dcd
  for all using (fn_es_docente_de_proyecto(proyecto_id));
create policy "estudiante ve proyecto_dcd" on proyecto_dcd
  for select using (fn_es_estudiante_de_proyecto(proyecto_id));

create policy "docente gestiona planificacion" on planificacion_semanas
  for all using (fn_es_docente_de_proyecto(proyecto_id));
create policy "estudiante ve planificacion" on planificacion_semanas
  for select using (fn_es_estudiante_de_proyecto(proyecto_id));

-- Actividades: el estudiante SOLO ve las publicadas.
create policy "docente gestiona actividades" on actividades
  for all using (fn_es_docente_de_proyecto(proyecto_id));
create policy "estudiante ve actividades publicadas" on actividades
  for select using (publicada and fn_es_estudiante_de_proyecto(proyecto_id));

-- Entregas (trazabilidad): el estudiante crea/edita la suya; el docente ve y
-- retroalimenta todas las de sus proyectos.
create policy "estudiante gestiona su entrega" on entregas
  for all using (estudiante_id = auth.uid())
  with check (estudiante_id = auth.uid());
create policy "docente gestiona entregas de sus proyectos" on entregas
  for all using (
    exists (select 1 from actividades a
            where a.id = actividad_id and fn_es_docente_de_proyecto(a.proyecto_id))
  );

-- Eventos: el estudiante inserta los suyos; el docente los lee.
create policy "estudiante registra eventos" on eventos_actividad
  for insert with check (estudiante_id = auth.uid());
create policy "docente lee eventos" on eventos_actividad
  for select using (
    exists (select 1 from actividades a
            where a.id = actividad_id and fn_es_docente_de_proyecto(a.proyecto_id))
  );

-- Generaciones IA: solo el docente del proyecto (se insertan con service role).
create policy "docente lee generaciones ia" on generaciones_ia
  for select using (fn_es_docente_de_proyecto(proyecto_id));

-- ---------- SEED: ASIGNATURAS ----------

insert into asignaturas (codigo, nombre, es_principal) values
  ('CN',  'Ciencias Naturales', true),
  ('TEC', 'Tecnología', true),
  ('ING', 'Ingeniería', true),
  ('ECA', 'Educación Cultural y Artística', true),
  ('MAT', 'Matemática', true),
  ('LL',  'Lengua y Literatura', false),
  ('CS',  'Ciencias Sociales', false),
  ('EF',  'Educación Física', false),
  ('EXT', 'Lengua Extranjera (Inglés)', false),
  ('FIS', 'Física', false),
  ('QUI', 'Química', false),
  ('BIO', 'Biología', false);
