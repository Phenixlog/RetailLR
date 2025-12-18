-- ============================================
-- FIX RLS POLICIES - Supprimer la récursion infinie
-- ============================================

-- Supprimer les anciennes policies problématiques
DROP POLICY IF EXISTS "Inherit commandes read rights" ON commande_magasins;
DROP POLICY IF EXISTS "Inherit commandes read rights" ON commande_produits;

-- ============================================
-- NOUVELLES POLICIES SIMPLIFIÉES
-- ============================================

-- COMMANDE_MAGASINS : Policies simplifiées
CREATE POLICY "Admin can view all commande_magasins"
ON commande_magasins FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "La Redoute can view own commande_magasins"
ON commande_magasins FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM commandes
    WHERE commandes.id = commande_magasins.commande_id
    AND commandes.user_id = auth.uid()
  )
);

CREATE POLICY "Magasins can view their commande_magasins"
ON commande_magasins FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'magasin'
    AND users.magasin_id = commande_magasins.magasin_id
  )
);

-- COMMANDE_PRODUITS : Policies simplifiées
CREATE POLICY "Admin can view all commande_produits"
ON commande_produits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Users can view their commande_produits"
ON commande_produits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM commandes
    WHERE commandes.id = commande_produits.commande_id
    AND commandes.user_id = auth.uid()
  )
);

CREATE POLICY "Magasins can view their commande_produits"
ON commande_produits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN commande_magasins cm ON cm.magasin_id = u.magasin_id
    WHERE u.id = auth.uid()
    AND cm.commande_id = commande_produits.commande_id
    AND u.role = 'magasin'
  )
);
