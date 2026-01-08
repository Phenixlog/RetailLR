# ⚙️ Spécifications Techniques - Plateforme La Redoute x Phenix Log

## Stack Technique

### Frontend
- **Framework :** Next.js 14+ (App Router) ou Vite + React (au choix selon rapidité)
- **UI Library :** shadcn/ui + Tailwind CSS
- **State Management :** React Context ou Zustand (léger)
- **Forms :** React Hook Form + Zod validation
- **HTTP Client :** Supabase JS Client

### Backend
- **BaaS :** Supabase
  - Auth (email/password)
  - Database (PostgreSQL)
  - Storage (photos)
  - Row Level Security (RLS)
  
### IA & Automation
- **API IA :** OpenRouter (GPT-4o) - Méthode prioritaire
- **LLM Local (Optionnel) :** Ollama (modèle : llama3 ou mistral)
- **Orchestration :** n8n (self-hosted ou cloud)
- **Email :** SMTP via n8n (Gmail, SendGrid, ou Brevo)

### Dev Tools
- **IDE :** Cursor / VS Code
- **Package Manager :** pnpm ou npm
- **Version Control :** Git

---

## Architecture Applicative

### Structure Frontend

```
/app (ou /src)
├── /components
│   ├── /ui (shadcn components)
│   ├── /auth (Login, ProtectedRoute)
│   ├── /catalogue (ProductCard, ProductList)
│   ├── /commande (CartItem, OrderForm)
│   ├── /admin (OrderTable, PhotoUpload, EmailGenerator)
│   └── /layout (Header, Sidebar, Footer)
├── /pages (ou /app routes)
│   ├── /login
│   ├── /dashboard (redirect selon rôle)
│   ├── /client
│   │   ├── /commande
│   │   └── /historique
│   ├── /magasin
│   │   ├── /commande
│   │   └── /historique
│   └── /admin
│       ├── /commandes (liste)
│       ├── /commande/[id] (détail + photos + email)
│       └── /historique
├── /lib
│   ├── supabase.ts (client config)
│   ├── utils.ts
│   └── constants.ts
├── /hooks
│   ├── useAuth.ts
│   ├── useCommandes.ts
│   └── useProduits.ts
└── /types
    └── database.types.ts (généré par Supabase CLI)
```

---

## Supabase - Configuration

### 1. Variables d'environnement

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx... (backend only)

# n8n webhook
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/send-email

# OpenRouter API Key
NEXT_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-...

# Ollama (Optionnel)
OLLAMA_API_URL=http://localhost:11434
```

### 2. Row Level Security (RLS) Policies

#### Table `users`
```sql
-- Les users ne peuvent voir que leur propre profil
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);
```

#### Table `commandes`
```sql
-- La Redoute voit toutes les commandes qu'ils ont créées
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

