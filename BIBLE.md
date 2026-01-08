# 📖 RetailLR - BIBLE PRODUIT

> *Version 1.0 - 8 Janvier 2026*
> *"On n'est pas là pour remplacer Excel, on est là pour automatiser ce qui vient après."*

---

## 🎯 Vision Produit

**RetailLR** est un outil de gestion de commandes d'échantillons qui permet à **La Redoute** de déposer ses fichiers de commandes et de suivre leur traitement, tandis que **Phenix Log** automatise les communications et le suivi grâce à l'IA.

```
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────────┐
│   LA REDOUTE    │      │      RETAIL LR       │      │   PHENIX LOG    │
│                 │      │                      │      │                 │
│  Upload Excel   │─────►│  Parsing + Récap     │─────►│  Traitement     │
│  (= Commande)   │      │  Validation client   │      │  Préparation    │
│                 │◄─────│  Suivi en temps réel │◄─────│  Envoi          │
│  Visibilité     │      │  Notifications       │      │  Emails IA      │
└─────────────────┘      └──────────────────────┘      └─────────────────┘
```

---

## 🚫 Ce que l'outil N'EST PAS

- ❌ Un e-commerce d'échantillons
- ❌ Un remplacement du fichier Excel La Redoute
- ❌ Un catalogue de produits à maintenir
- ❌ Un système de stockage de données La Redoute long terme

---

## ✅ Ce que l'outil EST

- ✅ Une interface de dépôt de commandes (fichiers Excel/CSV)
- ✅ Un système de suivi d'avancement des commandes
- ✅ Un générateur d'emails automatisé par IA
- ✅ Un outil de relances automatiques

---

## 👥 Les Utilisateurs

### 1. La Redoute (Client)
**Rôle :** Dépose les commandes, suit l'avancement

**Actions :**
- Upload fichier Excel = Créer une commande
- Voir récapitulatif avant validation
- Sauvegarder en brouillon si besoin
- Valider la commande
- Consulter le statut des commandes en cours

### 2. Phenix Log - Admin (Adriana)
**Rôle :** Traite les commandes, gère le flux

**Actions :**
- Voir toutes les commandes entrantes
- Changer le statut (En préparation → Prêt → Envoyé)
- Générer les emails par IA (1 email par magasin)
- Gérer les relances automatiques
- Marquer les confirmations de réception

---

## 📦 Types de Commandes

Chaque fichier Excel correspond à UN type de commande :

| Type | Description |
|------|-------------|
| **Consommables** | Stickers, badges, réglettes... |
| **Échantillons LRI** | Échantillons canapé La Redoute Intérieurs |
| **Échantillons AM.PM** | Échantillons collection AM.PM |
| **Pentes** | Échantillons pentes (tissus inclinés) |
| **Tissus** | Échantillons tissus bruts |

---

## 🔄 Flux de Travail

```
1. DÉPÔT       │  La Redoute upload le fichier Excel
               │  → Système parse et affiche récap
               ▼
2. VALIDATION  │  La Redoute vérifie et valide
               │  → Commande créée (statut: "Nouvelle")
               ▼
3. TRAITEMENT  │  Phenix prend en charge
               │  → Statut: "En préparation"
               ▼
4. PRÊT        │  Commande prête à partir
               │  → Statut: "Prête"
               ▼
5. ENVOI       │  Colis expédié
               │  → Statut: "Envoyée"
               │  → 🤖 EMAIL IA généré et envoyé par magasin
               ▼
6. SUIVI       │  Attente confirmation réception
               │  → 🤖 RELANCES automatiques si pas de réponse
               ▼
7. CLÔTURE     │  Confirmation reçue de tous les magasins
               │  → Statut: "Terminée"
```

---

## 🤖 Où intervient l'IA

| Fonctionnalité | IA ? | Description |
|----------------|------|-------------|
| Parsing Excel | ❌ | Lecture structurée du fichier |
| Affichage récap | ❌ | Tableau des données parsées |
| Génération email | ✅ | Email personnalisé format Adriana |
| Envoi email | ❌ | API Resend classique |
| Relances | ✅ | Détection délai + génération relance |

**L'IA est ciblée** : génération de contenu textuel uniquement.

---

## 📊 Structure du Fichier Excel (Input)

Basé sur les fichiers La Redoute existants :

| Colonne | Contenu |
|---------|---------|
| A | Gamme Redoute (AMAD, AMEDEA...) |
| B | Gamme Tissus (STELLA, FIORD...) |
| C | Tissu Fournisseur |
| D | Matière Siège |
| E | Libellé Coloris |
| F | Cavaliers |
| G | Statut (Nouveauté PE26, RECONDUIT) |
| H+ | Magasins (Annecy, Bordeaux...) avec X si concerné |

---

## 🗂️ Modèle de Données Simplifié

```
COMMANDE
├── id
├── type (consommable | ech_lri | ech_ampm | pente | tissu)
├── fichier_original (URL du fichier uploadé)
├── statut (brouillon | nouvelle | en_preparation | prete | envoyee | terminee)
├── created_at
├── validated_at
└── user_id (La Redoute)

COMMANDE_LIGNES (données parsées du fichier)
├── commande_id
├── gamme_redoute
├── gamme_tissus
├── tissu_fournisseur
├── matiere
├── coloris
├── statut_produit (nouveaute | reconduit)
└── magasins_concernes (JSON array)

EMAILS_SENT
├── commande_id
├── magasin_nom
├── statut_reponse
├── date_envoi
├── date_relance
└── date_confirmation
```

---

## 🖥️ Écrans à Développer

### Côté La Redoute
1. **Upload** - Déposer un fichier + choisir le type
2. **Récapitulatif** - Voir les données parsées avant validation
3. **Mes Commandes** - Liste des commandes + statuts

### Côté Phenix Admin
1. **Dashboard** - Vue d'ensemble des commandes
2. **Détail Commande** - Données complètes + actions
3. **Génération Email** - Preview + envoi par magasin
4. **Suivi Emails** - Tableau de bord des réponses/relances

---

## 📈 KPIs de Succès

- Temps de traitement commande réduit
- 0 email oublié
- Taux de réponse magasins amélioré (grâce aux relances auto)
- La Redoute satisfait = renouvellement contrat

---

## 🚀 Roadmap

### Phase 1 : MVP (Cette semaine)
- [ ] Refonte data model
- [ ] Upload fichier Excel côté client
- [ ] Parsing + affichage récap
- [ ] Validation commande
- [ ] Vue admin basique

### Phase 2 : Automatisation (Semaine prochaine)
- [ ] Génération emails IA par magasin
- [ ] Envoi automatique après passage en "Envoyée"
- [ ] Système de relances

### Phase 3 : Polish
- [ ] Notifications temps réel
- [ ] Export rapports
- [ ] Historique complet

---

## 💬 Le Pitch Commercial

> *"RetailLR permet à La Redoute de déposer ses commandes d'échantillons en un clic. 
> Notre système automatise ensuite les communications avec chaque magasin : 
> emails personnalisés, suivi des réponses, et relances automatiques. 
> Résultat : 0 oubli, 100% de traçabilité, et un gain de temps significatif."*

---

*Dernière mise à jour : 8 Janvier 2026*
