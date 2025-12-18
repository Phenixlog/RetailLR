-- ============================================
-- FIX RLS POLICIES POUR PHOTOS
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- 1. Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Admin can upload photos" ON photos;
DROP POLICY IF EXISTS "Users view photos of their orders" ON photos;
DROP POLICY IF EXISTS "Admin can delete photos" ON photos;

-- 2. Recréer les policies correctes

-- Policy INSERT : Seuls les admins peuvent uploader
CREATE POLICY "Admin can upload photos"
ON photos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy SELECT : Admins, clients et magasins peuvent voir les photos de leurs commandes
CREATE POLICY "Users view photos of their orders"
ON photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM commandes c
    WHERE c.id = photos.commande_id
    AND (
      -- Own order
      c.user_id = auth.uid()
      OR
      -- Magasin's order
      EXISTS (
        SELECT 1 FROM users u
        JOIN commande_magasins cm ON cm.magasin_id = u.magasin_id
        WHERE u.id = auth.uid()
        AND cm.commande_id = c.id
        AND u.role = 'magasin'
      )
      OR
      -- Admin
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
      )
    )
  )
);

-- Policy DELETE : Seuls les admins peuvent supprimer des photos
CREATE POLICY "Admin can delete photos"
ON photos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- 3. Vérifier que RLS est activé
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Liste toutes les policies sur la table photos
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'photos';
