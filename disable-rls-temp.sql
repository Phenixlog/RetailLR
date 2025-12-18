-- ============================================
-- DÉSACTIVER TEMPORAIREMENT RLS SUR LES TABLES PROBLÉMATIQUES
-- Pour debug uniquement
-- ============================================

-- Désactiver RLS sur commande_magasins et commande_produits temporairement
ALTER TABLE commande_magasins DISABLE ROW LEVEL SECURITY;
ALTER TABLE commande_produits DISABLE ROW LEVEL SECURITY;

-- Les autres tables gardent leur RLS actif
-- On réactivera après avoir identifié le problème
