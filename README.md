# 🚀 Plateforme La Redoute x Phenix Log

Plateforme web full-stack pour digitaliser le processus de gestion des commandes d'échantillons entre La Redoute (client) et Phenix Log (partenaire logistique).

## 📋 Stack Technique

- **Frontend** : Next.js 14 (App Router) + React 18
- **UI** : Tailwind CSS + shadcn/ui components
- **Backend** : Supabase (Auth + PostgreSQL + Storage)
- **IA** : OpenRouter API (GPT-4o-mini) pour génération d'emails pro
- **Automation** : n8n (self-hosted) pour workflows email
- **Déploiement** : Vercel

## 🎯 Fonctionnalités

### 3 Rôles Utilisateurs

#### 1. **La Redoute (Client multi-magasins)**
- Passer des commandes pour UN ou PLUSIEURS magasins
- Sélectionner des produits dans le catalogue
- Voir l'historique complet des commandes

#### 2. **Magasins La Redoute**
- Passer des commandes pour LEUR magasin uniquement
- Sélectionner des produits
- Voir l'historique de leurs commandes

#### 3. **Admin Phenix Log (Adriana)**
- Voir TOUTES les commandes (tous magasins)
- Filtrer par magasin, date, statut
- Upload photos de préparation
- **Générer automatiquement l'email de confirmation via IA**
- Éditer et envoyer l'email en 1 clic
- Historique complet des envois

## 🚀 Installation

### Prérequis

- **Node.js 18+** : https://nodejs.org/
- **Compte Supabase** : Projet créé
- **Clé API OpenRouter** : Pour la génération d'emails par IA
- **n8n self-hosted** (optionnel, pour automatisation emails)

### 1. Cloner et installer

```bash
cd /Users/keyvan/Documents/RetailLR
npm install
```

### 2. Configuration Supabase

#### a. Créer les tables

1. Aller sur https://meudxkmoyrzmhznhcvdz.supabase.co
2. Ouvrir **SQL Editor**
3. Copier-coller le contenu de `supabase-schema.sql`
4. Exécuter (bouton "Run")

#### b. Créer le Storage Bucket

1. Aller dans **Storage**
2. Créer un bucket nommé `commande-photos` (public: ✅)
3. Exécuter les policies SQL (voir `supabase-schema.sql` en bas)

#### c. Créer les utilisateurs de test

1. Aller dans **Authentication** > **Users**
2. Créer les users suivants :

**Admin**
- Email : `adriana@phenixlog.com`
- Password : `admin123`

**La Redoute**
- Email : `commandes@laredoute.fr`
- Password : `client123`

**Magasin Paris**
- Email : `paris@laredoute.fr`
- Password : `magasin123`

**Magasin Lyon**
- Email : `lyon@laredoute.fr`
- Password : `magasin123`

3. Pour chaque user créé, noter l'**UUID** et insérer dans la table `users` (voir instructions dans `supabase-schema.sql`)

### 3. Variables d'environnement

Créer un fichier `.env.local` à la racine :

```bash
cp .env.local.example .env.local
```

Remplir les valeurs :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://meudxkmoyrzmhznhcvdz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# IA (OpenRouter)
NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key_here

# Ollama (Optionnel - IA locale)
# OLLAMA_API_URL=http://your-server-ip:11434

# n8n Webhooks
N8N_WEBHOOK_SEND_EMAIL=https://your-n8n.hostinger.com/webhook/send-email

