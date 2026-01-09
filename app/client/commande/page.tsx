'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'
import { useCart, Magasin } from '@/lib/cart-context'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import { ProductCardWithCart } from '@/components/ui/ProductCardWithCart'
import { CartMatrix } from '@/components/ui/CartMatrix'
import { CartSummary } from '@/components/ui/CartSummary'
import type { User, Produit } from '@/types/database.types'

type ViewMode = 'magasins' | 'catalogue' | 'quantites' | 'recap'

export default function CommandePage() {
  const router = useRouter()
  const { showSuccess, showError } = useToast()

  // Local state
  const [user, setUser] = useState<User | null>(null)
  const [produits, setProduits] = useState<Produit[]>([])
  const [allMagasins, setAllMagasins] = useState<Magasin[]>([])
  const [modeles, setModeles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [drafts, setDrafts] = useState<any[]>([])
  const [loadingDrafts, setLoadingDrafts] = useState(false)

  // View state
  const [currentView, setCurrentView] = useState<ViewMode>('magasins')

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [modelSearchQuery, setModelSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 18

  // Cart context
  const {
    cart,
    selectedMagasins,
    setMagasins,
    getCartItemCount,
    getGrandTotal,
    clearCart,
    loadFromDraft
  } = useCart()

  // Categories
  const CATEGORIES = [
    { id: 'consommable', label: 'Consommable', icon: '📦', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { id: 'echantillon_lri', label: 'Éch. LRI', icon: '🏷️', color: 'bg-purple-100 text-purple-700 border-purple-300' },
    { id: 'echantillon_ampm', label: 'Éch. AM.PM', icon: '🌙', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
    { id: 'pentes', label: 'Pentes', icon: '📐', color: 'bg-orange-100 text-orange-700 border-orange-300' },
    { id: 'tissus', label: 'Tissus', icon: '🧵', color: 'bg-pink-100 text-pink-700 border-pink-300' },
  ]

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push('/login')
          return
        }

        const profile = await getUserProfile(currentUser.id) as any
        if (profile.role !== 'la_redoute') {
          router.push('/dashboard')
          return
        }

        setUser(profile)

        const { data: produitsData } = await supabase
          .from('produits')
          .select('*')
          .order('nom')

        const { data: magasinsData } = await supabase
          .from('magasins')
          .select('*')
          .order('nom')

        const { data: modelesData } = await supabase
          .from('modeles')
          .select('*')
          .order('nom')

        const activeProduits = (produitsData || []).filter((p: any) => p.actif !== false)
        setProduits(activeProduits)
        setAllMagasins(magasinsData || [])
        setModeles(modelesData || [])
        if (profile) fetchDrafts(profile.id)
      } catch (error) {
        console.error('Error loading data:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  async function fetchDrafts(userId: string) {
    setLoadingDrafts(true)
    try {
      const { data, error } = await supabase
        .from('commandes')
        .select(`
          id,
          created_at,
          commande_magasins(count),
          commande_produits(count)
        `)
        .eq('user_id', userId)
        .eq('statut', 'brouillon')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDrafts(data || [])
    } catch (error) {
      console.error('Error fetching drafts:', error)
    } finally {
      setLoadingDrafts(false)
    }
  }

  async function handleLoadDraft(draftId: string) {
    setLoading(true)
    try {
      // 1. Fetch magasins
      const { data: magasinsData, error: magasinsError } = await supabase
        .from('commande_magasins')
        .select('magasin:magasins(*)')
        .eq('commande_id', draftId)

      if (magasinsError) throw magasinsError

      // 2. Fetch products and quantities
      const { data: produitsData, error: produitsError } = await supabase
        .from('commande_produits')
        .select(`
          produit:produits(*),
          commande_magasin_produits(magasin_id, quantite)
        `)
        .eq('commande_id', draftId)

      if (produitsError) throw produitsError

      // 3. Format data for cart-context
      const magasins = magasinsData.map((m: any) => m.magasin)
      const cartItems = produitsData.map((p: any) => {
        const quantities: Record<string, number> = {}
        p.commande_magasin_produits.forEach((q: any) => {
          quantities[q.magasin_id] = q.quantite
        })
        return {
          produit: p.produit,
          quantities
        }
      })

      loadFromDraft(magasins, cartItems)
      setCurrentView('catalogue')
      showSuccess('Brouillon chargé !')
    } catch (error: any) {
      console.error('Error loading draft:', error)
      showError('Erreur lors du chargement: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, selectedModel, searchQuery])

  // Submit order (can be draft or actual order)
  async function handleSubmitOrder(status: 'en_attente' | 'brouillon' = 'en_attente') {
    if (selectedMagasins.length === 0) {
      showError('Veuillez sélectionner au moins un magasin')
      return
    }

    if (getCartItemCount() === 0) {
      showError('Veuillez ajouter au moins un produit au panier')
      return
    }

    if (status === 'en_attente' && getGrandTotal() === 0) {
      showError('Veuillez définir des quantités pour vos produits')
      return
    }

    if (status === 'en_attente') {
      setSubmitting(true)
    } else {
      setSavingDraft(true)
    }

    try {
      if (!user) throw new Error('User not found')

      // 1. Create commande
      const { data: commande, error: commandeError } = await (supabase
        .from('commandes')
        .insert({
          user_id: user.id,
          statut: status,
        } as any)
        .select()
        .single() as any)

      if (commandeError) throw commandeError

      // 2. Insert commande_magasins
      const { error: magasinsError } = await (supabase
        .from('commande_magasins')
        .insert(
          selectedMagasins.map(magasin => ({
            commande_id: commande.id,
            magasin_id: magasin.id,
          })) as any
        ) as any)

      if (magasinsError) throw magasinsError

      // 3. Insert commande_produits (with total quantities)
      const cartItems = Array.from(cart.values())
      const produitsInsert = cartItems.map(item => {
        const totalQty = selectedMagasins.reduce((sum, m) => sum + (item.quantities[m.id] || 0), 0)
        return {
          commande_id: commande.id,
          produit_id: item.produit.id,
          quantite: totalQty,
        }
      }).filter(p => p.quantite > 0)

      if (produitsInsert.length > 0) {
        const { error: produitsError } = await (supabase
          .from('commande_produits')
          .insert(produitsInsert as any) as any)

        if (produitsError) throw produitsError
      }

      // 4. Insert commande_magasin_produits (specific quantities per magasin)
      const magasinProduitsInsert: any[] = []
      cartItems.forEach(item => {
        selectedMagasins.forEach(magasin => {
          const qty = item.quantities[magasin.id] || 0
          if (qty > 0) {
            magasinProduitsInsert.push({
              commande_id: commande.id,
              magasin_id: magasin.id,
              produit_id: item.produit.id,
              quantite: qty,
            })
          }
        })
      })

      if (magasinProduitsInsert.length > 0) {
        const { error: magasinProduitsError } = await (supabase
          .from('commande_magasin_produits' as any)
          .insert(magasinProduitsInsert as any))

        if (magasinProduitsError) throw magasinProduitsError
      }

      showSuccess(status === 'brouillon' ? 'Brouillon enregistré !' : 'Commande créée avec succès !')
      clearCart()
      router.push('/client/historique')
    } catch (error: any) {
      console.error('Error creating order:', error)
      showError('Erreur : ' + error.message)
    } finally {
      setSubmitting(false)
      setSavingDraft(false)
    }
  }

  if (loading || !user) {
    return <PageLoader />
  }

  // Filtered products
  const filteredProduits = produits.filter(produit => {
    if (selectedCategory && (produit as any).categorie !== selectedCategory) return false
    if (selectedCategory === 'echantillon_lri' && selectedModel && (produit as any).modele_id !== selectedModel) return false
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return produit.nom.toLowerCase().includes(query) || produit.reference.toLowerCase().includes(query)
  })

  const totalPages = Math.ceil(filteredProduits.length / ITEMS_PER_PAGE)
  const paginatedProduits = filteredProduits.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  return (
    <DashboardLayout user={user} title="Nouvelle Commande">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-1 bg-stone-100 rounded-xl">
          <button
            onClick={() => setCurrentView('magasins')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm transition-all ${currentView === 'magasins'
              ? 'bg-white text-stone-900 shadow-md'
              : 'text-stone-500 hover:text-stone-700'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            1. Magasins
            {selectedMagasins.length > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-xs font-bold rounded-full">
                {selectedMagasins.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setCurrentView('catalogue')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm transition-all ${currentView === 'catalogue'
              ? 'bg-white text-stone-900 shadow-md'
              : 'text-stone-500 hover:text-stone-700'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            2. Produits
            {getCartItemCount() > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 bg-green-500 text-white text-xs font-bold rounded-full">
                {getCartItemCount()}
              </span>
            )}
          </button>
          <button
            onClick={() => setCurrentView('quantites')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm transition-all ${currentView === 'quantites'
              ? 'bg-white text-stone-900 shadow-md'
              : 'text-stone-500 hover:text-stone-700'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h.01M7 11h.01M7 15h.01M7 19h.01M7 23h.01M11 7h10M11 3h10M11 11h10M11 15h10M11 19h10M11 23h10" />
            </svg>
            3. Quantités
            {getCartItemCount() > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 bg-primary-500 text-white text-xs font-bold rounded-full">
                {getGrandTotal()}
              </span>
            )}
          </button>
          <button
            onClick={() => setCurrentView('recap')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm transition-all ${currentView === 'recap'
              ? 'bg-white text-stone-900 shadow-md'
              : 'text-stone-500 hover:text-stone-700'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            4. Récap
          </button>
        </div>

        {/* CATALOGUE VIEW */}
        {currentView === 'catalogue' && (
          <Card variant="elevated" className="animate-fadeIn">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Catalogue Produits</CardTitle>
                  <p className="text-sm text-stone-500 mt-1">{filteredProduits.length} produit(s)</p>
                </div>
                {getCartItemCount() > 0 && (
                  <button
                    onClick={() => setCurrentView('quantites')}
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    Suivant ({getCartItemCount()} produits)
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Magasins selection warning */}
              {selectedMagasins.length === 0 && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span><strong>Sélectionnez des magasins</strong> dans l'onglet Magasins avant d'ajouter des produits.</span>
                  </p>
                </div>
              )}

              {/* Category Navigation */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setSelectedCategory(null); setSelectedModel(null); }}
                    className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 border-2 ${selectedCategory === null
                      ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white border-transparent shadow-lg'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                      }`}
                  >
                    Tous
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat.id); setSelectedModel(null); }}
                      className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 border-2 ${selectedCategory === cat.id
                        ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white border-transparent shadow-lg'
                        : `${cat.color}`
                        }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        {cat.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Model filter for LRI */}
                {selectedCategory === 'echantillon_lri' && (
                  <div className="mt-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-stone-700">Filtrer par modèle</p>
                      <input
                        type="text"
                        placeholder="Chercher..."
                        value={modelSearchQuery}
                        onChange={(e) => setModelSearchQuery(e.target.value)}
                        className="w-40 px-3 py-1.5 text-sm border border-stone-200 rounded-lg focus:border-primary-500 outline-none"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      <button
                        onClick={() => setSelectedModel(null)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedModel === null
                          ? 'bg-stone-900 text-white'
                          : 'bg-white border border-stone-200 text-stone-600 hover:border-primary-300'
                          }`}
                      >
                        TOUS
                      </button>
                      {modeles
                        .filter(m => m.nom.toLowerCase().includes(modelSearchQuery.toLowerCase()))
                        .map(mod => (
                          <button
                            key={mod.id}
                            onClick={() => setSelectedModel(mod.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedModel === mod.id
                              ? 'bg-primary-500 text-white'
                              : 'bg-white border border-stone-200 text-stone-600 hover:border-primary-300'
                              }`}
                          >
                            {mod.nom}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Search bar */}
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Rechercher par référence ou nom..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 pl-12 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-primary-500 transition-all"
                  />
                  <svg className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {paginatedProduits.map((produit) => (
                  <ProductCardWithCart
                    key={produit.id}
                    produit={{
                      id: produit.id,
                      nom: produit.nom,
                      reference: produit.reference,
                      categorie: (produit as any).categorie || '',
                      image_url: produit.image_url || undefined,
                      modele: modeles.find(m => m.id === (produit as any).modele_id)?.nom,
                    }}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white border-2 border-stone-200 rounded-xl text-stone-600 hover:border-primary-400 disabled:opacity-30 font-bold"
                  >
                    Précédent
                  </button>
                  <span className="px-4 py-2 text-stone-500">
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white border-2 border-stone-200 rounded-xl text-stone-600 hover:border-primary-400 disabled:opacity-30 font-bold"
                  >
                    Suivant
                  </button>
                </div>
              )}

              {filteredProduits.length === 0 && (
                <div className="text-center py-16 text-stone-400">
                  <span className="text-4xl block mb-2">🔍</span>
                  Aucun produit trouvé
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* MAGASINS VIEW */}
        {currentView === 'magasins' && (
          <Card variant="elevated" className="animate-fadeIn">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Sélection des Magasins</CardTitle>
                  <p className="text-sm text-stone-500 mt-1">
                    {selectedMagasins.length} magasin(s) sélectionné(s)
                  </p>
                </div>
                {selectedMagasins.length > 0 && (
                  <button
                    onClick={() => setCurrentView('catalogue')}
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    Suivant : Catalogue Produits
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Drafts Section */}
              {drafts.length > 0 && (
                <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100">
                  <h3 className="text-blue-900 font-bold flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Reprendre un brouillon
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {drafts.map(draft => (
                      <button
                        key={draft.id}
                        onClick={() => handleLoadDraft(draft.id)}
                        className="bg-white p-4 rounded-xl border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all text-left group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-mono text-blue-500">#{draft.id.substring(0, 8)}</span>
                          <span className="text-[10px] text-stone-400">
                            {new Date(draft.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-stone-800 group-hover:text-blue-600 transition-colors">
                          {draft.commande_produits[0]?.count || 0} produits • {draft.commande_magasins[0]?.count || 0} magasins
                        </p>
                        <div className="mt-3 flex items-center text-xs text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                          Reprendre <ChevronRight className="w-3 h-3 ml-1" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <CartMatrix allMagasins={allMagasins} mode="selection" />
            </CardContent>
          </Card>
        )}

        {/* QUANTITES VIEW */}
        {currentView === 'quantites' && (
          <Card variant="elevated" className="animate-fadeIn">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Matrice des Quantités</CardTitle>
                  <p className="text-sm text-stone-500 mt-1">
                    Définissez les quantités par magasin pour chaque produit sélectionné
                  </p>
                </div>
                {getGrandTotal() > 0 && (
                  <button
                    onClick={() => setCurrentView('recap')}
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    Suivant : Récapitulatif
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CartMatrix allMagasins={allMagasins} mode="quantities" />
            </CardContent>
          </Card>
        )}

        {/* RECAP VIEW */}
        {currentView === 'recap' && (
          <Card variant="elevated" className="animate-fadeIn">
            <CardContent className="p-8">
              <CartSummary
                onValidate={() => handleSubmitOrder('en_attente')}
                onSaveDraft={() => handleSubmitOrder('brouillon')}
                onBack={() => setCurrentView('quantites')}
                isSubmitting={submitting}
                isSavingDraft={savingDraft}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
