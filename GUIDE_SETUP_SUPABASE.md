# 🚀 Guide de Setup Supabase - Étape par Étape

## Problème courant : "Je n'arrive pas à exécuter le SQL"

Si tu as des erreurs avec le fichier SQL complet, suis ce guide étape par étape.

---

## Étape 1 : Accéder au SQL Editor

1. Va sur https://supabase.com
2. Sélectionne ton projet
3. Dans le menu de gauche, clique sur **SQL Editor**
4. Clique sur **+ New query**

---

## Étape 2 : Créer les tables SANS les policies (d'abord)

Copie-colle ce code et exécute-le (bouton **Run** ou Cmd+Enter) :

```sql
-- ============================================
-- ÉTAPE 2A : CRÉER LE TYPE ENUM POUR LES RÔLES
-- ============================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'la_redoute', 'magasin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

```

Clique sur **Run**. Tu devrais voir "Success. No rows returned".

---

## Étape 3 : Créer les autres types ENUM

```sql
-- ============================================
-- ÉTAPE 3 : CRÉER LE TYPE ENUM POUR LES STATUTS
-- ============================================

DO $$ BEGIN
  CREATE TYPE commande_statut AS ENUM ('en_attente', 'en_preparation', 'confirmee', 'envoyee');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
```

Clique sur **Run**.

---

## Étape 4 : Créer les tables principales

### 4A : Table `users`

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL,
  magasin_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4B : Table `magasins`

```sql
CREATE TABLE IF NOT EXISTS magasins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  ville TEXT NOT NULL,
  adresse TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4C : Table `produits`

```sql
CREATE TABLE IF NOT EXISTS produits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  reference TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4D : Table `commandes`

```sql
CREATE TABLE IF NOT EXISTS commandes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  statut commande_statut DEFAULT 'en_attente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4E : Table `commande_magasins`

```sql
CREATE TABLE IF NOT EXISTS commande_magasins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  magasin_id UUID NOT NULL REFERENCES magasins(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(commande_id, magasin_id)
);
```

### 4F : Table `commande_produits`

```sql
CREATE TABLE IF NOT EXISTS commande_produits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  produit_id UUID NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  quantite INTEGER NOT NULL CHECK (quantite > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(commande_id, produit_id)
);
```

### 4G : Table `photos`

```sql
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4H : Table `emails_sent`

```sql
CREATE TABLE IF NOT EXISTS emails_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID REFERENCES commandes(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Étape 5 : Insérer les données de test

### 5A : Magasins

```sql
INSERT INTO magasins (nom, code, ville, adresse) VALUES
('La Redoute Paris Haussmann', 'PAR001', 'Paris', '40 Boulevard Haussmann, 75009 Paris'),
('La Redoute Lyon Part-Dieu', 'LYO001', 'Lyon', '17 Rue du Docteur Bouchut, 69003 Lyon'),
('La Redoute Lille Grand Place', 'LIL001', 'Lille', '1 Place du Général de Gaulle, 59000 Lille')
ON CONFLICT (code) DO NOTHING;
```

### 5B : Produits

```sql
INSERT INTO produits (nom, reference, description, image_url) VALUES
('Échantillon Tissu Coton Bio', 'ECH-COT-001', 'Échantillon 10x10cm de tissu coton bio certifié GOTS', 'https://via.placeholder.com/300/FF6B6B/FFFFFF?text=Coton+Bio'),
('Échantillon Tissu Lin Naturel', 'ECH-LIN-001', 'Échantillon 10x10cm de lin naturel européen', 'https://via.placeholder.com/300/4ECDC4/FFFFFF?text=Lin+Naturel'),
('Échantillon Cuir Vegan', 'ECH-CUI-001', 'Échantillon 10x10cm de cuir vegan recyclé', 'https://via.placeholder.com/300/45B7D1/FFFFFF?text=Cuir+Vegan'),
('Échantillon Laine Mérinos', 'ECH-LAI-001', 'Échantillon 10x10cm de laine mérinos ultra-fine', 'https://via.placeholder.com/300/F7B731/FFFFFF?text=Laine+Merinos'),
('Échantillon Soie Naturelle', 'ECH-SOI-001', 'Échantillon 10x10cm de soie 100% naturelle', 'https://via.placeholder.com/300/5F27CD/FFFFFF?text=Soie+Naturelle')
ON CONFLICT (reference) DO NOTHING;
```

---

## Étape 6 : Activer RLS (Row Level Security)

```sql
-- Activer RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE magasins ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commande_magasins ENABLE ROW LEVEL SECURITY;
ALTER TABLE commande_produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails_sent ENABLE ROW LEVEL SECURITY;
```

---

## Étape 7 : Créer les policies RLS (IMPORTANT !)

### 7A : Policies pour `users`

```sql
-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users AS u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);

-- Les users peuvent voir leur propre profil
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);
```

### 7B : Policies pour `magasins` et `produits` (lecture pour tous)

```sql
-- Tout le monde peut lire les magasins
CREATE POLICY "Everyone can read magasins"
ON magasins FOR SELECT
USING (true);

-- Tout le monde peut lire les produits
CREATE POLICY "Everyone can read produits"
ON produits FOR SELECT
USING (true);
```

### 7C : Policies pour `commandes`

```sql
-- Admins peuvent tout voir
CREATE POLICY "Admins can view all commandes"
ON commandes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Clients peuvent voir leurs propres commandes
CREATE POLICY "Users can view own commandes"
ON commandes FOR SELECT
USING (user_id = auth.uid());