# Email
EMAIL_FROM=noreply@phenixlog.com
EMAIL_TO_LA_REDOUTE=commandes@laredoute.fr
```

### 4. Lancer le serveur

```bash
npm run dev
```

Ouvrir http://localhost:3000

## 🏗️ Structure du Projet

```
RetailLR/
├── app/
│   ├── globals.css          # Styles globaux Tailwind
│   ├── layout.tsx           # Layout principal
│   ├── page.tsx             # Page d'accueil
│   ├── login/
│   │   └── page.tsx         # Page de connexion
│   ├── dashboard/
│   │   └── page.tsx         # Redirect selon rôle
│   ├── client/              # Interface La Redoute (TODO)
│   ├── magasin/             # Interface Magasins (TODO)
│   └── admin/               # Interface Admin Phenix Log (TODO)
├── components/              # Composants réutilisables (TODO)
│   ├── ui/                  # shadcn/ui components
│   ├── layout/              # Header, Sidebar, etc.
│   └── ...
├── lib/
│   ├── supabase.ts          # Client Supabase + helpers
│   └── utils.ts             # Fonctions utilitaires
├── types/
│   └── database.types.ts    # Types TypeScript générés
├── middleware.ts            # Middleware auth
├── supabase-schema.sql      # Schéma DB complet
├── SETUP_GUIDE.md           # Guide détaillé
├── PROJECT_BRIEF.md         # Brief business
├── TECHNICAL_SPECS.md       # Specs techniques
└── package.json
```

## 🔧 Configuration IA (OpenRouter)

Le projet utilise désormais l'API **OpenRouter** par défaut pour plus de simplicité et de performance.

1. Créer un compte sur [OpenRouter.ai](https://openrouter.ai/)
2. Générer une clé API
3. L'ajouter dans `.env.local` : `NEXT_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-...`

Le modèle utilisé par défaut est `openai/gpt-4o-mini`.

## 🤖 Configuration Locale (Optionnelle)

Si vous souhaitez utiliser Ollama en local :
1. Installer Ollama sur votre serveur

```bash
curl https://ollama.ai/install.sh | sh
```

### 2. Télécharger un modèle

```bash
ollama pull mistral
# ou
ollama pull llama3
```

### 3. Lancer l'API

```bash
ollama serve
```

API disponible sur `http://localhost:11434`

### 4. Tester

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "mistral",
  "prompt": "Hello",
  "stream": false
}'
```

## 🤖 Configuration n8n

### Workflow : Send Email

1. Créer un workflow dans n8n
2. Ajouter un **Webhook** node (path: `send-email`)
3. Ajouter un node **Microsoft Outlook** ou **SMTP**
4. Configurer avec vos credentials Outlook
5. Copier l'URL du webhook dans `.env.local`

Voir `TECHNICAL_SPECS.md` pour le workflow complet.

## 📦 Déploiement Vercel

### 1. Push sur GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Déployer sur Vercel

1. Aller sur https://vercel.com
2. Importer le projet depuis GitHub
3. Ajouter les variables d'environnement (même que `.env.local`)
4. Deploy !

## 🧪 Tests

### Comptes de test

| Rôle | Email | Password | Accès |
|------|-------|----------|-------|
| Admin | adriana@phenixlog.com | admin123 | Toutes les commandes |
| Client | commandes@laredoute.fr | client123 | Multi-magasins |
| Magasin | paris@laredoute.fr | magasin123 | Magasin Paris uniquement |

### Flow de test complet

1. **Se connecter en tant que Client** (commandes@laredoute.fr)
   - Sélectionner plusieurs magasins
   - Ajouter des produits au panier
   - Valider la commande

2. **Se connecter en tant qu'Admin** (adriana@phenixlog.com)
   - Voir la commande créée
   - Ouvrir le détail
   - Upload des photos
   - Générer l'email via IA
   - Éditer si besoin
   - Envoyer l'email

3. **Vérifier l'email envoyé**
   - Check dans la boîte de réception
   - Vérifier les photos jointes

## 📚 Documentation

- **PROJECT_BRIEF.md** : Contexte business et périmètre
- **TECHNICAL_SPECS.md** : Architecture et specs techniques
- **SETUP_GUIDE.md** : Guide de setup détaillé pas à pas
- **supabase-schema.sql** : Schéma complet de la base de données

## 🛠️ Développement

### Scripts disponibles

```bash
npm run dev      # Lancer le serveur de développement
npm run build    # Build pour production
npm run start    # Lancer la version production
npm run lint     # Linter le code
```

### Prochaines étapes de développement

- [ ] Interface Client : Catalogue produits + Panier
- [ ] Interface Magasin : Commande simplifiée
- [ ] Interface Admin : Dashboard + Upload photos
- [ ] Composant génération email IA
- [ ] Intégration n8n pour envoi emails
- [ ] Tests end-to-end
- [ ] Responsive design
- [ ] Documentation utilisateur

## 🐛 Troubleshooting

### Erreur "relation does not exist"
→ Exécuter le fichier `supabase-schema.sql` dans Supabase SQL Editor

### Erreur RLS Policy
→ Vérifier que l'utilisateur est bien inséré dans la table `users` avec le bon rôle

### Photos ne s'affichent pas
→ Vérifier que le bucket `commande-photos` est **public**

### Ollama ne répond pas
→ Vérifier que `ollama serve` est lancé et que le port 11434 est ouvert

## 📞 Support

**Dev Lead** : Keyvan (Phenix Log)
**Stack** : Next.js 14 + Supabase + Ollama + n8n
**Timeline** : 30h de dev sur 2 semaines

---

**Built with ❤️ for La Redoute x Phenix Log**
