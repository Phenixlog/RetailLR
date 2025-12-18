-- ============================================
-- MIGRATIONS POUR SYSTÈME DE SUIVI EMAILS
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- 1. Ajouter colonnes pour le tracking avancé
ALTER TABLE emails_sent
ADD COLUMN IF NOT EXISTS email_type VARCHAR(50) DEFAULT 'initial',
ADD COLUMN IF NOT EXISTS statut_reponse VARCHAR(50) DEFAULT 'en_attente',
ADD COLUMN IF NOT EXISTS date_reponse TIMESTAMP,
ADD COLUMN IF NOT EXISTS note_reponse TEXT,
ADD COLUMN IF NOT EXISTS prochaine_relance_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS destinataire_email VARCHAR(255);

-- 2. Mettre à jour les emails existants pour avoir le destinataire
-- (On va chercher l'email du user depuis la commande)
UPDATE emails_sent e
SET destinataire_email = u.email
FROM commandes c
JOIN users u ON c.user_id = u.id
WHERE e.commande_id = c.id
AND e.destinataire_email IS NULL;

-- 3. Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_emails_sent_statut_reponse ON emails_sent(statut_reponse);
CREATE INDEX IF NOT EXISTS idx_emails_sent_email_type ON emails_sent(email_type);
CREATE INDEX IF NOT EXISTS idx_emails_sent_prochaine_relance ON emails_sent(prochaine_relance_at);
CREATE INDEX IF NOT EXISTS idx_emails_sent_created_at ON emails_sent(created_at DESC);

-- 4. Créer une vue pour faciliter les requêtes
CREATE OR REPLACE VIEW emails_tracking_view AS
SELECT
  e.id,
  e.commande_id,
  e.subject,
  e.body,
  e.sent_by,
  e.relance,
  e.email_type,
  e.statut_reponse,
  e.date_reponse,
  e.note_reponse,
  e.prochaine_relance_at,
  e.destinataire_email,
  e.created_at,
  c.statut as commande_statut,
  u_sender.email as expediteur_email,
  u_client.email as client_email
FROM emails_sent e
LEFT JOIN commandes c ON e.commande_id = c.id
LEFT JOIN users u_sender ON e.sent_by = u_sender.id
LEFT JOIN users u_client ON c.user_id = u_client.id
ORDER BY e.created_at DESC;

-- 5. Fonction pour calculer automatiquement la prochaine relance
CREATE OR REPLACE FUNCTION set_prochaine_relance()
RETURNS TRIGGER AS $$
BEGIN
  -- Si c'est un email initial et en attente, programmer relance dans 3 jours
  IF NEW.email_type = 'initial' AND NEW.statut_reponse = 'en_attente' THEN
    NEW.prochaine_relance_at := NEW.created_at + INTERVAL '3 days';

  -- Si c'est une relance 1 et en attente, programmer relance 2 dans 2 jours
  ELSIF NEW.email_type = 'relance_1' AND NEW.statut_reponse = 'en_attente' THEN
    NEW.prochaine_relance_at := NEW.created_at + INTERVAL '2 days';

  -- Si c'est une relance 2 et en attente, programmer relance 3 dans 2 jours
  ELSIF NEW.email_type = 'relance_2' AND NEW.statut_reponse = 'en_attente' THEN
    NEW.prochaine_relance_at := NEW.created_at + INTERVAL '2 days';

  -- Si statut change vers confirmé/refusé, annuler la prochaine relance
  ELSIF NEW.statut_reponse IN ('confirme', 'refuse') THEN
    NEW.prochaine_relance_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Créer le trigger
DROP TRIGGER IF EXISTS trigger_set_prochaine_relance ON emails_sent;
CREATE TRIGGER trigger_set_prochaine_relance
  BEFORE INSERT OR UPDATE ON emails_sent
  FOR EACH ROW
  EXECUTE FUNCTION set_prochaine_relance();

-- 7. Mettre à jour les emails existants pour calculer prochaine_relance
UPDATE emails_sent
SET prochaine_relance_at = created_at + INTERVAL '3 days'
WHERE email_type = 'initial'
AND statut_reponse = 'en_attente'
AND prochaine_relance_at IS NULL;

-- ============================================
-- VÉRIFICATIONS
-- ============================================

-- Vérifier la structure de la table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'emails_sent'
ORDER BY ordinal_position;

-- Vérifier les index
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'emails_sent';

-- Voir quelques emails avec les nouvelles colonnes
SELECT id, email_type, statut_reponse, prochaine_relance_at, destinataire_email
FROM emails_sent
LIMIT 5;
