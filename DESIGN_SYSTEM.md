# 🎨 Design System Premium - La Redoute x Phenix Log

## Vision

Un design system élégant, féminin et minimaliste inspiré des meilleurs SaaS 2025 (Notion, Linear, Stripe).

**Philosophie** : Élégance sans ostentation, modernité sans complexité, féminité sans clichés.

---

## 🌈 Palette de Couleurs

### Primary - Rose Signature
Le rose signature de La Redoute, vibrant mais sophistiqué.

```
50:  #fff1f4  // Très clair, backgrounds
100: #ffe1e9  // Hover states
200: #ffc7d7  // Borders
300: #ff9db5  // Disabled states
400: #ff628d  // Hover primary
500: #ff3366  // 🎯 Primary color
600: #e60f52  // Active states
700: #c20645  // Dark mode
800: #a00841
900: #880b3e  // Text on light backgrounds
```

### Accent - Corail Chaleureux
Pour les CTA secondaires et accents visuels.

```
50:  #fff8f5
100: #fff0e8
200: #ffdcc6
300: #ffc099
400: #ff9a60
500: #ff7b3d  // 🎯 Accent color
600: #f25c1a
700: #d94a12
800: #b33e13
900: #923616
```

### Neutral - Gris Chauds (Stone)
Base pour tous les textes et backgrounds.

```
50:  #fafaf9  // Body background
100: #f5f5f4  // Card background
200: #e7e5e4  // Borders
300: #d6d3d1  // Disabled
400: #a8a29e  // Placeholder
500: #78716c  // Secondary text
600: #57534e  // Primary text
700: #44403c  // Headings
800: #292524  // Strong emphasis
900: #1c1917  // Maximum contrast
```

### Success, Warning, Info
```
Success: #22c55e (vert doux)
Warning: #f59e0b (ambre)
Info:    #3b82f6 (bleu pastel)
```

---

## ✨ Composants UI

### Button
Variants disponibles :
- `primary` - Gradient rose (CTA principal)
- `secondary` - Bleu/cyan
- `success` - Vert
- `outline` - Bordure, fond transparent
- `ghost` - Transparent, hover subtil
- `danger` - Rouge

Props :
- `isLoading` - État de chargement avec spinner
- `leftIcon` / `rightIcon` - Icônes
- `fullWidth` - Largeur 100%
- `size` - sm | md | lg

### Card
Variants :
- `default` - Fond blanc, ombre subtile
- `elevated` - Ombre plus prononcée
- `outlined` - Bordure 2px
- `ghost` - Fond gris clair

Props :
- `hoverable` - Hover effect (scale + shadow)
- `clickable` - Active effect

### Input
Features :
- Label automatique
- Erreur avec animation
- Helper text
- Icônes gauche/droite
- Focus ring rose

### Badge
Pour les statuts de commandes :
- `en_attente` - Jaune/ambre
- `en_preparation` - Bleu
- `confirmee` - Vert
- `envoyee` - Violet

### Modal
- Backdrop avec blur
- Animation slide + fade
- Fermeture ESC
- Tailles : sm | md | lg | xl | full

---

## 🎭 Animations

### Keyframes

```css
fadeIn      - Apparition douce (0.6s)
slideUp     - Monte de 20px (0.6s)
slideDown   - Descend de 20px (0.5s)
scaleIn     - Zoom de 0.9 à 1 (0.4s)
float       - Flottement vertical (4s loop)
shimmer     - Effet de brillance (2s loop)
pulse-soft  - Pulsation douce (2s loop)
```

### Easing
Toutes les animations utilisent : `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out fluide)

### Usage

```tsx
<div className="animate-fadeIn">Content</div>
<div className="animate-slideUp" style={{ animationDelay: '100ms' }}>Delayed</div>
<div className="animate-float">Logo flottant</div>
```

---

## 🌫️ Effets Spéciaux

### Glassmorphism

```tsx
<div className="glass">
  {/* Fond blanc semi-transparent avec blur */}
</div>

<div className="glass-dark">
  {/* Version sombre */}
</div>
```

### Gradients

```tsx
<div className="gradient-rose">
  {/* Gradient primary → accent */}
