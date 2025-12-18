-- ============================================
-- PLATEFORME LA REDOUTE x PHENIX LOG
-- Schéma de base de données Supabase
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES PRINCIPALES
-- ============================================

-- Table des magasins
CREATE TABLE IF NOT EXISTS magasins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL, -- ex: "MAG_001"
  ville TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des produits (catalogue)
CREATE TABLE IF NOT EXISTS produits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT UNIQUE NOT NULL, -- ex: "REF_12345"
  nom TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enum pour les rôles utilisateurs
CREATE TYPE user_role AS ENUM ('la_redoute', 'magasin', 'admin');

-- Table des utilisateurs (extend auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL,
  magasin_id UUID REFERENCES magasins(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enum pour les statuts de commande
CREATE TYPE commande_statut AS ENUM ('en_attente', 'en_preparation', 'confirmee', 'envoyee');

-- Table des commandes
CREATE TABLE IF NOT EXISTS commandes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  statut commande_statut NOT NULL DEFAULT 'en_attente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Table de liaison commandes-magasins (N-N)
CREATE TABLE IF NOT EXISTS commande_magasins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commande_id UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  magasin_id UUID NOT NULL REFERENCES magasins(id) ON DELETE CASCADE,
  UNIQUE(commande_id, magasin_id)
);

-- Table de liaison commandes-produits avec quantités (N-N)
CREATE TABLE IF NOT EXISTS commande_produits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commande_id UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  produit_id UUID NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  quantite INTEGER NOT NULL CHECK (quantite > 0),
  UNIQUE(commande_id, produit_id)
);

-- Table des photos
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commande_id UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL, -- Chemin dans Supabase Storage
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des emails envoyés
CREATE TABLE IF NOT EXISTS emails_sent (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commande_id UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relance BOOLEAN DEFAULT FALSE
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE magasins ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commande_magasins ENABLE ROW LEVEL SECURITY;
ALTER TABLE commande_produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails_sent ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES : USERS
-- ============================================

-- Users peuvent voir leur propre profil
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- Users peuvent update leur profil (sauf role)
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- ============================================
-- POLICIES : MAGASINS (lecture publique)
-- ============================================

CREATE POLICY "Authenticated users can view magasins"
ON magasins FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- POLICIES : PRODUITS (lecture publique)
-- ============================================

CREATE POLICY "Authenticated users can view produits"
ON produits FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- POLICIES : COMMANDES
-- ============================================

-- La Redoute voit ses propres commandes
CREATE POLICY "La Redoute views own orders"
ON commandes FOR SELECT
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'la_redoute'
  )
);

-- Magasins voient leurs commandes
CREATE POLICY "Magasins view own orders"
ON commandes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    JOIN commande_magasins cm ON cm.magasin_id = users.magasin_id
    WHERE users.id = auth.uid()
    AND cm.commande_id = commandes.id
    AND users.role = 'magasin'
  )
);

-- Admin voit toutes les commandes
CREATE POLICY "Admin views all orders"
ON commandes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Client et Magasin peuvent créer des commandes
CREATE POLICY "Users can create orders"
ON commandes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admin peut update les commandes (statut, etc.)
CREATE POLICY "Admin can update orders"
ON commandes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ============================================
-- POLICIES : COMMANDE_MAGASINS
-- ============================================

-- Héritage des droits de lecture de commandes
CREATE POLICY "Inherit commandes read rights"
ON commande_magasins FOR SELECT
USING (
  -- La Redoute voit ses commandes
  EXISTS (
    SELECT 1 FROM commandes c
    WHERE c.id = commande_magasins.commande_id
    AND c.user_id = auth.uid()
  )
  OR
  -- Magasins voient leurs commandes
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.magasin_id = commande_magasins.magasin_id
    AND users.role = 'magasin'
  )
  OR
  -- Admin voit tout
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Users peuvent insérer lors de la création de commande
CREATE POLICY "Users can insert commande_magasins"
ON commande_magasins FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM commandes
    WHERE commandes.id = commande_magasins.commande_id
    AND commandes.user_id = auth.uid()
  )
);

-- ============================================
-- POLICIES : COMMANDE_PRODUITS
-- ============================================

-- Héritage des droits de lecture de commandes
CREATE POLICY "Inherit commandes read rights"
ON commande_produits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM commandes c
    WHERE c.id = commande_produits.commande_id
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

-- Users peuvent insérer lors de la création de commande
CREATE POLICY "Users can insert commande_produits"
ON commande_produits FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM commandes
    WHERE commandes.id = commande_produits.commande_id
    AND commandes.user_id = auth.uid()
  )
);

