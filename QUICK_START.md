# ⚡ Quick Start - RetailLR

## 🎯 Setup en 10 minutes

### 1. Installer Node.js (si pas déjà fait)
https://nodejs.org/ → Télécharger la version LTS

### 2. Installer les dépendances
```bash
npm install
```

### 3. Setup Supabase Database

#### a. Exécuter le schéma SQL
1. Aller sur https://meudxkmoyrzmhznhcvdz.supabase.co
2. SQL Editor → New Query
3. Copier-coller tout le contenu de `supabase-schema.sql`
4. Run

#### b. Créer le bucket Storage
1. Storage → New bucket
2. Name: `commande-photos`
3. Public: ✅ Yes

#### c. Créer les users de test
1. Authentication → Users → Add user

Créer ces 4 users :
- `adriana@phenixlog.com` / `admin123`
- `commandes@laredoute.fr` / `client123`
- `paris@laredoute.fr` / `magasin123`
- `lyon@laredoute.fr` / `magasin123`

2. Pour CHAQUE user créé, noter l'UUID et exécuter dans SQL Editor :

```sql
-- Admin
INSERT INTO users (id, email, role, magasin_id) VALUES
('<UUID_ADRIANA>', 'adriana@phenixlog.com', 'admin', NULL);

-- La Redoute
INSERT INTO users (id, email, role, magasin_id) VALUES
('<UUID_LAREDOUTE>', 'commandes@laredoute.fr', 'la_redoute', NULL);

-- Magasin Paris
INSERT INTO users (id, email, role, magasin_id) VALUES
('<UUID_PARIS>', 'paris@laredoute.fr', 'magasin', '11111111-1111-1111-1111-111111111111');

-- Magasin Lyon
INSERT INTO users (id, email, role, magasin_id) VALUES
('<UUID_LYON>', 'lyon@laredoute.fr', 'magasin', '22222222-2222-2222-2222-222222222222');
```

### 4. Créer le fichier .env.local

```bash
cp .env.local.example .env.local
```

Éditer `.env.local` et ajouter la `SUPABASE_SERVICE_ROLE_KEY` :
→ Project Settings → API → service_role key (secret)

### 5. Lancer le projet

```bash
npm run dev
```

Ouvrir http://localhost:3000

### 6. Tester le login

Essayer de se connecter avec :
- Admin : `adriana@phenixlog.com` / `admin123`
- Client : `commandes@laredoute.fr` / `client123`

---

## 🚨 En cas d'erreur

### "npm: command not found"
→ Node.js n'est pas installé. Aller sur https://nodejs.org/

### "relation users does not exist"
→ Le fichier SQL n'a pas été exécuté. Retourner à l'étape 3a.

### "Invalid login credentials"
→ Les users n'ont pas été créés dans Supabase Auth OU pas insérés dans la table users

### "Cannot find module..."
→ Lancer `npm install`

---

## ✅ Prochaines étapes de développement

Maintenant que le projet tourne, il faut implémenter :

1. **Interface Client** (route `/client`)
   - Catalogue produits
   - Sélecteur multi-magasins
   - Panier
   - Validation commande

2. **Interface Magasin** (route `/magasin`)
   - Catalogue produits
   - Panier (magasin fixe)
   - Validation commande

3. **Interface Admin** (route `/admin`)
   - Liste des commandes
   - Détail commande
   - Upload photos
   - Génération email IA
   - Envoi email

4. **API Ollama** (génération email)
   - Endpoint local
   - Prompt engineering
   - Intégration frontend

5. **n8n Workflow** (envoi email)
   - Webhook send-email
   - SMTP Outlook
   - Log dans DB

Consulter `PROJECT_BRIEF.md` et `TECHNICAL_SPECS.md` pour les détails.

---

**Ready to code ! 💪**
