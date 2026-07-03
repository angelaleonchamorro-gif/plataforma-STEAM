-- ============================================================
-- EDINUN STEAM — Catálogo oficial AMIE (Mineduc)
-- Registro maestro de instituciones educativas del Ecuador.
-- Los datos se cargan con: node scripts/cargar_amie.mjs
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

create table amie_catalogo (
  codigo text primary key,          -- código AMIE, ej. '01H00659'
  nombre text not null,             -- nombre oficial de la institución
  provincia text,
  canton text,
  sostenimiento text,               -- Fiscal / Particular / Fiscomisional / Municipal
  nivel_educacion text
);

alter table amie_catalogo enable row level security;
-- Sin políticas: solo el servidor (service role) consulta el catálogo,
-- a través de /api/amie/consulta y de la validación de registro.