-- Admin voit tout
CREATE POLICY "Admin views all orders"
ON commandes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);
```

#### Table `photos`
```sql
-- Seul l'admin peut uploader des photos
CREATE POLICY "Admin can upload photos"
ON photos FOR INSERT
USING (
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
    SELECT 1 FROM commandes
    WHERE commandes.id = photos.commande_id
    -- (ajouter logique RLS commandes ici)
  )
);
```

### 3. Storage Bucket (Photos)

**Bucket name :** `commande-photos`

**RLS Policy :**
```sql
-- Seul l'admin peut upload
CREATE POLICY "Admin can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'commande-photos'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Tout le monde authentifié peut voir
CREATE POLICY "Authenticated users can view"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'commande-photos'
  AND auth.role() = 'authenticated'
);
```

---

## Flux de Données

### 1. Création de Commande (Client/Magasin)

```typescript
// Flow simplifié
async function createCommande(data: {
  magasins: string[], // IDs des magasins
  produits: { id: string, quantite: number }[]
}) {
  const { data: commande, error } = await supabase
    .from('commandes')
    .insert({
      user_id: user.id,
      statut: 'en_attente'
    })
    .select()
    .single();

  // Insert relations magasins
  await supabase.from('commande_magasins').insert(
    magasins.map(mag_id => ({
      commande_id: commande.id,
      magasin_id: mag_id
    }))
  );

  // Insert relations produits
  await supabase.from('commande_produits').insert(
    produits.map(prod => ({
      commande_id: commande.id,
      produit_id: prod.id,
      quantite: prod.quantite
    }))
  );

  return commande;
}
```

### 2. Upload Photos (Admin)

```typescript
async function uploadPhotos(commandeId: string, files: File[]) {
  const uploads = await Promise.all(
    files.map(async (file) => {
      const filePath = `${commandeId}/${Date.now()}_${file.name}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('commande-photos')
        .upload(filePath, file);

      // Insert metadata in photos table
      await supabase.from('photos').insert({
        commande_id: commandeId,
        file_path: filePath,
        uploaded_by: user.id
      });

      return data;
    })
  );
  
  return uploads;
}
```

### 3. Génération Email (IA)

**Option A : API Call direct (si Ollama en API)**

```typescript
async function generateEmail(commande: Commande) {
  const prompt = `
Tu es un assistant qui génère des emails de confirmation de commande.

Commande #${commande.id}
Magasins : ${commande.magasins.map(m => m.nom).join(', ')}
Produits : ${commande.produits.map(p => `${p.nom} (x${p.quantite})`).join(', ')}
Photos : ${commande.photos.length} photo(s) jointe(s)

Génère un email professionnel avec objet et corps (HTML).
Format JSON : { "subject": "...", "body": "..." }
`;

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: 'llama3',
      prompt: prompt,
      stream: false
    })
  });

  const result = await response.json();
  return JSON.parse(result.response);
}
```

**Option B : Via n8n Workflow**

```typescript
async function generateEmail(commande: Commande) {
  const response = await fetch(process.env.N8N_WEBHOOK_GENERATE_EMAIL, {
    method: 'POST',
    body: JSON.stringify({
      commande_id: commande.id,
      magasins: commande.magasins,
      produits: commande.produits,
      photos: commande.photos
    })
  });

  return response.json(); // { subject, body }
}
```

### 4. Envoi Email (n8n)

**Workflow n8n "Send Email"**

1. **Webhook Node** (trigger)
   - URL : `/webhook/send-email`
   - Method : POST
   - Body : `{ commande_id, subject, body, recipient }`

2. **HTTP Request Node** (récupérer photos URLs depuis Supabase)
   - GET photos de la commande
   - Générer signed URLs

3. **Email Node (SMTP)**
   - To : `{{ $json.recipient }}`
   - Subject : `{{ $json.subject }}`
   - Body : `{{ $json.body }}`
   - Attachments : Photos URLs

4. **HTTP Request Node** (log dans Supabase)
   - POST vers Supabase REST API
   - Insert dans `emails_sent`

---

## Composants UI Clés

### 1. ProductCard (Catalogue)

```tsx
interface ProductCardProps {
  product: Product;
  onSelect: (productId: string, quantity: number) => void;
  selected?: number; // quantité déjà sélectionnée
}

export function ProductCard({ product, onSelect, selected }: ProductCardProps) {
  return (
    <div className="border rounded-lg p-4">
      <img src={product.image_url} alt={product.nom} />
      <h3>{product.nom}</h3>
      <p>{product.reference}</p>
      <input 
        type="number" 
        min="0" 
        value={selected || 0}
        onChange={(e) => onSelect(product.id, parseInt(e.target.value))}
      />
    </div>
  );
}
```

### 2. PhotoUpload (Admin)

```tsx
export function PhotoUpload({ commandeId }: { commandeId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    setUploading(true);
    await uploadPhotos(commandeId, files);
    setUploading(false);
    // Refresh photos list
  }

  return (
    <div>
      <input 
        type="file" 
        multiple 
        accept="image/*"
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Upload...' : 'Envoyer photos'}
      </button>
    </div>
  );
}
```

### 3. EmailGenerator (Admin)

```tsx
export function EmailGenerator({ commande }: { commande: Commande }) {
  const [email, setEmail] = useState<{ subject: string; body: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    const generated = await generateEmail(commande);
    setEmail(generated);
    setGenerating(false);
  }

  async function handleSend() {
    setSending(true);
    await fetch(process.env.N8N_WEBHOOK_SEND_EMAIL, {
      method: 'POST',
      body: JSON.stringify({
        commande_id: commande.id,
        subject: email.subject,
        body: email.body,
        recipient: 'client@laredoute.fr'
      })
    });
    setSending(false);
    // Update commande status
  }

  return (
    <div>
      <button onClick={handleGenerate} disabled={generating}>
        {generating ? 'Génération...' : 'Générer email'}
      </button>

      {email && (
        <div>
          <input 
            value={email.subject} 
            onChange={(e) => setEmail({ ...email, subject: e.target.value })}
          />
          <textarea 
            value={email.body}
            onChange={(e) => setEmail({ ...email, body: e.target.value })}
            rows={10}
          />
          <button onClick={handleSend} disabled={sending}>
            {sending ? 'Envoi...' : 'Envoyer email'}
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Workflows n8n

### Workflow 1 : Send Email

```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "send-email",
        "method": "POST"
      }
    },
    {
      "name": "Get Photos",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "={{ $env.SUPABASE_URL }}/rest/v1/photos",
        "qs": {
          "commande_id": "eq.{{ $json.commande_id }}",
          "select": "*"
        },
        "authentication": "headerAuth",
        "headerAuth": {
          "name": "apikey",
          "value": "={{ $env.SUPABASE_SERVICE_KEY }}"
        }
      }
    },
    {
      "name": "Generate Signed URLs",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "code": "// Generate signed URLs for photos"
      }
    },
    {
      "name": "Send Email",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "fromEmail": "noreply@phenixlog.com",
        "toEmail": "={{ $json.recipient }}",
        "subject": "={{ $json.subject }}",
        "html": "={{ $json.body }}",
        "attachments": "={{ $json.photoUrls }}"
      }
    },
    {
      "name": "Log to Supabase",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "={{ $env.SUPABASE_URL }}/rest/v1/emails_sent",
        "method": "POST",
        "body": {
          "commande_id": "={{ $json.commande_id }}",
          "subject": "={{ $json.subject }}",
          "body": "={{ $json.body }}",
          "sent_by": "={{ $json.user_id }}",
          "relance": false
        }
      }
    }
  ]
}
```

### Workflow 2 : Auto Relance (Cron)

```json
{
  "nodes": [
    {
      "name": "Schedule",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{ "field": "cronExpression", "expression": "0 9 * * *" }]
        }
      }
    },
    {
      "name": "Get Pending Orders",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "={{ $env.SUPABASE_URL }}/rest/v1/commandes",
        "qs": {
          "statut": "neq.confirmee",
          "created_at": "lt.{{ $now.minus({days: 3}).toISO() }}",
          "select": "*"
        }
      }
    },
    {
      "name": "Loop Orders",
      "type": "n8n-nodes-base.splitInBatches"
    },
    {
      "name": "Send Relance",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "toEmail": "client@laredoute.fr",
        "subject": "Relance - Commande #{{ $json.id }}",
        "text": "Bonjour, nous n'avons pas encore reçu de confirmation..."
      }
    }
  ]
}
```

---

## Seed Data (Tests)

### Script SQL pour créer des données de test

```sql
-- Insert magasins
INSERT INTO magasins (id, nom, code, ville) VALUES
('mag-001', 'La Redoute Paris Haussmann', 'MAG_001', 'Paris'),
('mag-002', 'La Redoute Lyon Part-Dieu', 'MAG_002', 'Lyon'),
('mag-003', 'La Redoute Bordeaux', 'MAG_003', 'Bordeaux');