-- Magasins peuvent voir les commandes les concernant
CREATE POLICY "Magasins can view their commandes"
ON commandes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM commande_magasins cm
    INNER JOIN users u ON u.magasin_id = cm.magasin_id
    WHERE cm.commande_id = commandes.id
    AND u.id = auth.uid()
  )
);

-- Tout le monde authentifié peut créer des commandes
CREATE POLICY "Authenticated users can create commandes"
ON commandes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins peuvent mettre à jour les commandes
CREATE POLICY "Admins can update commandes"
ON commandes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);
```

### 7D : Policies pour `commande_magasins`

```sql
-- Admins peuvent tout voir
CREATE POLICY "Admins can view commande_magasins"
ON commande_magasins FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Users peuvent voir les relations de leurs commandes
CREATE POLICY "Users can view own commande_magasins"
ON commande_magasins FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM commandes
    WHERE commandes.id = commande_magasins.commande_id
    AND commandes.user_id = auth.uid()
  )
);

-- Users peuvent créer des relations pour leurs commandes
CREATE POLICY "Users can create commande_magasins"
ON commande_magasins FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM commandes
    WHERE commandes.id = commande_id
    AND commandes.user_id = auth.uid()
  )
);
```

### 7E : Policies pour `commande_produits`

```sql
-- Admins peuvent tout voir
CREATE POLICY "Admins can view commande_produits"
ON commande_produits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Users peuvent voir les produits de leurs commandes
CREATE POLICY "Users can view own commande_produits"
ON commande_produits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM commandes
    WHERE commandes.id = commande_produits.commande_id
    AND commandes.user_id = auth.uid()
  )
);

-- Users peuvent créer des produits pour leurs commandes
CREATE POLICY "Users can create commande_produits"
ON commande_produits FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM commandes
    WHERE commandes.id = commande_id
    AND commandes.user_id = auth.uid()
  )
);
```

### 7F : Policies pour `photos`

```sql
-- Admins peuvent tout voir
CREATE POLICY "Admins can view photos"
ON photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Users peuvent voir les photos de leurs commandes
CREATE POLICY "Users can view own photos"
ON photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM commandes
    WHERE commandes.id = photos.commande_id
    AND commandes.user_id = auth.uid()
  )
);

-- Admins peuvent créer des photos
CREATE POLICY "Admins can create photos"
ON photos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);
```

### 7G : Policies pour `emails_sent`

```sql
-- Admins peuvent tout voir
CREATE POLICY "Admins can view emails_sent"
ON emails_sent FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Admins peuvent créer des logs d'emails
CREATE POLICY "Admins can create emails_sent"
ON emails_sent FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);
```

---

## Étape 8 : Créer les utilisateurs

1. Va dans **Authentication** > **Users** dans Supabase
2. Clique sur **Add user** > **Create new user**
3. Crée 3 utilisateurs :

**Utilisateur 1 : Admin**
- Email : `adriana@phenixlog.com`
- Password : `test123`
- Auto Confirm User : ✅

**Utilisateur 2 : Client**
- Email : `commandes@laredoute.fr`
- Password : `test123`
- Auto Confirm User : ✅

**Utilisateur 3 : Magasin**
- Email : `paris@laredoute.fr`
- Password : `test123`
- Auto Confirm User : ✅

---

## Étape 9 : Insérer les profils users

**IMPORTANT** : Remplace les UUID ci-dessous par les vrais UUID de tes utilisateurs créés à l'étape 8.

Pour trouver les UUID :
1. Va dans **Authentication** > **Users**
2. Copie l'UUID de chaque utilisateur

Puis exécute ce SQL en remplaçant les UUID :

```sql
-- Récupère d'abord l'ID du magasin Paris
DO $$
DECLARE
  magasin_paris_id UUID;
  admin_uuid UUID := 'REMPLACE-PAR-UUID-ADMIN';
  client_uuid UUID := 'REMPLACE-PAR-UUID-CLIENT';
  magasin_uuid UUID := 'REMPLACE-PAR-UUID-MAGASIN';
BEGIN
  -- Récupérer l'ID du magasin Paris
  SELECT id INTO magasin_paris_id FROM magasins WHERE code = 'PAR001';

  -- Insérer les profils
  INSERT INTO users (id, email, role, magasin_id) VALUES
    (admin_uuid, 'adriana@phenixlog.com', 'admin', NULL),
    (client_uuid, 'commandes@laredoute.fr', 'la_redoute', NULL),
    (magasin_uuid, 'paris@laredoute.fr', 'magasin', magasin_paris_id)
  ON CONFLICT (id) DO NOTHING;
END $$;
```

---

## Étape 10 : Setup Storage pour les photos

1. Va dans **Storage** dans Supabase
2. Clique sur **New bucket**
3. Nom : `order-photos`
4. Public : ✅ Coché
5. Clique sur **Create bucket**

Puis exécute ce SQL :

```sql
-- Policies pour le storage
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'order-photos');

CREATE POLICY "Anyone can view photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'order-photos');

CREATE POLICY "Admins can delete photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'order-photos' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);
```

---

## ✅ Terminé !

Tu as maintenant :
- ✅ Toutes les tables créées
- ✅ Les policies RLS activées
- ✅ Les données de test insérées
- ✅ Les utilisateurs créés
- ✅ Le storage configuré

Tu peux maintenant :
1. Lancer `npm run dev`
2. Aller sur http://localhost:3000
3. Te connecter avec l'un des comptes de test

---

## 🐛 En cas d'erreur

Si tu as des erreurs, dis-moi laquelle et à quelle étape !
