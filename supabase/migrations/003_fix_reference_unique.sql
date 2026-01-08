-- ============================================
-- Fix: Permettre le même tissu sur plusieurs modèles
-- ============================================

-- 1. Supprimer l'ancienne contrainte UNIQUE sur reference
ALTER TABLE produits DROP CONSTRAINT IF EXISTS produits_reference_key;

-- 2. Créer une nouvelle contrainte UNIQUE composite (reference + modele_id)
-- Un même tissu peut exister sur plusieurs modèles
ALTER TABLE produits ADD CONSTRAINT produits_reference_modele_unique 
  UNIQUE (reference, modele_id);

-- Note: Cela permet à "SEVEN HUNTER 156" d'exister sur TIMOR, VICTOR, TOPIM, etc.
