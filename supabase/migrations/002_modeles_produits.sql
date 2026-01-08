-- ============================================
-- Migration: Ajout des modèles et enrichissement produits
-- Date: 2026-01-06
-- Description: Structure Modèle → Tissus pour LRI
-- ============================================

-- 1. Créer la table des modèles (canapés)
CREATE TABLE IF NOT EXISTS modeles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Ajouter les nouvelles colonnes à la table produits
ALTER TABLE produits 
ADD COLUMN IF NOT EXISTS modele_id UUID REFERENCES modeles(id),
ADD COLUMN IF NOT EXISTS gamme_tissu VARCHAR(100),
ADD COLUMN IF NOT EXISTS type_tissu VARCHAR(100),
ADD COLUMN IF NOT EXISTS couleur VARCHAR(100),
ADD COLUMN IF NOT EXISTS statut_collection VARCHAR(50),
ADD COLUMN IF NOT EXISTS housse_amovible BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS categorie VARCHAR(50) DEFAULT 'echantillon_lri';

-- 3. Créer un index pour les recherches par modèle
CREATE INDEX IF NOT EXISTS idx_produits_modele ON produits(modele_id);
CREATE INDEX IF NOT EXISTS idx_produits_categorie ON produits(categorie);

-- 4. RLS pour la table modeles
ALTER TABLE modeles ENABLE ROW LEVEL SECURITY;

-- Politique de lecture pour les utilisateurs authentifiés
CREATE POLICY "Modeles visibles par tous les utilisateurs authentifiés"
  ON modeles FOR SELECT
  TO authenticated
  USING (true);

-- Politique d'écriture pour les admins
CREATE POLICY "Modeles modifiables par les admins"
  ON modeles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 5. Trigger pour updated_at sur modeles
CREATE OR REPLACE FUNCTION update_modeles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_modeles_updated_at ON modeles;
CREATE TRIGGER update_modeles_updated_at
  BEFORE UPDATE ON modeles
  FOR EACH ROW
  EXECUTE FUNCTION update_modeles_updated_at();

-- ============================================
-- Résumé des changements:
-- - Table `modeles`: stocke les modèles de canapés (SIMONE, TASIE, etc.)
-- - Table `produits` enrichie avec:
--   - modele_id: lien vers le modèle
--   - gamme_tissu: nom de la gamme (NANTES, EDEN, etc.)
--   - type_tissu: matière (VELOURS, POLYESTER CHINE, etc.)
--   - couleur: couleur du tissu
--   - statut_collection: RECONDUIT, Nouveauté PE26, ARRET PE26
--   - housse_amovible: TRUE/FALSE
--   - categorie: echantillon_lri, echantillon_ampm, etc.
-- ============================================
