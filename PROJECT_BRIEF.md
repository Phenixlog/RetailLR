# 🎯 Projet : Plateforme de Gestion des Commandes d'Échantillons La Redoute

## Contexte Business

**Client :** La Redoute  
**Partenaire logistique :** Phenix Log  
**Problème actuel :** Process manuel complet (emails, Excel, photos par mail) pour gérer les commandes d'échantillons destinés aux magasins La Redoute.

### Douleurs identifiées
- Commandes faites par email/Excel dispersées
- Adriana (admin Phenix Log) doit tout gérer manuellement
- Photos de confirmation envoyées par email
- Aucune traçabilité ni historique
- Relances manuelles oubliées
- Temps perdu, erreurs fréquentes

---

## Solution : Plateforme Web Centralisée + IA

### Objectifs
1. **Digitaliser** le process de commande bout en bout
2. **Automatiser** la génération et l'envoi des emails de confirmation
3. **Centraliser** toutes les données (commandes, historique, photos)
4. **Simplifier** le travail d'Adriana avec l'IA

### Valeur ajoutée
- Gain de temps pour tous (client + Phenix Log)
- Zéro perte d'information
- Traçabilité complète
- Professionnalisation du process
- Relances automatiques

---

## Périmètre Fonctionnel

### 3 Rôles Utilisateurs

#### 1. **La Redoute (Client - Multi-magasins)**
**Permissions :**
- Passer des commandes pour UN ou PLUSIEURS magasins
- Sélectionner des références produits dans un catalogue
- Voir l'historique de toutes leurs commandes

**Flow :**
1. Connexion → Dashboard
2. Sélection magasin(s) cible(s)
3. Sélection références produits (catalogue)
4. Validation commande
5. Commande envoyée à Phenix Log

---

#### 2. **Magasins La Redoute (Utilisateurs finaux)**
**Permissions :**
- Passer des commandes UNIQUEMENT pour leur propre magasin
- Sélectionner des références produits
- Voir l'historique de leurs commandes

**Flow :**
1. Connexion → Leur magasin est déjà filtré
2. Sélection références produits
3. Validation commande
4. Commande envoyée à Phenix Log

---

#### 3. **Admin Phenix Log (Adriana)**
**Permissions :**
- Voir TOUTES les commandes (tous magasins)
- Filtrer par magasin, date, statut
- Upload photos de préparation par commande
- **Générer automatiquement l'email de confirmation via IA**
- Éditer le mail si besoin
- Envoyer l'email en 1 clic
- Voir l'historique complet des envois

**Flow :**
1. Connexion → Dashboard avec liste des commandes
2. Sélection d'une commande → Upload photos
3. IA génère automatiquement l'email de confirmation (avec photos intégrées)
4. Adriana relit, ajuste si besoin
5. Envoi en 1 clic
6. Si pas de réponse sous 3 jours → Relance automatique

---

## Architecture Technique

### Stack
- **Frontend :** React/Next.js (Vite acceptable si plus rapide)
- **Backend :** Supabase (Auth + Database + Storage)
- **IA :** LLM local (Ollama) pour génération emails
- **Automation :** n8n pour workflows (envoi emails, relances)
- **Styling :** Tailwind CSS + shadcn/ui

### Supabase - Schéma de données

#### Tables principales

**users**
- id (uuid, PK)
- email (text, unique)
- role (enum: 'la_redoute', 'magasin', 'admin')
- magasin_id (uuid, FK nullable) → NULL si role = 'la_redoute' ou 'admin'
- created_at (timestamp)

**magasins**
- id (uuid, PK)
- nom (text)
- code (text, unique) → ex: "MAG_001"
- ville (text)
- created_at (timestamp)

**produits**
- id (uuid, PK)
- reference (text, unique) → ex: "REF_12345"
- nom (text)
- description (text)
- image_url (text)
- created_at (timestamp)

**commandes**
- id (uuid, PK)
- user_id (uuid, FK → users)
- statut (enum: 'en_attente', 'en_preparation', 'confirmee', 'envoyee')
- created_at (timestamp)
- confirmed_at (timestamp, nullable)

**commande_magasins** (relation N-N)
- id (uuid, PK)
- commande_id (uuid, FK → commandes)
- magasin_id (uuid, FK → magasins)

**commande_produits** (relation N-N avec quantités)
- id (uuid, PK)
- commande_id (uuid, FK → commandes)
- produit_id (uuid, FK → produits)
- quantite (integer)

**photos**
- id (uuid, PK)
- commande_id (uuid, FK → commandes)
- file_path (text) → chemin Supabase Storage
- uploaded_by (uuid, FK → users)
- created_at (timestamp)

