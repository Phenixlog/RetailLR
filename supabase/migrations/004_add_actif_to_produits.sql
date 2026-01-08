-- ============================================
-- Migration: Ajout du statut actif aux produits
-- Date: 2026-01-06
-- Description: Permet l'archivage des produits (Gestion des obsolets)
-- ============================================

ALTER TABLE produits 
ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT TRUE;

-- Index pour filtrer rapidement les produits actifs
CREATE INDEX IF NOT EXISTS idx_produits_actif ON produits(actif);