-- ============================================
-- POLICIES : PHOTOS
-- ============================================

-- Seul l'admin peut uploader des photos
CREATE POLICY "Admin can upload photos"
ON photos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Tout le monde peut voir les photos de ses commandes
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

-- ============================================
-- POLICIES : EMAILS_SENT
-- ============================================

-- Admin peut voir tous les emails
CREATE POLICY "Admin can view all emails"
ON emails_sent FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Admin peut insérer des emails
CREATE POLICY "Admin can insert emails"
ON emails_sent FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ============================================
-- INDEXES POUR PERFORMANCE
-- ============================================

CREATE INDEX idx_commandes_user_id ON commandes(user_id);
CREATE INDEX idx_commandes_statut ON commandes(statut);
CREATE INDEX idx_commande_magasins_commande_id ON commande_magasins(commande_id);
CREATE INDEX idx_commande_magasins_magasin_id ON commande_magasins(magasin_id);
CREATE INDEX idx_commande_produits_commande_id ON commande_produits(commande_id);
CREATE INDEX idx_photos_commande_id ON photos(commande_id);
CREATE INDEX idx_emails_sent_commande_id ON emails_sent(commande_id);

-- ============================================
-- SEED DATA (Données de test)
-- ============================================

-- Insert magasins
INSERT INTO magasins (id, nom, code, ville) VALUES
('11111111-1111-1111-1111-111111111111', 'La Redoute Paris Haussmann', 'MAG_001', 'Paris'),
('22222222-2222-2222-2222-222222222222', 'La Redoute Lyon Part-Dieu', 'MAG_002', 'Lyon'),
('33333333-3333-3333-3333-333333333333', 'La Redoute Bordeaux', 'MAG_003', 'Bordeaux')
ON CONFLICT (id) DO NOTHING;

-- Insert produits
INSERT INTO produits (id, reference, nom, description, image_url) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'REF_12345', 'Chemise Blanche Coton', 'Chemise coton blanc, coupe classique', 'https://via.placeholder.com/300?text=Chemise+Blanche'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'REF_12346', 'Pantalon Noir Costume', 'Pantalon costume noir, tissu premium', 'https://via.placeholder.com/300?text=Pantalon+Noir'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'REF_12347', 'Robe Rouge Soirée', 'Robe de soirée rouge élégante', 'https://via.placeholder.com/300?text=Robe+Rouge'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'REF_12348', 'Veste Blazer Marine', 'Veste blazer bleu marine', 'https://via.placeholder.com/300?text=Blazer+Marine'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'REF_12349', 'Jean Slim Brut', 'Jean slim denim brut', 'https://via.placeholder.com/300?text=Jean+Slim')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INSTRUCTIONS POUR CRÉER LES USERS
-- ============================================

-- Les users doivent être créés via Supabase Auth (UI ou API)
-- Une fois créés dans auth.users, les ajouter dans la table users :

-- EXEMPLE (à adapter avec les vrais UUIDs retournés par Supabase Auth) :
/*
-- Admin Phenix Log (Adriana)
INSERT INTO users (id, email, role, magasin_id) VALUES
('<uuid-from-auth>', 'adriana@phenixlog.com', 'admin', NULL);

-- La Redoute (multi-magasins)
INSERT INTO users (id, email, role, magasin_id) VALUES
('<uuid-from-auth>', 'commandes@laredoute.fr', 'la_redoute', NULL);

-- Magasin Paris
INSERT INTO users (id, email, role, magasin_id) VALUES
('<uuid-from-auth>', 'paris@laredoute.fr', 'magasin', '11111111-1111-1111-1111-111111111111');

-- Magasin Lyon
INSERT INTO users (id, email, role, magasin_id) VALUES
('<uuid-from-auth>', 'lyon@laredoute.fr', 'magasin', '22222222-2222-2222-2222-222222222222');
*/

-- ============================================
-- STORAGE BUCKET CONFIGURATION
-- ============================================

-- Créer le bucket 'commande-photos' dans Supabase Storage (via UI)
-- Puis exécuter ces policies :

/*
-- Seul l'admin peut upload
INSERT INTO storage.buckets (id, name, public) VALUES ('commande-photos', 'commande-photos', true);

CREATE POLICY "Admin can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'commande-photos'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Tous les users authentifiés peuvent voir
CREATE POLICY "Authenticated users can view photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'commande-photos'
  AND auth.role() = 'authenticated'
);
*/

-- ============================================
-- DONE !
-- ============================================
-- Exécutez ce fichier dans le SQL Editor de Supabase
-- Puis créez les users via l'UI Supabase Auth
-- Puis créez le bucket Storage 'commande-photos'
