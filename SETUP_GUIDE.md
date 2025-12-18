# 🚀 Guide de Setup - Plateforme La Redoute x Phenix Log

## Prérequis

### 1. Installer Node.js
- Aller sur https://nodejs.org/
- Télécharger et installer la version **LTS** (v20.x ou v18.x)
- Vérifier l'installation :
  ```bash
  node --version
  npm --version
  ```

### 2. Supabase - Créer le schéma de base de données

1. Aller sur https://meudxkmoyrzmhznhcvdz.supabase.co
2. Aller dans **SQL Editor**
3. Copier-coller le contenu du fichier `supabase-schema.sql`
4. Exécuter le script (bouton "Run")

### 3. Supabase - Créer le Storage Bucket

1. Aller dans **Storage** dans le menu Supabase
2. Créer un nouveau bucket :
   - **Name** : `commande-photos`
   - **Public** : ✅ Oui (pour que les URLs soient accessibles)
3. Une fois créé, aller dans **Policies** du bucket
4. Exécuter dans SQL Editor :
   ```sql
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

   CREATE POLICY "Authenticated users can view photos"
   ON storage.objects FOR SELECT
   USING (
     bucket_id = 'commande-photos'
     AND auth.role() = 'authenticated'
   );
   ```

### 4. Supabase - Créer les utilisateurs de test

1. Aller dans **Authentication** > **Users**
2. Créer les utilisateurs suivants (bouton "Add user") :

**Admin Phenix Log :**
- Email : `adriana@phenixlog.com`
- Password : `admin123` (temporaire)
- Copier l'**UUID** généré

**La Redoute (multi-magasins) :**
- Email : `commandes@laredoute.fr`
- Password : `client123`
- Copier l'**UUID** généré

**Magasin Paris :**
- Email : `paris@laredoute.fr`
- Password : `magasin123`
- Copier l'**UUID** généré

**Magasin Lyon :**
- Email : `lyon@laredoute.fr`
- Password : `magasin123`
- Copier l'**UUID** généré

3. Pour chaque utilisateur créé, aller dans **SQL Editor** et exécuter :

```sql
-- Admin
INSERT INTO users (id, email, role, magasin_id) VALUES
('<uuid-adriana>', 'adriana@phenixlog.com', 'admin', NULL);

-- La Redoute
INSERT INTO users (id, email, role, magasin_id) VALUES
('<uuid-laredoute>', 'commandes@laredoute.fr', 'la_redoute', NULL);

-- Magasin Paris
INSERT INTO users (id, email, role, magasin_id) VALUES
('<uuid-paris>', 'paris@laredoute.fr', 'magasin', '11111111-1111-1111-1111-111111111111');

-- Magasin Lyon
INSERT INTO users (id, email, role, magasin_id) VALUES
('<uuid-lyon>', 'lyon@laredoute.fr', 'magasin', '22222222-2222-2222-2222-222222222222');
```

### 5. Récupérer la Service Role Key de Supabase

1. Aller dans **Project Settings** > **API**
2. Copier la **service_role key** (secret)
3. La garder pour l'ajouter dans `.env.local`

---

## Installation du Projet

### 1. Cloner et installer les dépendances

```bash
cd /Users/keyvan/Documents/RetailLR

# Installer les dépendances (une fois Node.js installé)
npm install
```

### 2. Configurer les variables d'environnement

Créer un fichier `.env.local` à la racine du projet :

```bash
cp .env.local.example .env.local
```

Éditer `.env.local` et remplir les valeurs :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://meudxkmoyrzmhznhcvdz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldWR4a21veXJ6bWh6bmhjdmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTY1NjYsImV4cCI6MjA4MTQ3MjU2Nn0.TvqyP4gGUq34jxGLJKaWHgxyeE6bYaCHRRP4tztA3IY
SUPABASE_SERVICE_ROLE_KEY=<votre_service_role_key>

# Ollama (IA locale)
OLLAMA_API_URL=http://your-server-ip:11434

# n8n Webhooks
N8N_WEBHOOK_SEND_EMAIL=https://your-n8n.hostinger.com/webhook/send-email

# Email (Outlook via n8n)
EMAIL_FROM=noreply@phenixlog.com
EMAIL_TO_LA_REDOUTE=commandes@laredoute.fr
```

### 3. Lancer le serveur de développement

```bash
npm run dev
```

Ouvrir http://localhost:3000

---

## Configuration n8n (Self-hosted Hostinger)

### Workflow 1 : Send Email

1. Créer un nouveau workflow dans n8n
2. Ajouter un **Webhook** node :
   - Path : `send-email`
   - Method : `POST`
3. Ajouter un node **Microsoft Outlook** ou **SMTP** :
   - Configurer avec vos credentials Outlook
4. Copier l'URL du webhook et la mettre dans `.env.local` (`N8N_WEBHOOK_SEND_EMAIL`)

---

## Configuration Ollama (IA locale)

### 1. Installer Ollama sur votre serveur

```bash
curl https://ollama.ai/install.sh | sh
```

### 2. Télécharger un modèle (Mistral ou Llama3)

```bash
ollama pull mistral
# ou
ollama pull llama3
```

### 3. Lancer Ollama en mode API

```bash
ollama serve
```

Par défaut, l'API écoute sur `http://localhost:11434`.

### 4. Tester l'API

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "mistral",
  "prompt": "Hello world",
  "stream": false
}'
```

### 5. Mettre l'URL dans `.env.local`

Si Ollama tourne sur un serveur distant :
```env
OLLAMA_API_URL=http://your-server-ip:11434
```

---

## Déploiement Vercel

### 1. Push le code sur GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Connecter à Vercel

1. Aller sur https://vercel.com
2. Cliquer sur "Import Project"
3. Sélectionner le repo GitHub
4. Ajouter les variables d'environnement (même que `.env.local`)
5. Deploy !

---

## Tests de Validation

### 1. Test Login
- [ ] Login avec `adriana@phenixlog.com` (admin)
- [ ] Login avec `commandes@laredoute.fr` (client)
- [ ] Login avec `paris@laredoute.fr` (magasin)

### 2. Test Commande (Client)
- [ ] Sélectionner plusieurs magasins
- [ ] Ajouter des produits au panier
- [ ] Valider la commande
- [ ] Voir la commande dans l'historique

### 3. Test Admin
- [ ] Voir toutes les commandes
- [ ] Ouvrir une commande
- [ ] Uploader des photos
- [ ] Générer un email via IA
- [ ] Éditer l'email
- [ ] Envoyer l'email

---

## Troubleshooting

### Erreur "relation does not exist"
→ Vérifier que le schéma SQL a bien été exécuté dans Supabase

### Erreur "Row Level Security"
→ Vérifier que les policies RLS sont actives
→ Vérifier que l'utilisateur est bien inséré dans la table `users`

### Photos ne s'affichent pas
→ Vérifier que le bucket `commande-photos` est **public**
→ Vérifier les policies Storage

### Ollama ne répond pas
→ Vérifier que le serveur Ollama est bien lancé (`ollama serve`)
→ Vérifier le firewall (port 11434 ouvert)

---

## Support

**Dev Lead :** Keyvan
**Stack :** Next.js 14 + Supabase + Ollama + n8n
**Deadline :** 2 semaines (30h)

---

**Ready to ship ! 🚀**