</div>

<div className="gradient-rose-soft">
  {/* Gradient doux pour backgrounds */}
</div>

<div className="gradient-mesh">
  {/* Gradient mesh multiple pour backgrounds hero */}
</div>
```

### Shadows

```tsx
shadow-soft  - Ombre très douce
shadow-glow  - Halo rose autour des éléments
```

---

## 📐 Espacements

Échelle harmonieuse basée sur 8pt :

```
xs:  8px   (0.5rem)
sm:  12px  (0.75rem)
md:  16px  (1rem)
lg:  24px  (1.5rem)
xl:  32px  (2rem)
2xl: 48px  (3rem)
3xl: 64px  (4rem)
4xl: 96px  (6rem)
```

---

## 🔤 Typographie

### Scale

```
xs:   12px  (0.75rem)
sm:   14px  (0.875rem)
base: 16px  (1rem)      ← Body text
lg:   18px  (1.125rem)
xl:   20px  (1.25rem)
2xl:  24px  (1.5rem)
3xl:  30px  (1.875rem)
4xl:  36px  (2.25rem)
5xl:  48px  (3rem)
```

### Font Features
- Ligatures activées (`rlig`, `calt`)
- Anti-aliasing optimisé

---

## 🎨 Exemples d'Usage

### Page de Login

```tsx
<div className="min-h-screen gradient-mesh">
  {/* Blobs flottants */}
  <div className="bg-primary-200 rounded-full blur-3xl animate-float" />

  {/* Card principale */}
  <div className="glass rounded-3xl shadow-2xl">
    {/* Logo avec gradient */}
    <div className="bg-gradient-to-br from-primary-500 to-accent-500 animate-float">
      <svg />
    </div>

    {/* Titre avec gradient text */}
    <h1>
      <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
        La Redoute
      </span>
    </h1>
  </div>
</div>
```

### Stats Cards

```tsx
<Card hoverable className="animate-slideUp">
  <CardContent>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-stone-600">Total commandes</p>
        <p className="text-3xl font-bold">{count}</p>
      </div>
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500">
        📦
      </div>
    </div>
  </CardContent>
</Card>
```

### Boutons avec gradient

```tsx
<Button
  variant="primary"
  className="gradient-rose shadow-glow"
>
  Créer une commande
</Button>
```

---

## 🎯 Principes de Design

### 1. Espacement Généreux
Toujours privilégier l'air, ne jamais serrer les éléments.

### 2. Hiérarchie Claire
- Titres : font-bold, text-stone-700
- Texte principal : text-stone-600
- Secondaire : text-stone-500

### 3. Micro-interactions
Chaque élément interactif a :
- Hover effect (scale, shadow, color)
- Active state (légère compression)
- Focus ring rose

### 4. Feedback Visuel
- Loading states partout
- Animations de transition entre états
- Messages d'erreur clairs et animés

### 5. Accessibilité
- Contraste minimum 4.5:1
- Focus visible
- Textes alt sur images
- Tailles touch-friendly (min 44x44px)

---

## 🚀 Quick Start

### 1. Importer les styles

```tsx
import '@/app/globals.css'
```

### 2. Utiliser les composants

```tsx
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
```

### 3. Appliquer les classes

```tsx
<div className="gradient-mesh min-h-screen">
  <div className="glass rounded-3xl p-8 animate-slideUp">
    <Button className="gradient-rose">Click me</Button>
  </div>
</div>
```

---

## 📦 Fichiers du Design System

```
/styles/design-tokens.ts   - Tokens de design (couleurs, espacements, etc.)
/app/globals.css           - Animations, gradients, utilities
/tailwind.config.ts        - Configuration Tailwind avec palette
/components/ui/            - Composants réutilisables
```

---

## 🎨 Palette Figma

Pour exporter vers Figma :

```
Primary:   #ff3366
Accent:    #ff7b3d
Stone-50:  #fafaf9
Stone-900: #1c1917
Success:   #22c55e
Warning:   #f59e0b
Info:      #3b82f6
```

---

**Construit avec ❤️ pour des femmes qui méritent de beaux outils**
