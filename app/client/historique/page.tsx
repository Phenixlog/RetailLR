'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import type { User } from '@/types/database.types'

export default function HistoriquePage() {
  const router = useRouter()
  const { showSuccess, showError } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [commandes, setCommandes] = useState<any[]>([])
  const [allCommandes, setAllCommandes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCommande, setSelectedCommande] = useState<any | null>(null)
  const [selectedMagasin, setSelectedMagasin] = useState<any | null>(null)
  const [magasinProduits, setMagasinProduits] = useState<any[]>([])
  const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  useEffect(() => {
    loadData()
  }, [router])

  useEffect(() => {
    filterData()
  }, [dateDebut, dateFin, allCommandes])

  async function loadData() {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/login')
        return
      }

      const profile = await getUserProfile(currentUser.id) as any

      if (profile.role !== 'la_redoute' && profile.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      setUser(profile)

      const { data, error } = await supabase
        .from('commandes')
        .select(`
          id, statut, created_at, user_id,
          commande_magasins (
            magasin_id,
            magasins (id, nom, code, ville)
          ),
          commande_produits (
            quantite,
            produit_id,
            produits (id, nom, reference)
          ),
          commande_magasin_produits (
            magasin_id,
            produit_id,
            quantite
          )
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAllCommandes(data || [])
    } catch (error) {
      console.error('Error loading data:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  function filterData() {
    let filtered = [...allCommandes]

    if (dateDebut) {
      const debut = new Date(dateDebut)
      debut.setHours(0, 0, 0, 0)
      filtered = filtered.filter(c => new Date(c.created_at) >= debut)
    }

    if (dateFin) {
      const fin = new Date(dateFin)
      fin.setHours(23, 59, 59, 999)
      filtered = filtered.filter(c => new Date(c.created_at) <= fin)
    }

    setCommandes(filtered)
  }

  function resetFilters() {
    setDateDebut('')
    setDateFin('')
  }

  // Quand on sélectionne un magasin, préparer les produits avec leurs quantités
  function handleSelectMagasin(magasin: any) {
    setSelectedMagasin(magasin)

    // Récupérer les produits de la commande avec leurs quantités pour ce magasin
    const produitsWithQuantities = selectedCommande.commande_produits.map((cp: any) => {
      // Chercher s'il existe une quantité spécifique pour ce magasin
      const magasinProduit = selectedCommande.commande_magasin_produits?.find(
        (cmp: any) => cmp.magasin_id === magasin.magasins.id && cmp.produit_id === cp.produit_id
      )

      return {
        produit_id: cp.produit_id,
        produit: cp.produits,
        quantite: magasinProduit?.quantite || cp.quantite, // Quantité spécifique ou globale
        quantiteGlobale: cp.quantite
      }
    })

    setMagasinProduits(produitsWithQuantities)

    // Initialiser les quantités éditées
    const initialQuantities: Record<string, number> = {}
    produitsWithQuantities.forEach((p: any) => {
      initialQuantities[p.produit_id] = p.quantite
    })
    setEditedQuantities(initialQuantities)
  }

  async function handleSaveQuantities() {
    if (!selectedCommande || !selectedMagasin) return

    setSaving(true)
    try {
      // Sauvegarder chaque quantité modifiée
      for (const [produit_id, quantite] of Object.entries(editedQuantities)) {
        if (quantite > 0) {
          const response = await fetch('/api/commandes/update-quantity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              commande_id: selectedCommande.id,
              magasin_id: selectedMagasin.magasins.id,
              produit_id,
              quantite
            })
          })

          if (!response.ok) {
            const res = await response.json()
            throw new Error(res.error)
          }
        }
      }

      showSuccess('Quantités mises à jour avec succès !')
      // Recharger les données
      setSelectedMagasin(null)
      setSelectedCommande(null)
      setLoading(true)
      await loadData()
    } catch (error: any) {
      console.error('Error saving quantities:', error)
      showError('Erreur: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user) {
    return <PageLoader />
  }

  // Vue détaillée d'un magasin spécifique
  if (selectedMagasin) {
    return (
      <DashboardLayout user={user} title="Détail par magasin">
        <Card variant="elevated" className="animate-slideUp">
          <CardHeader>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedMagasin(null)}
                className="inline-flex items-center gap-2 px-4 py-2 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all duration-200 group"
              >
                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Retour à la commande</span>
              </button>
              <StatusBadge status={selectedCommande.statut} showDot />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {selectedMagasin.magasins.nom.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-stone-900">{selectedMagasin.magasins.nom}</h2>
                  <p className="text-stone-500">{selectedMagasin.magasins.ville} • {selectedMagasin.magasins.code}</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  <span className="font-bold">💡 Astuce :</span> Modifiez les quantités ci-dessous pour personnaliser cette commande pour ce magasin spécifiquement.
                </p>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-stone-50 to-stone-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-stone-700 uppercase tracking-wider">Produit</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-stone-700 uppercase tracking-wider">Réf.</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-stone-700 uppercase tracking-wider">Qté Globale</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-stone-700 uppercase tracking-wider">Qté Magasin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {magasinProduits.map((mp: any) => (
                      <tr key={mp.produit_id} className="hover:bg-stone-50">
                        <td className="px-4 py-4 text-sm font-medium text-stone-900">{mp.produit.nom}</td>
                        <td className="px-4 py-4 text-sm text-stone-600 font-mono">{mp.produit.reference}</td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-stone-200 text-stone-600 rounded-lg font-bold text-sm">
                            {mp.quantiteGlobale}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <input
                            type="number"
                            min="0"
                            value={editedQuantities[mp.produit_id] || 0}
                            onChange={(e) => setEditedQuantities({
                              ...editedQuantities,
                              [mp.produit_id]: parseInt(e.target.value) || 0
                            })}
                            className="w-20 px-3 py-2 text-center border-2 border-stone-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all font-bold"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedMagasin(null)}
                  className="px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveQuantities}
                  disabled={saving}
                  className="px-8 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl font-bold shadow-lg shadow-primary-600/30 hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : 'Sauvegarder les quantités'}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  // Vue détaillée d'une commande (avec liste cliquable de magasins)
  if (selectedCommande) {
    return (
      <DashboardLayout user={user} title="Détail de la commande">
        <Card variant="elevated" className="animate-slideUp">
          <CardHeader>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedCommande(null)}
                className="inline-flex items-center gap-2 px-4 py-2 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all duration-200 group"
              >
                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Retour à l'historique</span>
              </button>
              <StatusBadge status={selectedCommande.statut} showDot />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-stone-900 mb-2">
                  Commande #{selectedCommande.id.slice(0, 8)}
                </h2>
                <p className="text-stone-500">
                  {new Date(selectedCommande.created_at).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Magasins ({selectedCommande.commande_magasins.length}) — Cliquez pour voir le détail
                  </h3>
                  <div className="space-y-2">
                    {selectedCommande.commande_magasins.map((cm: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectMagasin(cm)}
                        className="w-full p-4 bg-gradient-to-r from-stone-50 to-blue-50 rounded-xl border-2 border-stone-200 hover:border-primary-400 hover:from-primary-50 hover:to-accent-50 transition-all text-left group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-stone-900 group-hover:text-primary-700">{cm.magasins.nom}</p>
                            <p className="text-sm text-stone-600">{cm.magasins.ville} • {cm.magasins.code}</p>
                          </div>
                          <svg className="w-5 h-5 text-stone-400 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Produits ({selectedCommande.commande_produits.length}) — Quantités globales
                  </h3>
                  <div className="border rounded-xl overflow-hidden">
                    <table className="min-w-full">
                      <thead className="bg-gradient-to-r from-stone-50 to-stone-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-stone-700">Produit</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-stone-700">Réf.</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-stone-700">Qté</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {selectedCommande.commande_produits.map((cp: any, idx: number) => (
                          <tr key={idx} className="hover:bg-stone-50">
                            <td className="px-4 py-3 text-sm font-medium">{cp.produits.nom}</td>
                            <td className="px-4 py-3 text-sm text-stone-600">{cp.produits.reference}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 text-white rounded-lg font-bold text-sm">
                                {cp.quantite}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user} title="Historique des commandes">
      <div className="space-y-6">
        {/* Filtres de dates */}
        <Card variant="elevated" className="animate-slideDown">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-stone-700 mb-2">
                  Date de début
                </label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-stone-700 mb-2">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
              {(dateDebut || dateFin) && (
                <button
                  onClick={resetFilters}
                  className="px-6 py-3 bg-stone-100 text-stone-700 rounded-xl font-semibold hover:bg-stone-200 transition-all whitespace-nowrap"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" className="animate-slideUp">
          <CardHeader>
            <CardTitle className="text-2xl">Historique des commandes</CardTitle>
            {commandes.length > 0 && (
              <p className="text-sm text-stone-500 mt-1">
                {commandes.length} commande{commandes.length > 1 ? 's' : ''} trouvée{commandes.length > 1 ? 's' : ''}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {commandes.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-stone-100 to-stone-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-stone-900 mb-1">Aucune commande</p>
                <p className="text-sm text-stone-500 mb-6">Créez votre première commande pour commencer</p>
                <button
                  onClick={() => router.push('/client/commande')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nouvelle commande
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {commandes.map((commande, idx) => (
                  <div
                    key={commande.id}
                    onClick={() => setSelectedCommande(commande)}
                    className="group p-5 border-2 border-stone-200 rounded-xl hover:border-primary-300 hover:bg-gradient-to-r hover:from-primary-50 hover:to-accent-50 cursor-pointer transition-all duration-200 animate-fadeIn"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-lg font-bold text-stone-900">#{commande.id.slice(0, 8)}</span>
                          <StatusBadge status={commande.statut} />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-stone-600">
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(commande.created_at).toLocaleDateString('fr-FR')}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            {commande.commande_magasins.length} magasin(s)
                          </span>
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            {commande.commande_produits.reduce((sum: number, cp: any) => sum + cp.quantite, 0)} produit(s)
                          </span>
                        </div>
                      </div>
                      <svg className="w-6 h-6 text-stone-400 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
