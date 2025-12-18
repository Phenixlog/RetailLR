-- ============================================
-- FIX STORAGE POLICIES POUR order-photos
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- 1. Supprimer les anciennes policies du bucket
DROP POLICY IF EXISTS "Admin can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete photos" ON storage.objects;

-- 2. Enable RLS sur storage.objects (si pas déjà fait)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Créer les nouvelles policies pour le bucket order-photos

-- Policy INSERT : Seuls les admins peuvent uploader dans order-photos
CREATE POLICY "Admins can upload to order-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-photos' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy SELECT : Tous les utilisateurs authentifiés peuvent voir les photos
CREATE POLICY "Authenticated users can view order-photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'order-photos');

-- Policy DELETE : Seuls les admins peuvent supprimer
CREATE POLICY "Admins can delete from order-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'order-photos' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- 4. Vérifier les policies du bucket
SELECT *
FROM storage.objects
WHERE bucket_id = 'order-photos'
LIMIT 5;

-- 5. Vérifier les policies storage
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';
