'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import type { User, Produit, Magasin } from '@/types/database.types'

interface CartItem {
  produit: Produit
  quantite: number
}

export default function CommandePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [produits, setProduits] = useState<Produit[]>([])
  const [magasins, setMagasins] = useState<Magasin[]>([])
  const [selectedMagasins, setSelectedMagasins] = useState<string[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [modeles, setModeles] = useState<any[]>([])
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [modelSearchQuery, setModelSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 18

  // Catégories fixes pour la navigation
  const CATEGORIES = [
    { id: 'consommable', label: 'Consommable', icon: '📦', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { id: 'echantillon_lri', label: 'Échantillon LRI', icon: '🏷️', color: 'bg-purple-100 text-purple-700 border-purple-300' },
    { id: 'echantillon_ampm', label: 'Échantillon AM.PM', icon: '🌙', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
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

        // Filtrer les produits pour ne garder que ceux qui sont actifs
        const activeProduits = (produitsData || []).filter((p: any) => p.actif !== false)

        setProduits(activeProduits || [])
        setMagasins(magasinsData || [])
        setModeles(modelesData || [])
      } catch (error) {
        console.error('Error loading data:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  function toggleMagasin(magasinId: string) {
    setSelectedMagasins(prev =>
      prev.includes(magasinId)
        ? prev.filter(id => id !== magasinId)
        : [...prev, magasinId]
    )
  }

  function toggleAllMagasins() {
    if (selectedMagasins.length === magasins.length) {
      setSelectedMagasins([])
    } else {
      setSelectedMagasins(magasins.map(m => m.id))
    }
  }

  function updateQuantite(produit: Produit, quantite: number) {
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
    if (selectedMagasins.length === 0) {
      alert('Veuillez sélectionner au moins un magasin')
      return
    }

    if (cart.length === 0) {
      alert('Veuillez ajouter au moins un produit au panier')
      return
    }

    setSubmitting(true)

    try {
      if (!user) throw new Error('User not found')

      const { data: commande, error: commandeError } = await (supabase
        .from('commandes')
        .insert({
          user_id: user.id,
          statut: 'en_attente',
        } as any)
        .select()
        .single() as any)

      if (commandeError) throw commandeError

      const { error: magasinsError } = await (supabase
        .from('commande_magasins')
        .insert(
          selectedMagasins.map(magasin_id => ({
            commande_id: commande.id,
            magasin_id,
          })) as any
        ) as any)

      if (magasinsError) throw magasinsError

      const { error: produitsError } = await (supabase
        .from('commande_produits')
        .insert(
          cart.map(item => ({
            commande_id: commande.id,
            produit_id: item.produit.id,
            quantite: item.quantite,
          })) as any
        ) as any)

      if (produitsError) throw produitsError

      alert('Commande créée avec succès !')
      setSelectedMagasins([])
      setCart([])
      router.push('/client/historique')
    } catch (error: any) {
      console.error('Error creating order:', error)
      alert('Erreur lors de la création de la commande: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, selectedModel, searchQuery])

  if (loading || !user) {
    return <PageLoader />
  }

  return (
    <DashboardLayout user={user} title="Nouvelle Commande">
      <div className="space-y-6">
        {/* Sélection Magasins Premium */}
        <Card variant="elevated" className="animate-slideUp">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-700 flex items-center justify-center text-white font-bold text-lg">
                1
              </div>
              <div>
                <CardTitle className="text-xl">Sélectionnez les magasins</CardTitle>
                <p className="text-sm text-stone-500 mt-1">{selectedMagasins.length} magasin(s) sélectionné(s)</p>
              </div>
              <div className="ml-auto">
                <button
                  onClick={toggleAllMagasins}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 ${selectedMagasins.length === magasins.length
                    ? 'bg-stone-900 border-stone-900 text-white shadow-md'
                    : 'bg-white border-stone-200 text-stone-600 hover:border-primary-500 hover:text-primary-600'
                    }`}
                >
                  {selectedMagasins.length === magasins.length ? 'Désélectionner tout' : 'Tout sélectionner'}
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {magasins.map(magasin => (
                <label
                  key={magasin.id}
                  className={`group relative p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 ${selectedMagasins.includes(magasin.id)
                    ? 'border-primary-500 bg-gradient-to-r from-primary-50 to-accent-50'
                    : 'border-stone-200 hover:border-primary-300 hover:bg-stone-50'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedMagasins.includes(magasin.id)}
                    onChange={() => toggleMagasin(magasin.id)}
                    className="hidden"
                  />
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedMagasins.includes(magasin.id)
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-stone-300 group-hover:border-primary-300'
                      }`}>
                      {selectedMagasins.includes(magasin.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-stone-900">{magasin.nom}</p>
                      <p className="text-sm text-stone-600 mt-1">{magasin.ville}</p>
                      <p className="text-xs text-stone-500 mt-0.5 font-mono">{magasin.code}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Catalogue Produits Premium */}
        <Card variant="elevated" className="animate-slideUp" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-700 flex items-center justify-center text-white font-bold text-lg">
                2
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">Sélectionnez les produits</CardTitle>
                <p className="text-sm text-stone-500 mt-1">{cart.length} produit(s) dans le panier</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Category Navigation */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-stone-600 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Naviguer par catégorie
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 border-2 ${selectedCategory === null
                    ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white border-transparent shadow-lg shadow-primary-500/30'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <span>🏠</span>
                    Tous
                  </span>
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 border-2 ${selectedCategory === cat.id
                      ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white border-transparent shadow-lg shadow-primary-500/30'
                      : `${cat.color} hover:shadow-md`
                      }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Entonnoir de navigation : Modèles pour LRI */}
              {selectedCategory === 'echantillon_lri' && (
                <div className="mt-6 p-6 bg-stone-50 rounded-2xl border border-stone-200 animate-fadeIn shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <p className="text-sm font-bold text-stone-900 flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs">2</span>
                        Choisir un modèle de canapé
                      </p>
                      <p className="text-xs text-stone-500 mt-1 ml-8">Sélectionnez un modèle pour voir les tissus disponibles</p>
                    </div>

                    <div className="relative w-full md:w-64">
                      <input
                        type="text"
                        placeholder="Chercher un modèle..."
                        value={modelSearchQuery}
                        onChange={(e) => setModelSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                      />
                      <svg className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar p-1">
                    <button
                      onClick={() => setSelectedModel(null)}
                      className={`group relative px-3 py-3 rounded-xl text-xs font-bold transition-all border-2 flex flex-col items-center justify-center gap-1 h-20 ${selectedModel === null
                        ? 'bg-stone-900 border-stone-900 text-white shadow-md'
                        : 'bg-white border-stone-100 text-stone-600 hover:border-primary-300 hover:text-primary-600 hover:shadow-sm'
                        }`}
                    >
                      <span className="text-lg">🛋️</span>
                      <span>TOUS</span>
                    </button>

                    {modeles
                      .filter(m => m.nom.toLowerCase().includes(modelSearchQuery.toLowerCase()))
                      .map((mod) => (
                        <button
                          key={mod.id}
                          onClick={() => setSelectedModel(mod.id)}
                          className={`group relative px-3 py-3 rounded-xl text-[10px] font-bold uppercase tracking-tight transition-all border-2 flex flex-col items-center justify-center gap-1 h-20 ${selectedModel === mod.id
                            ? 'bg-gradient-to-br from-primary-600 to-accent-600 border-transparent text-white shadow-md ring-2 ring-primary-500/20'
                            : 'bg-white border-stone-100 text-stone-500 hover:border-primary-300 hover:text-primary-700 hover:shadow-sm'
                            }`}
                        >
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1">
                            <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24"><path d="M21 7L9 19L3.5 13.5L4.91 12.09L9 16.17L19.59 5.59L21 7Z" /></svg>
                          </span>
                          <span>{mod.nom}</span>
                        </button>
                      ))}
                  </div>

                  {modelSearchQuery && modeles.filter(m => m.nom.toLowerCase().includes(modelSearchQuery.toLowerCase())).length === 0 && (
                    <div className="text-center py-8 text-stone-400 text-sm">
                      Aucun modèle ne correspond à "{modelSearchQuery}"
                    </div>
                  )}
                </div>
              )}

              {selectedCategory && (
                <div className="mt-3 flex items-center gap-2 text-sm text-stone-600">
                  <span>Filtrage actif :</span>
                  <span className="font-semibold text-primary-600">
                    {CATEGORIES.find(c => c.id === selectedCategory)?.label}
                  </span>
                  {selectedModel && (
                    <>
                      <span className="text-stone-400 mx-1">/</span>
                      <span className="font-semibold text-accent-600">
                        {modeles.find(m => m.id === selectedModel)?.nom}
                      </span>
                    </>
                  )}
                  <button
                    onClick={() => { setSelectedCategory(null); setSelectedModel(null); }}
                    className="ml-2 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
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
                  className="w-full px-4 py-3 pl-12 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
                <svg className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(() => {
                const filteredProduits = produits.filter(produit => {
                  // Filtre par catégorie
                  if (selectedCategory && (produit as any).categorie !== selectedCategory) {
                    return false
                  }
                  // Filtre par modèle (entonnoir LRI)
                  if (selectedCategory === 'echantillon_lri' && selectedModel && (produit as any).modele_id !== selectedModel) {
                    return false
                  }
                  // Filtre par recherche
                  if (!searchQuery) return true
                  const query = searchQuery.toLowerCase()
                  return produit.nom.toLowerCase().includes(query) ||
                    produit.reference.toLowerCase().includes(query)
                });

                const totalPages = Math.ceil(filteredProduits.length / ITEMS_PER_PAGE);
                const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                const paginatedProduits = filteredProduits.slice(startIndex, startIndex + ITEMS_PER_PAGE);

                return (
                  <>
                    {paginatedProduits.map((produit, idx) => (
                      <div
                        key={produit.id}
                        className="group border-2 border-stone-200 rounded-xl overflow-hidden hover:border-primary-300 hover:shadow-lg transition-all duration-200 animate-fadeIn"
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <div className="relative overflow-hidden bg-stone-100">
                          <img
                            src={produit.image_url || 'https://via.placeholder.com/400x300'}
                            alt={produit.nom}
                            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {getQuantite(produit.id) > 0 && (
                            <div className="absolute top-3 right-3">
                              <span className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 text-white rounded-full font-bold shadow-lg">
                                {getQuantite(produit.id)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <h3 className="font-bold text-stone-900 mb-1">{produit.nom}</h3>
                          <p className="text-sm text-stone-600 font-mono mb-2">{produit.reference}</p>
                          {produit.description && (
                            <p className="text-sm text-stone-600 mb-4 line-clamp-2">{produit.description}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantite(produit, Math.max(0, getQuantite(produit.id) - 1))}
                              className="w-10 h-10 rounded-lg bg-stone-200 hover:bg-stone-300 flex items-center justify-center font-bold text-stone-700 transition-colors"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={getQuantite(produit.id)}
                              onChange={(e) => updateQuantite(produit, parseInt(e.target.value) || 0)}
                              className="flex-1 h-10 text-center border-2 border-stone-200 rounded-lg px-3 font-bold text-stone-900 focus:outline-none focus:border-primary-500"
                            />
                            <button
                              onClick={() => updateQuantite(produit, getQuantite(produit.id) + 1)}
                              className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 hover:shadow-lg text-white flex items-center justify-center font-bold transition-all"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="col-span-full mt-10 flex items-center justify-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 bg-white border-2 border-stone-200 rounded-xl text-stone-600 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 transition-all font-bold"
                        >
                          Précédent
                        </button>

                        <div className="flex items-center gap-1">
                          {[...Array(totalPages)].map((_, i) => {
                            const pageNum = i + 1;
                            // Show only a few pages around current page
                            if (
                              pageNum === 1 ||
                              pageNum === totalPages ||
                              (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                            ) {
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={`w-10 h-10 rounded-xl font-bold transition-all ${currentPage === pageNum
                                    ? 'bg-primary-500 text-white shadow-lg'
                                    : 'bg-white border-2 border-stone-100 text-stone-500 hover:border-stone-300'
                                    }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            }
                            if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                              return <span key={pageNum} className="px-1 text-stone-400">...</span>;
                            }
                            return null;
                          })}
                        </div>

                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 bg-white border-2 border-stone-200 rounded-xl text-stone-600 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 transition-all font-bold"
                        >
                          Suivant
                        </button>
                      </div>
                    )}

                    {filteredProduits.length === 0 && (
                      <div className="col-span-full text-center py-20 text-stone-400">
                        <span className="text-4xl block mb-2">🔍</span>
                        Aucun produit trouvé
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Récapitulatif & Validation Premium */}
        <Card variant="elevated" className="animate-slideUp" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-700 flex items-center justify-center text-white font-bold text-lg">
                3
              </div>
              <CardTitle className="text-xl">Récapitulatif et validation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-stone-100 to-stone-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-stone-900 mb-1">Votre panier est vide</p>
                <p className="text-sm text-stone-500">Ajoutez des produits pour continuer</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {cart.map(item => (
                    <div key={item.produit.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-bold">
                          {item.produit.nom.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-stone-900">{item.produit.nom}</p>
                          <p className="text-sm text-stone-600">{item.produit.reference}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 text-white rounded-xl font-bold text-lg">
                        {item.quantite}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || selectedMagasins.length === 0}
                  className="w-full px-6 py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Valider la commande
                    </>
                  )}
                </button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
