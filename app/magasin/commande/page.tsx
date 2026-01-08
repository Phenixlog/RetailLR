'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Pagination } from '@/components/ui/Pagination'
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

export default function MagasinCommandePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserWithMagasin | null>(null)
  const [produits, setProduits] = useState<ProduitWithFilters[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
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

        setProduits(activeProduits || [])
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

  // Filtrage des produits
  const filteredProduits = produits.filter(produit => {
    // 1. Filtrage par catégorie
    if (selectedCategory && produit.categorie !== selectedCategory) return false

    // 2. Filtrage par modèle (si catégorie echantillon_lri)
    if (selectedCategory === 'echantillon_lri' && selectedModel && produit.modele_id !== selectedModel) return false

    // 3. Filtrage par recherche texte
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return produit.nom.toLowerCase().includes(query) ||
        produit.reference.toLowerCase().includes(query)
    }

    return true
  })

  // Groupement des modèles par recherche
  const filteredModeles = modeles.filter(m =>
    m.nom.toLowerCase().includes(modelSearchQuery.toLowerCase())
  )

  const totalPages = Math.ceil(filteredProduits.length / itemsPerPage)
  const paginatedProduits = filteredProduits.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  function updateQuantite(produit: ProduitWithFilters, quantite: number) {
    if (quantite === 0) {
      setCart(prev => prev.filter(item => item.produit.id !== produit.id))
    } else {
      setCart(prev => {
        const existing = prev.find(item => item.produit.id === produit.id)
        if (existing) {
          return prev.map(item =>
            item.produit.id === produit.id ? { ...item, quantite } : item
          )
        }
        return [...prev, { produit, quantite }]
      })
    }
  }

  function getQuantite(produitId: string): number {
    return cart.find(item => item.produit.id === produitId)?.quantite || 0
  }

  async function handleSubmit() {
    if (cart.length === 0) {
      alert('Veuillez ajouter au moins un produit au panier')
      return
    }

    if (!user?.magasin_id) {
      alert('Erreur: Magasin non trouvé')
      return
    }

    setSubmitting(true)

    try {
      const { data: commande, error: commandeError } = await (supabase
        .from('commandes') as any)
        .insert({
          user_id: user.id,
          statut: 'en_attente',
        })
        .select()
        .single()
      if (commandeError) throw commandeError

      const { error: magasinError } = await (supabase
        .from('commande_magasins') as any)
        .insert({
          commande_id: commande.id,
          magasin_id: user.magasin_id,
        })
      if (magasinError) throw magasinError

      const { error: produitsError } = await (supabase
        .from('commande_produits') as any)
        .insert(
          cart.map(item => ({
            commande_id: commande.id,
            produit_id: item.produit.id,
            quantite: item.quantite,
          }))
        )
      if (produitsError) throw produitsError

      alert('Commande créée avec succès !')
      setCart([])
      router.push('/magasin')
    } catch (error: any) {
      console.error('Error creating order:', error)
      alert('Erreur lors de la création de la commande: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !user) {
    return <PageLoader />
  }

  return (
    <DashboardLayout user={user as any} title="Nouvelle Commande">
      <div className="space-y-6">
        {/* Catalogue produits */}
        <Card variant="elevated" className="animate-slideUp">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-700 flex items-center justify-center text-white font-bold text-lg">
                1
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">Sélectionnez les produits</CardTitle>
                <p className="text-sm text-stone-500 mt-1">{cart.length} produit(s) dans le panier</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Category Navigation */}
            <div className="flex flex-wrap gap-2 pb-2">
              <button
                onClick={() => {
                  setSelectedCategory(null)
                  setSelectedModel(null)
                  setCurrentPage(1)
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${!selectedCategory
                  ? 'bg-stone-900 text-white border-stone-900 shadow-lg'
                  : 'bg-white text-stone-600 border-stone-100 hover:border-stone-300'
                  }`}
              >
                <span>🏢</span>
                Tous les produits
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id)
                    setSelectedModel(null)
                    setCurrentPage(1)
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${selectedCategory === cat.id
                    ? `${cat.color.split(' ')[1]} ${cat.color.split(' ')[0]} ${cat.color.split(' ')[2]} shadow-md`
                    : 'bg-white text-stone-600 border-stone-100 hover:border-stone-300'
                    }`}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Model Filter (Only for Échantillons LRI) */}
            {selectedCategory === 'echantillon_lri' && (
              <div className="animate-fadeIn p-6 bg-purple-50 rounded-2xl border border-purple-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-base font-bold text-purple-900 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-[10px]">FIX</span>
                      Filtrer par Modèle
                    </h3>
                  </div>
                  {selectedModel && (
                    <button
                      onClick={() => setSelectedModel(null)}
                      className="px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-2"
                    >
                      Effacer le filtre modèle
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {filteredModeles.map(m => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedModel(selectedModel === m.id ? null : m.id)
                        setCurrentPage(1)
                      }}
                      className={`group relative p-3 rounded-xl border-2 transition-all duration-300 text-left ${selectedModel === m.id
                        ? 'bg-purple-600 border-purple-600 shadow-lg shadow-purple-600/20'
                        : 'bg-white border-stone-100 hover:border-purple-300 hover:bg-purple-50'
                        }`}
                    >
                      <p className={`font-bold truncate text-sm ${selectedModel === m.id ? 'text-white' : 'text-stone-900 group-hover:text-purple-700'}`}>{m.nom}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher par référence ou nom..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-3 pl-12 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-stone-900 transition-all shadow-sm"
              />
              <svg className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Grid display */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedProduits.length > 0 ? (
                paginatedProduits.map((produit) => (
                  <div
                    key={produit.id}
                    className="group border-2 border-stone-200 rounded-xl overflow-hidden hover:border-stone-900 transition-all duration-200"
                  >
                    <div className="relative overflow-hidden bg-stone-100 aspect-[4/3]">
                      <img
                        src={produit.image_url || 'https://via.placeholder.com/400x300'}
                        alt={produit.nom}
                        className="w-full h-full object-cover"
                      />
                      {getQuantite(produit.id) > 0 && (
                        <div className="absolute top-3 right-3">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-stone-900 text-white rounded-full font-bold shadow-lg">
                            {getQuantite(produit.id)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="mb-4">
                        <h3 className="font-bold text-stone-900 text-sm line-clamp-1">{produit.nom}</h3>
                        <p className="text-xs text-stone-500 font-mono">{produit.reference}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantite(produit, Math.max(0, getQuantite(produit.id) - 1))}
                          className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center font-bold text-stone-700"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={getQuantite(produit.id)}
                          onChange={(e) => updateQuantite(produit, parseInt(e.target.value) || 0)}
                          className="flex-1 h-8 text-center border-2 border-stone-100 rounded-lg px-2 font-bold text-stone-900 focus:outline-none focus:border-stone-900"
                        />
                        <button
                          onClick={() => updateQuantite(produit, getQuantite(produit.id) + 1)}
                          className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center bg-stone-50 rounded-2xl">
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

        {/* Récapitulatif & Validation */}
        {cart.length > 0 && (
          <Card variant="elevated" className="animate-slideUp">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-stone-700 flex items-center justify-center text-white font-bold text-lg">
                  2
                </div>
                <CardTitle className="text-xl">Valider la commande</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-6">
                {cart.map(item => (
                  <div key={item.produit.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                    <div className="min-w-0">
                      <p className="font-bold text-stone-900 text-sm truncate">{item.produit.nom}</p>
                      <p className="text-xs text-stone-500">{item.produit.reference}</p>
                    </div>
                    <span className="font-black text-stone-900 bg-white px-3 py-1 rounded-lg border border-stone-200">
                      x{item.quantite}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full px-6 py-4 bg-stone-900 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-stone-800 transition-all disabled:opacity-50"
              >
                {submitting ? 'Envoi en cours...' : 'Confirmer la commande'}
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
