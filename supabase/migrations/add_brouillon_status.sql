-- Migration: Add 'brouillon' status to commande_statut enum
-- Run this in Supabase SQL Editor

ALTER TYPE commande_statut ADD VALUE 'brouillon';