-- Insert produits
INSERT INTO produits (id, reference, nom, description, image_url) VALUES
('prod-001', 'REF_12345', 'Chemise Blanche', 'Chemise coton blanc', 'https://via.placeholder.com/150'),
('prod-002', 'REF_12346', 'Pantalon Noir', 'Pantalon costume noir', 'https://via.placeholder.com/150'),
('prod-003', 'REF_12347', 'Robe Rouge', 'Robe soirée rouge', 'https://via.placeholder.com/150');

-- Insert users (passwords à hasher via Supabase Auth)
-- Admin
INSERT INTO users (id, email, role, magasin_id) VALUES
('admin-001', 'adriana@phenixlog.com', 'admin', NULL);

-- La Redoute (multi-magasins)
INSERT INTO users (id, email, role, magasin_id) VALUES
('client-001', 'commandes@laredoute.fr', 'la_redoute', NULL);

-- Magasins
INSERT INTO users (id, email, role, magasin_id) VALUES
('mag-user-001', 'paris@laredoute.fr', 'magasin', 'mag-001'),
('mag-user-002', 'lyon@laredoute.fr', 'magasin', 'mag-002');
```

---

## Checklist Développement

### Phase 1 : Setup (3h)
- [ ] Init projet Next.js/Vite
- [ ] Install dependencies (Supabase, shadcn, etc.)
- [ ] Configure Supabase client
- [ ] Create database tables
- [ ] Setup RLS policies
- [ ] Create storage bucket
- [ ] Seed test data
- [ ] Setup n8n workflows (basic)

### Phase 2 : Auth & Routing (2h)
- [ ] Login page
- [ ] Supabase Auth integration
- [ ] Protected routes
- [ ] Role-based redirects

### Phase 3 : Client/Magasin Interface (5h)
- [ ] Dashboard layout
- [ ] Catalogue produits
- [ ] Sélecteur magasins (si La Redoute)
- [ ] Panier/Cart
- [ ] Validation commande
- [ ] Historique commandes

### Phase 4 : Admin Interface (5h)
- [ ] Dashboard admin
- [ ] Liste commandes avec filtres
- [ ] Détail commande
- [ ] Upload photos
- [ ] Preview photos

### Phase 5 : IA & Email (5h)
- [ ] Setup Ollama local
- [ ] Prompt engineering email generation
- [ ] Integration IA dans admin UI
- [ ] Email preview component
- [ ] Edit email functionality

### Phase 6 : n8n Workflows (3h)
- [ ] Workflow send email
- [ ] Integration webhook frontend
- [ ] Test envoi email
- [ ] Workflow relance auto (si temps)

### Phase 7 : Tests & Debug (5h)
- [ ] Test flow complet Client
- [ ] Test flow complet Magasin
- [ ] Test flow complet Admin
- [ ] Test edge cases
- [ ] Fix bugs critiques
- [ ] Responsive check

### Phase 8 : Doc & Livraison (2h)
- [ ] README.md
- [ ] Guide utilisateur
- [ ] Video démo
- [ ] Deploy (si applicable)

---

## Notes Importantes

### Sécurité
- Toutes les routes API doivent vérifier l'auth (Supabase JWT)
- RLS policies activées sur TOUTES les tables
- Photos : signed URLs avec expiration
- Pas de secrets dans le code client

### Performance
- Pagination sur les listes (commandes, produits)
- Lazy loading des images
- Optimistic UI updates
- Cache Supabase queries (si possible)

### UX
- Loading states partout
- Error handling avec toasts
- Confirmations avant actions critiques (envoi email)
- Feedback visuel immédiat

---

## Contact & Support

**Dev Lead :** Keyvan (Phenix Log)  
**Stack :** Supabase + n8n + Ollama + React  
**Deadline :** 2 semaines (30h)  