**emails_sent**
- id (uuid, PK)
- commande_id (uuid, FK → commandes)
- subject (text)
- body (text)
- sent_at (timestamp)
- sent_by (uuid, FK → users)
- relance (boolean) → true si c'est une relance

---

## Fonctionnalités Clés

### 1. Authentification & Autorisations (RLS Supabase)
- Login par email/password (Supabase Auth)
- Redirection selon rôle après login
- RLS policies strictes par rôle

### 2. Interface Client/Magasin (Commande)
- Catalogue produits avec recherche/filtres
- Sélecteur magasins (si role = 'la_redoute')
- Panier avec quantités
- Validation → Insertion en DB

### 3. Interface Admin (Adriana)
- Dashboard : liste des commandes avec filtres
- Détail commande : infos + upload photos
- **Bouton "Générer email"** → Appel IA locale
- Preview email généré
- Édition manuelle possible (textarea)
- Bouton "Envoyer" → Trigger n8n workflow

### 4. IA - Génération Email
**Input :**
- Données commande (magasins, produits, quantités)
- Photos uploadées (URLs Supabase Storage)

**Output :**
- Email formaté en HTML/plain text
- Ton professionnel
- Photos intégrées
- Récapitulatif clair

**Prompt IA (exemple) :**
```
Tu es un assistant qui génère des emails de confirmation de commande pour un partenaire logistique.

Contexte :
- Client : La Redoute
- Partenaire : Phenix Log
- Commande #{id}

Informations commande :
- Magasin(s) : {liste_magasins}
- Références commandées : {liste_produits_quantites}
- Photos de préparation : {nb_photos} photo(s) jointe(s)

Génère un email professionnel de confirmation avec :
1. Objet clair
2. Corps structuré (salutation, récapitulatif, photos, signature)
3. Ton cordial mais professionnel

Format de sortie : JSON avec "subject" et "body" (HTML).
```

### 5. Automation n8n
**Workflow 1 : Envoi email**
- Trigger : Webhook depuis l'app (bouton "Envoyer")
- Action : SMTP send email
- Log dans table `emails_sent`

**Workflow 2 : Relances automatiques**
- Trigger : Cron (tous les jours à 9h)
- Query DB : commandes avec statut != 'confirmee' ET envoyées il y a > 3 jours
- Action : Envoi email de relance
- Log dans `emails_sent` (relance = true)

---

## Contraintes & Priorités

### Must-Have (MVP)
✅ Auth 3 rôles  
✅ CRUD commandes  
✅ Upload photos  
✅ Génération email IA  
✅ Envoi email manuel (via bouton)  
✅ Historique commandes  

### Nice-to-Have (v2)
🔜 Relances automatiques (n8n cron)  
🔜 Notifications in-app  
🔜 Export Excel des commandes  
🔜 Dashboard analytics  

### Hors scope MVP
❌ Mobile app native  
❌ Gestion catalogue produits (on seed en dur pour le MVP)  
❌ Multi-langue  
❌ Système de commentaires/chat  

---

## Timeline & Contraintes

**Objectif :** MVP fonctionnel en **30 heures de dev**  
**Deadline :** 2 semaines  
**Approche :** Vibes coding, pas de sur-engineering  

### Phases
1. **Setup (3h)** : Supabase tables, RLS, n8n, IA locale
2. **Frontend (12h)** : 3 interfaces (Client, Magasin, Admin)
3. **IA + Automation (8h)** : Génération emails, workflows n8n
4. **Tests (5h)** : Tests bout en bout, debug
5. **Doc (2h)** : README + guide utilisateur

---

## Livrables Attendus

1. **Application web fonctionnelle**
   - 3 interfaces selon rôles
   - Responsive (desktop prioritaire, mobile ok)

2. **Workflows n8n configurés**
   - Envoi email
   - Relances auto (si temps)

3. **Documentation**
   - README technique (setup, env vars)
   - Guide utilisateur (screenshots + explications)

4. **Démo**
   - Vidéo walkthrough 5 min
   - Données de test (users, magasins, produits)

---

## Notes Importantes

- **Sécurité :** IA tourne en local (aucune fuite de données)
- **Design :** Fonctionnel > Joli (on utilise shadcn/ui pour aller vite)
- **Code :** Pragmatique, pas parfait (on itère après le MVP)
- **Client :** La Redoute est déjà partenaire, c'est une porte d'entrée stratégique

---

## Contact & Validation

**Product Owner :** Keyvan (Phenix Log)  
**Users clés :** Adriana (admin), équipes La Redoute  
**Budget :** 30h dev = ~3 000€ forfait  

**Validation attendue :**
- Démo avec La Redoute dans 2 semaines
- Feedback utilisateurs (Adriana en priorité)
- Go/No-Go pour évolutions (phase 2)
