'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CategorySidebar } from '@/components/ui/CategorySidebar'
import { CompactProductCard } from '@/components/ui/CompactProductCard'
import { Pagination } from '@/components/ui/Pagination'
import {
  Plus,
  Search,
  History as HistoryIcon,
  LayoutGrid,
  CheckCircle2,
  Package,
  TrendingUp,
  Clock,
  AlertCircle,
  X
} from 'lucide-react'
import type { User, Produit } from '@/types/database.types'

interface ProduitWithFilters extends Produit {
  categorie?: string
  modele_id?: string
  actif?: boolean
}

interface UserWithMagasin extends User {
  magasins?: any
}

interface CartItem {
  produit: ProduitWithFilters
  quantite: number
}

const CATEGORIES = [
  { id: 'consommable', label: 'Consommable', icon: '📦', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'echantillon_lri', label: 'Échantillon LRI', icon: '🏷️', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { id: 'echantillon_ampm', label: 'Échantillon AM.PM', icon: '🌙', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { id: 'pentes', label: 'Pentes', icon: '📐', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { id: 'tissus', label: 'Tissus', icon: '🧵', color: 'bg-pink-100 text-pink-700 border-pink-300' },
]

function HistoriqueCommandes({ userId, magasinId }: { userId: string; magasinId: string }) {
  const [commandes, setCommandes] = useState<any[]>([])
  const [selectedCommande, setSelectedCommande] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCommandes() {
      try {
        const { data, error } = await (supabase as any)
          .from('commande_magasins')
          .select(`
            commande_id,
            commandes (
              id,
              statut,
              created_at,
              commande_magasins (
                magasins (nom, code, ville)
              ),
              commande_produits (
                quantite,
                produits (nom, reference)
              )
            )
          `)
          .eq('magasin_id', magasinId)
          .order('created_at', { ascending: false })

        if (error) throw error

        const commandesData = data?.map((cm: any) => cm.commandes).filter(Boolean) || []
        setCommandes(commandesData as any)
      } catch (error) {
        console.error('Error fetching commandes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCommandes()
  }, [userId, magasinId])

  function getStatusBadge(statut: string) {
    const statusConfig: Record<string, string> = {
      en_attente: 'En attente',
      confirmee: 'Confirmée',
      en_preparation: 'En préparation',
      envoyee: 'Envoyée',
    }

    const label = statusConfig[statut] || statut

    return (
      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-md">
        {label}
      </span>
    )
  }

  if (loading) {
    return (
      <Card variant="elevated" className="animate-fadeIn">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Historique des commandes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary-100 to-accent-100 mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary-500 border-t-transparent"></div>
            </div>
            <p className="text-stone-600 font-medium">Chargement de vos commandes...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (selectedCommande) {
    return (
      <Card variant="elevated" className="animate-slideUp">
        <CardHeader>
          <button
            onClick={() => setSelectedCommande(null)}
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-all duration-200 mb-4"
          >
            <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour à la liste
          </button>

          <CardTitle className="text-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            Détail de la commande
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Infos générales */}
          <div className="relative p-6 rounded-2xl bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-200/30 to-accent-200/30 rounded-full blur-3xl"></div>
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">ID Commande</p>
                <p className="font-mono text-sm font-semibold text-stone-900 bg-white px-3 py-2 rounded-lg inline-block">
                  {selectedCommande.id.slice(0, 8)}...
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Date de création</p>
                <p className="font-medium text-stone-900">
                  {new Date(selectedCommande.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="md:col-span-2 space-y-2">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Statut actuel</p>
                {getStatusBadge(selectedCommande.statut)}
              </div>
            </div>
          </div>

          {/* Magasins */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-stone-100 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              Magasins concernés
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedCommande.commande_magasins?.map((cm: any, idx: number) => (
                <div key={idx} className="group p-4 rounded-xl bg-stone-50 border border-stone-200 hover:border-primary-300 hover:shadow-md transition-all duration-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700 font-bold text-sm flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-900 truncate">{cm.magasins.nom}</p>
                      <p className="text-sm text-stone-600">
                        <span className="font-mono font-medium">{cm.magasins.code}</span> • {cm.magasins.ville}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Produits */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-stone-100 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              Produits commandés
            </h3>
            <div className="overflow-hidden rounded-xl border border-stone-200">
              <table className="min-w-full divide-y divide-stone-200">
                <thead>
                  <tr className="bg-gradient-to-r from-stone-50 to-stone-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">
                      Produit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">
                      Référence
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-stone-700 uppercase tracking-wider">
                      Quantité
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-100">
                  {selectedCommande.commande_produits?.map((cp: any, idx: number) => (
                    <tr key={idx} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-xs font-bold">
                            {cp.produits.nom.charAt(0)}
                          </div>
                          <span className="font-medium text-stone-900">{cp.produits.nom}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-stone-600 bg-stone-100 px-2 py-1 rounded">
                          {cp.produits.reference}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-3 py-1 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-bold shadow-sm">
                          {cp.quantite}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="elevated" className="animate-fadeIn">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          Historique des commandes
        </CardTitle>
        {commandes.length > 0 && (
          <p className="text-sm text-stone-500 ml-13 mt-1">
            {commandes.length} commande{commandes.length > 1 ? 's' : ''} trouvée{commandes.length > 1 ? 's' : ''}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {commandes.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-stone-100 mb-4">
              <svg className="w-10 h-10 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-stone-900 mb-2">Aucune commande</h3>
            <p className="text-stone-500 mb-6">Vous n'avez pas encore passé de commande</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {commandes.map((commande) => (
              <div
                key={commande.id}
                onClick={() => setSelectedCommande(commande)}
                className="group relative p-5 rounded-2xl border-2 border-stone-200 hover:border-primary-400 bg-white hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300 cursor-pointer overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-100/50 to-accent-100/50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Commande</p>
                      <p className="font-mono text-sm font-semibold text-stone-900 bg-stone-100 px-2 py-1 rounded group-hover:bg-gradient-to-r group-hover:from-primary-100 group-hover:to-accent-100 transition-colors">
                        {commande.id.slice(0, 8)}...
                      </p>
                    </div>
                    {getStatusBadge(commande.statut)}
                  </div>

                  <div className="space-y-3 text-sm mb-4">
                    <div className="flex items-center justify-between py-2 border-b border-stone-100">
                      <span className="text-stone-600 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Date
                      </span>
                      <span className="font-semibold text-stone-900">
                        {new Date(commande.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-stone-100">
                      <span className="text-stone-600 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Magasins
                      </span>
                      <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-stone-700 text-white text-xs font-bold">
                        {commande.commande_magasins?.length || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-stone-600 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Produits
                      </span>
                      <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-stone-700 text-white text-xs font-bold">
                        {commande.commande_produits?.length || 0}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-stone-200">
                    <span className="text-xs font-semibold text-primary-600 group-hover:text-primary-700 flex items-center gap-1">
                      Voir le détail
                      <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function MagasinPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserWithMagasin | null>(null)
  const [produits, setProduits] = useState<ProduitWithFilters[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [view, setView] = useState<'order' | 'history'>('order')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [modeles, setModeles] = useState<any[]>([])
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [modelSearchQuery, setModelSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push('/login')
          return
        }

        const profile = (await getUserProfile(currentUser.id)) as any

        if (profile.role !== 'magasin') {
          router.push('/dashboard')
          return
        }

        setUser(profile)

        // Charger les produits et les modèles
        const [produitsRes, modelesRes] = await Promise.all([
          supabase.from('produits').select('*').order('nom'),
          supabase.from('modeles').select('*').order('nom')
        ])

        // Filtrer les produits pour ne garder que ceux qui sont actifs
        const activeProduits = (produitsRes.data || []).map((p: any) => ({
          ...p,
          actif: p.actif !== false
        })).filter((p: any) => p.actif)

        setProduits(activeProduits)
        setModeles(modelesRes.data || [])
      } catch (error) {
        console.error('Error loading data:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const filteredProduits = produits.filter(p => {
    const matchesCategory = !selectedCategory || p.categorie === selectedCategory
    const matchesModel = !selectedCategory || selectedCategory !== 'echantillon_lri' || !selectedModel || p.modele_id === selectedModel
    const matchesSearch = !searchQuery ||
      p.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.reference.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesModel && matchesSearch
  })

  const totalPages = Math.ceil(filteredProduits.length / itemsPerPage)
  const paginatedProduits = filteredProduits.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const filteredModeles = modeles.filter(m =>
    m.nom.toLowerCase().includes(modelSearchQuery.toLowerCase())
  )

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div>
      </div>
    )
  }

  return (
    <DashboardLayout user={user as any} title="Magasin">
      <div className="space-y-8">
        {/* Navigation Rapide */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-2 p-1 bg-stone-100 rounded-xl">
            <button
              onClick={() => setView('order')}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                view === 'order' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Catalogue
            </button>
            <button
              onClick={() => setView('history')}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                view === 'history' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
              )}
            >
              <HistoryIcon className="w-4 h-4" />
              Historique
            </button>
          </div>

          <Button
            onClick={() => router.push('/magasin/commande')}
            className="w-full md:w-auto bg-stone-900 text-white rounded-xl py-6 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouvelle Commande
          </Button>
        </div>

        {view === 'order' ? (
          <div className="space-y-6">
            <Card>
              <CardHeader className="border-b border-stone-100 bg-stone-50/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-stone-500" />
                    Catalogue Produits
                  </CardTitle>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Référence ou nom..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Sélecteur de catégorie (Ancien style) */}
                <div className="flex flex-wrap gap-2 mb-8">
                  <button
                    onClick={() => {
                      setSelectedCategory(null)
                      setSelectedModel(null)
                      setCurrentPage(1)
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all",
                      !selectedCategory
                        ? "bg-stone-900 text-white border-stone-900"
                        : "bg-white text-stone-600 border-stone-100 hover:border-stone-200"
                    )}
                  >
                    🚀 Tous les produits
                  </button>
                  {CATEGORIES.map((cat: any) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id)
                        setSelectedModel(null)
                        setCurrentPage(1)
                      }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all",
                        selectedCategory === cat.id
                          ? cat.color
                          : "bg-white text-stone-600 border-stone-100 hover:border-stone-200"
                      )}
                    >
                      <span>{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Modèles (Si LRI) */}
                {selectedCategory === 'echantillon_lri' && (
                  <div className="mb-8 p-6 bg-purple-50 rounded-2xl border border-purple-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-purple-900 uppercase tracking-widest">Filtrer par Modèle</h3>
                      {selectedModel && (
                        <button onClick={() => setSelectedModel(null)} className="text-xs font-bold text-purple-500 hover:underline">Effacer</button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {modeles.map(m => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedModel(selectedModel === m.id ? null : m.id)
                            setCurrentPage(1)
                          }}
                          className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all border",
                            selectedModel === m.id
                              ? "bg-purple-600 text-white border-purple-600"
                              : "bg-white text-purple-600 border-purple-200 hover:bg-purple-100"
                          )}
                        >
                          {m.nom}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {paginatedProduits.map((produit) => (
                    <div
                      key={produit.id}
                      className="group flex flex-col bg-white border border-stone-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all"
                    >
                      <div className="aspect-[4/3] bg-stone-100 relative">
                        <img
                          src={produit.image_url || 'https://via.placeholder.com/400x300'}
                          alt={produit.nom}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-3 left-3">
                          <span className="px-2 py-1 bg-white/90 backdrop-blur rounded-lg text-[10px] font-black uppercase tracking-widest text-stone-600 shadow-sm border border-stone-100">
                            {produit.categorie?.replace('_', ' ') || 'Produit'}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <h4 className="font-bold text-stone-900 text-sm line-clamp-1">{produit.nom}</h4>
                        <p className="text-xs font-mono text-stone-500 mt-1">{produit.reference}</p>
                      </div>
                    </div>
                  ))}
                  {paginatedProduits.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
                      <p className="text-stone-400 font-bold">Aucun produit trouvé</p>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <HistoriqueCommandes userId={user.id} magasinId={user.magasin_id || ''} />
        )}
      </div>
    </DashboardLayout>
  )
}
