'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { User, Produit } from '@/types/database.types'

interface CartItem {
  produit: Produit
  quantite: number
}

function HistoriqueCommandes({ userId, magasinId }: { userId: string; magasinId: string }) {
  const [commandes, setCommandes] = useState<any[]>([])
  const [selectedCommande, setSelectedCommande] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCommandes() {
      try {
        const { data, error } = await supabase
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

        const commandesData = data?.map(cm => cm.commandes).filter(Boolean) || []
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
      en_preparation: 'En préparation',
      confirmee: 'Confirmée',
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
  const [user, setUser] = useState<User | null>(null)
  const [produits, setProduits] = useState<Produit[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [view, setView] = useState<'order' | 'history'>('order')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push('/login')
          return
        }

        const profile = await getUserProfile(currentUser.id)

        if (profile.role !== 'magasin') {
          router.push('/dashboard')
          return
        }

        setUser(profile)

        const { data: produitsData } = await supabase
          .from('produits')
          .select('*')
          .order('nom')

        setProduits(produitsData || [])
      } catch (error) {
        console.error('Error loading data:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

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
      const { data: commande, error: commandeError } = await supabase
        .from('commandes')
        .insert({
          user_id: user.id,
          statut: 'en_attente',
        })
        .select()
        .single()

      if (commandeError) throw commandeError

      const { error: magasinError } = await supabase
        .from('commande_magasins')
        .insert({
          commande_id: commande.id,
          magasin_id: user.magasin_id,
        })

      if (magasinError) throw magasinError

      const { error: produitsError } = await supabase
        .from('commande_produits')
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
      setView('history')
    } catch (error: any) {
      console.error('Error creating order:', error)
      alert('Erreur lors de la création de la commande: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 mb-6 shadow-xl shadow-primary-500/20 animate-float">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-white border-t-transparent"></div>
          </div>
          <p className="text-stone-600 font-medium text-lg">Chargement de votre espace...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout user={user} title={`Magasin ${user.magasins?.nom || ''}`}>
      <div className="space-y-6 animate-fadeIn">
        {/* Navigation Premium */}
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <button
                onClick={() => setView('order')}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                  view === 'order'
                    ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Nouvelle commande
              </button>
              <button
                onClick={() => setView('history')}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                  view === 'history'
                    ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Historique
              </button>
            </div>
          </CardContent>
        </Card>

        {view === 'order' ? (
          <>
            {/* Info magasin Premium */}
            {user.magasins && (
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 overflow-hidden animate-slideUp">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-300/30 to-indigo-300/30 rounded-full blur-3xl"></div>
                <div className="relative flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Commande pour</p>
                    <p className="text-lg font-bold text-blue-900">
                      {user.magasins.nom}
                    </p>
                    <p className="text-sm text-blue-700">
                      {user.magasins.ville} • <span className="font-mono font-semibold">{user.magasins.code}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Catalogue produits Premium */}
            <Card variant="elevated" className="animate-slideUp" style={{ animationDelay: '100ms' }}>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  Catalogue produits
                </CardTitle>
                <p className="text-sm text-stone-500 ml-13 mt-1">{produits.length} produits disponibles</p>
              </CardHeader>
              <CardContent>
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
                  {produits
                    .filter(produit => {
                      if (!searchQuery) return true
                      const query = searchQuery.toLowerCase()
                      return produit.nom.toLowerCase().includes(query) ||
                             produit.reference.toLowerCase().includes(query)
                    })
                    .map(produit => {
                    const quantite = getQuantite(produit.id)
                    const isInCart = quantite > 0

                    return (
                      <div
                        key={produit.id}
                        className={`group relative rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
                          isInCart
                            ? 'border-primary-400 shadow-lg shadow-primary-500/20'
                            : 'border-stone-200 hover:border-primary-300 hover:shadow-md'
                        }`}
                      >
                        <div className="relative h-56 overflow-hidden bg-stone-100">
                          <img
                            src={produit.image_url || 'https://via.placeholder.com/300'}
                            alt={produit.nom}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          {isInCart && (
                            <div className="absolute top-3 right-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold shadow-lg animate-scaleIn">
                                {quantite}
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>

                        <div className="p-5 space-y-3">
                          <div>
                            <h3 className="font-semibold text-stone-900 text-lg mb-1">{produit.nom}</h3>
                            <p className="text-xs font-mono text-stone-500 bg-stone-100 px-2 py-1 rounded inline-block">
                              {produit.reference}
                            </p>
                          </div>

                          {produit.description && (
                            <p className="text-sm text-stone-600 line-clamp-2">{produit.description}</p>
                          )}

                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={() => updateQuantite(produit, Math.max(0, quantite - 1))}
                              disabled={quantite === 0}
                              className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-gradient-to-br hover:from-red-400 hover:to-red-500 hover:text-white text-stone-700 font-bold disabled:opacity-30 disabled:hover:bg-stone-100 disabled:hover:text-stone-700 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                              </svg>
                            </button>

                            <input
                              type="number"
                              min="0"
                              value={quantite}
                              onChange={(e) => updateQuantite(produit, parseInt(e.target.value) || 0)}
                              className="flex-1 text-center border-2 border-stone-200 focus:border-primary-400 rounded-xl px-3 py-2 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                            />

                            <button
                              onClick={() => updateQuantite(produit, quantite + 1)}
                              className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-bold transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Panier Premium */}
            <Card variant="elevated" className="animate-slideUp" style={{ animationDelay: '200ms' }}>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  Récapitulatif
                </CardTitle>
                {cart.length > 0 && (
                  <p className="text-sm text-stone-500 ml-13 mt-1">
                    {cart.length} article{cart.length > 1 ? 's' : ''} dans votre panier
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-200 mb-4">
                      <svg className="w-10 h-10 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-stone-900 mb-2">Votre panier est vide</h3>
                    <p className="text-stone-500">Ajoutez des produits pour créer votre commande</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      {cart.map(item => (
                        <div
                          key={item.produit.id}
                          className="group flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200 hover:border-primary-300 hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                              {item.produit.nom.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-stone-900 truncate">{item.produit.nom}</p>
                              <p className="text-xs font-mono text-stone-500">{item.produit.reference}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center justify-center min-w-[3rem] px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold shadow-md">
                              × {item.quantite}
                            </span>
                            <button
                              onClick={() => updateQuantite(item.produit, 0)}
                              className="w-9 h-9 rounded-lg bg-red-100 hover:bg-gradient-to-br hover:from-red-400 hover:to-red-500 text-red-600 hover:text-white transition-all duration-200 flex items-center justify-center"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-stone-200">
                      <Button
                        onClick={handleSubmit}
                        disabled={submitting}
                        isLoading={submitting}
                        fullWidth
                        size="lg"
                        className="gradient-rose text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-300"
                      >
                        {submitting ? 'Envoi en cours...' : 'Valider la commande'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <HistoriqueCommandes userId={user.id} magasinId={user.magasin_id || ''} />
        )}
      </div>
    </DashboardLayout>
  )
}
