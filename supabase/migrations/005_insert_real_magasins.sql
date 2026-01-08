-- ============================================
-- Migration: Liste réelle des magasins La Redoute
-- Date: 2026-01-06
-- Description: Remplace les mocks par la liste officielle fournie
-- ============================================

-- On vide la table actuelle pour repartir sur une base propre
-- Attention: Cela peut impacter les commandes existantes si liées par ID.
-- Dans une app en prod on ferait un UPSERT, mais ici on veut nettoyer les mocks.
DELETE FROM magasins;

INSERT INTO magasins (nom, code, ville) VALUES
('Annecy', 'LR_ANN', 'Annecy'),
('Beaugrenelle', 'LR_BEA', 'Paris'),
('Bordeaux', 'LR_BOR', 'Bordeaux'),
('Clermont', 'LR_CLE', 'Clermont-Ferrand'),
('Dijon', 'LR_DIJ', 'Dijon'),
('Haussmann', 'LR_HAU', 'Paris'),
('Lyon Grolée', 'LR_LGO', 'Lyon'),
('Lyon Bron', 'LR_LBR', 'Lyon'),
('Lyon Part Dieu', 'LR_LPD', 'Lyon'),
('Marseille Bourse', 'LR_MBO', 'Marseille'),
('Marseille Prado', 'LR_MPR', 'Marseille'),
('Metz', 'LR_MET', 'Metz'),
('Montpellier Polygone', 'LR_MPO', 'Montpellier'),
('Nantes', 'LR_NAN', 'Nantes'),
('Nice cap3000', 'LR_NC3', 'Nice'),
('Nice Massena', 'LR_NMS', 'Nice'),
('Parly 2', 'LR_PA2', 'Le Chesnay-Rocquencourt'),
('Rennes', 'LR_REN', 'Rennes'),
('Rivoli', 'LR_RIV', 'Paris'),
('Strasbourg', 'LR_STR', 'Strasbourg'),
('Uzes', 'LR_UZE', 'Uzès'),
('Ile de la réunion', 'LR_REU', 'Ile de la réunion'),
('Athènes', 'LR_ATH', 'Athènes');
