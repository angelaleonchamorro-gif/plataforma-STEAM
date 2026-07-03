-- ============================================================
-- EDINUN STEAM — Storage de evidencias de actividades
-- Bucket privado: el estudiante sube a su carpeta
-- (evidencias/{estudianteId}/{actividadId}/archivo) y el docente
-- del proyecto puede verlas. Ejecutar en el SQL Editor de Supabase.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidencias',
  'evidencias',
  false,
  10485760, -- 10 MB por archivo
  array['image/png','image/jpeg','image/webp','image/gif','application/pdf','video/mp4']
)
on conflict (id) do nothing;

-- El estudiante gestiona SOLO su carpeta: {su uid}/...
create policy "estudiante gestiona sus evidencias"
on storage.objects for all
using (
  bucket_id = 'evidencias'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'evidencias'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- El docente lee las evidencias de actividades de SUS proyectos.
-- La ruta es {estudianteId}/{actividadId}/archivo → 2do folder = actividad.
create policy "docente lee evidencias de sus proyectos"
on storage.objects for select
using (
  bucket_id = 'evidencias'
  and exists (
    select 1 from public.actividades a
    where a.id::text = (storage.foldername(name))[2]
      and public.fn_es_docente_de_proyecto(a.proyecto_id)
  )
);
