export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'la_redoute' | 'magasin' | 'admin'
          magasin_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          role: 'la_redoute' | 'magasin' | 'admin'
          magasin_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'la_redoute' | 'magasin' | 'admin'
          magasin_id?: string | null
          created_at?: string
        }
      }
      magasins: {
        Row: {
          id: string
          nom: string
          code: string
          ville: string
          created_at: string
        }
        Insert: {
          id?: string
          nom: string
          code: string
          ville: string
          created_at?: string
        }
        Update: {
          id?: string
          nom?: string
          code?: string
          ville?: string
          created_at?: string
        }
      }
      produits: {
        Row: {
          id: string
          reference: string
          nom: string
          description: string | null
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reference: string
          nom: string
          description?: string | null
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reference?: string
          nom?: string
          description?: string | null
          image_url?: string | null
          created_at?: string
        }
      }
      commandes: {
        Row: {
          id: string
          user_id: string
          statut: 'en_attente' | 'en_preparation' | 'confirmee' | 'envoyee'
          created_at: string
          confirmed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          statut?: 'en_attente' | 'en_preparation' | 'confirmee' | 'envoyee'
          created_at?: string
          confirmed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          statut?: 'en_attente' | 'en_preparation' | 'confirmee' | 'envoyee'
          created_at?: string
          confirmed_at?: string | null
        }
      }
      commande_magasins: {
        Row: {
          id: string
          commande_id: string
          magasin_id: string
        }
        Insert: {
          id?: string
          commande_id: string
          magasin_id: string
        }
        Update: {
          id?: string
          commande_id?: string
          magasin_id?: string
        }
      }
      commande_produits: {
        Row: {
          id: string
          commande_id: string
          produit_id: string
          quantite: number
        }
        Insert: {
          id?: string
          commande_id: string
          produit_id: string
          quantite: number
        }
        Update: {
          id?: string
          commande_id?: string
          produit_id?: string
          quantite?: number
        }
      }
      photos: {
        Row: {
          id: string
          commande_id: string
          file_path: string
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          commande_id: string
          file_path: string
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          commande_id?: string
          file_path?: string
          uploaded_by?: string
          created_at?: string
        }
      }
      emails_sent: {
        Row: {
          id: string
          commande_id: string
          subject: string
          body: string
          sent_at: string
          sent_by: string
          relance: boolean
        }
        Insert: {
          id?: string
          commande_id: string
          subject: string
          body: string
          sent_at?: string
          sent_by: string
          relance?: boolean
        }
        Update: {
          id?: string
          commande_id?: string
          subject?: string
          body?: string
          sent_at?: string
          sent_by?: string
          relance?: boolean
        }
      }
    }
  }
}

// Helper types
export type UserRole = Database['public']['Tables']['users']['Row']['role']
export type CommandeStatut = Database['public']['Tables']['commandes']['Row']['statut']
export type User = Database['public']['Tables']['users']['Row']
export type Magasin = Database['public']['Tables']['magasins']['Row']
export type Produit = Database['public']['Tables']['produits']['Row']
export type Commande = Database['public']['Tables']['commandes']['Row']
export type Photo = Database['public']['Tables']['photos']['Row']
export type EmailSent = Database['public']['Tables']['emails_sent']['Row']
