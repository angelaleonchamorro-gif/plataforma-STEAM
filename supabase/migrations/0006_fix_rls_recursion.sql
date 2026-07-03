-- ============================================================
-- EDINUN STEAM — Fix: recursión infinita en RLS
-- Las políticas de `clases` y `clase_estudiantes` se referenciaban
-- mutuamente (clases → clase_estudiantes → clases → …), lo que hace
-- que PostgreSQL aborte con "infinite recursion detected in policy".
-- Se rompen los ciclos con funciones SECURITY DEFINER (consultan
-- las tablas sin aplicar RLS, igual que fn_es_docente_de_proyecto).
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

-- ¿El usuario autenticado es el docente dueño de la clase?
create or replace function fn_soy_docente_de_clase(p_clase uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from clases c
    where c.id = p_clase and c.docente_id = auth.uid()
  )
$$;

-- ¿El usuario autenticado está matriculado en la clase?
create or replace function fn_estoy_matriculado(p_clase uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from clase_estudiantes ce
    where ce.clase_id = p_clase and ce.estudiante_id = auth.uid()
  )
$$;

-- clases: la política del estudiante ya no consulta clase_estudiantes directo.
drop policy "estudiante ve sus clases" on clases;
create policy "estudiante ve sus clases" on clases
  for select using (fn_estoy_matriculado(id));

-- clase_estudiantes: la política del docente ya no consulta clases directo.
drop policy "docente gestiona matricula" on clase_estudiantes;
create policy "docente gestiona matricula" on clase_estudiantes
  for all using (fn_soy_docente_de_clase(clase_id));

-- proyectos: usar también la función (evita re-evaluar políticas de clases).
drop policy "docente gestiona sus proyectos" on proyectos;
create policy "docente gestiona sus proyectos" on proyectos
  for all using (fn_soy_docente_de_clase(clase_id));
