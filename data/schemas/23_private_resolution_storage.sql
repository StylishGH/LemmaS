BEGIN;

UPDATE storage.buckets SET public = false WHERE id = 'resolucoes';

DROP POLICY IF EXISTS "Acesso publico resolucoes" ON storage.objects;
DROP POLICY IF EXISTS "Insercao resolucoes autenticadas e anonimas" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload publico em resolucoes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura publica de resolucoes" ON storage.objects;

-- A restrictive policy also limits any broader permissive policy on Storage.
DROP POLICY IF EXISTS resolucoes_owner_boundary ON storage.objects;
CREATE POLICY resolucoes_owner_boundary ON storage.objects AS RESTRICTIVE
FOR ALL TO anon, authenticated
USING (
    bucket_id <> 'resolucoes' OR owner_id = (SELECT auth.uid())::text
)
WITH CHECK (
    bucket_id <> 'resolucoes'
    OR (
        owner_id = (SELECT auth.uid())::text
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    )
);

DROP POLICY IF EXISTS resolucoes_owner_select ON storage.objects;
CREATE POLICY resolucoes_owner_select ON storage.objects
FOR SELECT TO authenticated USING (
    bucket_id = 'resolucoes' AND owner_id = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS resolucoes_owner_insert ON storage.objects;
CREATE POLICY resolucoes_owner_insert ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'resolucoes'
    AND owner_id = (SELECT auth.uid())::text
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

COMMIT;
