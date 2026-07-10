-- ============================================================
-- EDINUN STEAM — El co-docente ve las destrezas del proyecto
-- (única política que faltaba para la vista completa de lectura
-- del proyecto compartido). Ejecutar en el SQL Editor de Supabase.
-- ============================================================

create policy "codocente ve proyecto_dcd" on proyecto_dcd
  for select using (fn_soy_codocente_de_proyecto(proyecto_id));
