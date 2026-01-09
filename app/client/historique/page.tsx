'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import type { User } from '@/types/database.types'
import {
  History,
  Calendar,
  Package,
  Store,
  ChevronRight,
  ArrowLeft,
  Edit3,
  Save,
  X,
  Search,
  Box,
  MapPin,
  Clock,
  RefreshCcw,
  Plus
} from 'lucide-react'

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

  function handleSelectMagasin(magasin: any) {
    setSelectedMagasin(magasin)

    const produitsWithQuantities = selectedCommande.commande_produits.map((cp: any) => {
      const magasinProduit = selectedCommande.commande_magasin_produits?.find(
        (cmp: any) => cmp.magasin_id === magasin.magasins.id && cmp.produit_id === cp.produit_id
      )

      const quantiteGlobale = selectedCommande.commande_magasins.reduce((sum: number, cm: any) => {
        const mp = selectedCommande.commande_magasin_produits?.find(
          (cmp: any) => cmp.magasin_id === cm.magasins.id && cmp.produit_id === cp.produit_id
        )
        return sum + (mp?.quantite ?? cp.quantite)
      }, 0)

      return {
        produit_id: cp.produit_id,
        produit: cp.produits,
        quantite: magasinProduit?.quantite || cp.quantite,
        quantiteGlobale: quantiteGlobale
      }
    })

    setMagasinProduits(produitsWithQuantities)

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

  // VUE DÉTAILLÉE PAR MAGASIN
  if (selectedMagasin) {
    return (
      <DashboardLayout user={user} title="Détail par magasin">
        <div className="space-y-8 pb-12 animate-fadeIn px-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setSelectedMagasin(null)}
              className="p-3 bg-white shadow-md rounded-2xl text-stone-600 hover:text-primary-600 transition-all hover:scale-110 active:scale-95 border border-stone-100"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1 min-w-[200px]">
              <h1 className="text-2xl font-black text-stone-900 leading-tight mb-1">
                {selectedMagasin.magasins.nom}
              </h1>
              <p className="text-stone-500 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-primary-500" />
                {selectedMagasin.magasins.ville} • {selectedMagasin.magasins.code}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={selectedCommande.statut} />
            </div>
          </div>

          <Card className="border-none shadow-2xl bg-white/50 backdrop-blur-xl rounded-[2rem] overflow-hidden">
            <div className="p-4 md:p-8">
              <div className="flex items-center gap-4 mb-8 bg-amber-50 p-6 rounded-3xl border border-amber-200">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-amber-900">Édition des quantités</p>
                  <p className="text-xs font-bold text-amber-700/80">Personnalisez les produits destinés à ce point de vente.</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-stone-50/50">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Produit</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Référence</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-stone-400">Qté Globale</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-stone-400">Dédiée</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {magasinProduits.map((mp: any) => (
                        <tr key={mp.produit_id} className="hover:bg-stone-50 transition-colors group">
                          <td className="px-6 py-6">
                            <p className="font-black text-stone-900 group-hover:text-primary-600 transition-colors uppercase text-sm">{mp.produit.nom}</p>
                          </td>
                          <td className="px-6 py-6">
                            <span className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-xl text-xs font-black font-mono border border-stone-200">
                              {mp.produit.reference}
                            </span>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <span className="text-sm font-black text-stone-400">
                              {mp.quantiteGlobale}
                            </span>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex justify-center">
                              <input
                                type="number"
                                min="0"
                                value={editedQuantities[mp.produit_id] || 0}
                                onChange={(e) => setEditedQuantities({
                                  ...editedQuantities,
                                  [mp.produit_id]: parseInt(e.target.value) || 0
                                })}
                                className="w-24 px-4 py-3 text-center bg-stone-50 border-2 border-stone-200 rounded-2xl focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all font-black text-xl outline-none"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-4 mt-10">
                <button
                  onClick={() => setSelectedMagasin(null)}
                  className="px-8 py-5 bg-stone-100 text-stone-600 rounded-[1.5rem] font-black hover:bg-stone-200 transition-all active:scale-95 flex items-center justify-center gap-3 border border-stone-200"
                >
                  <X className="w-5 h-5" />
                  ANNULER
                </button>
                <button
                  onClick={handleSaveQuantities}
                  disabled={saving}
                  className="px-12 py-5 bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-[1.5rem] font-black shadow-xl shadow-stone-900/20 hover:shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
                >
                  {saving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 text-primary-400" />}
                  {saving ? 'ENREGISTREMENT...' : 'SAUVEGARDER'}
                </button>
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  // VUE DÉTAILLÉE D'UNE COMMANDE
  if (selectedCommande) {
    return (
      <DashboardLayout user={user} title="Détail de la commande">
        <div className="space-y-8 pb-12 animate-fadeIn px-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setSelectedCommande(null)}
              className="p-3 bg-white shadow-md rounded-2xl text-stone-600 hover:text-primary-600 transition-all hover:scale-110 active:scale-95 border border-stone-100"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1 min-w-[200px]">
              <h1 className="text-2xl font-black text-stone-900 leading-tight mb-1">
                Commande <span className="text-primary-600">#{selectedCommande.id.slice(0, 8).toUpperCase()}</span>
              </h1>
              <p className="text-stone-500 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-primary-500" />
                {new Date(selectedCommande.created_at).toLocaleString('fr-FR', {
                  day: '2-digit', month: 'long', year: 'numeric'
                })}
              </p>
            </div>
            <StatusBadge status={selectedCommande.statut} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* MAGASINS */}
            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-stone-900 flex items-center gap-3">
                    <div className="w-2 h-8 bg-primary-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
                    Magasins Destinataires
                  </h3>
                  <span className="px-4 py-2 bg-stone-100 rounded-xl text-[10px] font-black text-stone-500 border border-stone-200 tracking-[0.2em]">
                    {selectedCommande.commande_magasins.length} POINTS DE VENTE
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {selectedCommande.commande_magasins.map((cm: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectMagasin(cm)}
                      className="group w-full p-6 bg-white rounded-[1.8rem] border border-stone-100 shadow-sm hover:border-primary-500 hover:shadow-2xl transition-all text-left flex items-center justify-between"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-600 group-hover:bg-primary-500 group-hover:text-white transition-all duration-300">
                          <Store className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="font-black text-stone-900 group-hover:text-primary-600 transition-colors uppercase text-sm tracking-tight">{cm.magasins.nom}</p>
                          <p className="text-[10px] font-black text-stone-400 mt-1 uppercase tracking-widest">{cm.magasins.ville} • {cm.magasins.code}</p>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-300 group-hover:bg-primary-50 group-hover:text-primary-500 group-hover:translate-x-1 transition-all">
                        <ChevronRight className="w-6 h-6" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* PRODUITS */}
            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-stone-900 flex items-center gap-3">
                    <div className="w-2 h-8 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                    Récapitulatif Articles
                  </h3>
                </div>

                <div className="overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-stone-50/50">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Désignation</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-stone-400">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {selectedCommande.commande_produits.map((cp: any, idx: number) => {
                        const totalQuantity = selectedCommande.commande_magasins.reduce((sum: number, cm: any) => {
                          const mp = selectedCommande.commande_magasin_produits?.find(
                            (it: any) => it.magasin_id === cm.magasins.id && it.produit_id === cp.produit_id
                          )
                          return sum + (mp?.quantite ?? cp.quantite)
                        }, 0)

                        return (
                          <tr key={idx} className="group transition-colors hover:bg-stone-50/50">
                            <td className="px-6 py-6">
                              <p className="text-[10px] font-black text-stone-400 font-mono mb-1 group-hover:text-primary-500 transition-colors tracking-widest">{cp.produits.reference}</p>
                              <p className="font-black text-stone-900 text-sm tracking-tight uppercase leading-tight">{cp.produits.nom}</p>
                            </td>
                            <td className="px-6 py-6 text-right">
                              <span className="inline-flex items-center justify-center min-w-[3.5rem] h-11 px-4 bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-2xl font-black text-sm shadow-lg shadow-stone-900/20">
                                {totalQuantity}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // LISTE DES COMMANDES
  return (
    <DashboardLayout user={user} title="Historique">
      <div className="space-y-8 pb-12 animate-fadeIn px-4">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-stone-900 to-stone-800 flex items-center justify-center text-white shadow-2xl relative overflow-hidden">
              <History className="w-8 h-8 relative z-10" />
              <div className="absolute top-0 right-0 w-8 h-8 bg-primary-500/20 blur-xl"></div>
            </div>
            <div>
              <h1 className="text-3xl font-black text-stone-900 leading-tight">Historique</h1>
              <p className="text-stone-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                <RefreshCcw className="w-3 h-3 text-primary-500" />
                Liste actualisée
              </p>
            </div>
          </div>
          <div className="px-8 py-4 bg-white/50 backdrop-blur-md rounded-[1.5rem] text-sm font-black text-stone-900 border border-white shadow-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest leading-none mb-1">Total</p>
              <p className="text-lg leading-none">{commandes.length} Commandes</p>
            </div>
          </div>
        </div>

        {/* RECHERCHE & FILTRES */}
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 w-full relative">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Chercher par ID ou date..."
                className="w-full pl-16 pr-6 py-5 bg-stone-100 border-2 border-transparent rounded-[1.8rem] focus:bg-white focus:border-primary-500 transition-all font-black text-stone-900 outline-none placeholder:text-stone-300"
              />
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex-1 md:w-48 bg-stone-100 p-2 rounded-[1.5rem] flex items-center gap-2 border border-stone-200">
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="bg-transparent font-black text-xs text-stone-900 outline-none w-full px-2 py-2"
                />
              </div>
              <div className="flex-1 md:w-48 bg-stone-100 p-2 rounded-[1.5rem] flex items-center gap-2 border border-stone-200">
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="bg-transparent font-black text-xs text-stone-900 outline-none w-full px-2 py-2"
                />
              </div>
              {(dateDebut || dateFin) && (
                <button
                  onClick={resetFilters}
                  className="p-4 bg-stone-900 text-white rounded-2xl hover:bg-stone-800 transition-all shadow-lg active:scale-90"
                >
                  <RefreshCcw className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* COMMANDES GRID */}
        {commandes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-stone-400 bg-white/50 backdrop-blur-md shadow-2xl rounded-[3.5rem] animate-fadeIn border border-white">
            <div className="w-32 h-32 rounded-[2.5rem] bg-stone-50 flex items-center justify-center mb-8 border border-stone-100">
              <Box className="w-16 h-16 opacity-10" />
            </div>
            <p className="text-2xl font-black text-stone-900 mb-2">Aucune commande</p>
            <p className="font-bold text-stone-400 mb-10 text-center px-8">Essayez de modifier vos filtres pour voir vos anciennes commandes.</p>
            <button
              onClick={() => router.push('/client/commande')}
              className="px-10 py-5 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-[1.8rem] font-black shadow-2xl shadow-primary-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
            >
              <Plus className="w-7 h-7" />
              NOUVELLE COMMANDE
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {commandes.map((commande, idx) => (
              <button
                key={commande.id}
                onClick={() => setSelectedCommande(commande)}
                className="group relative w-full p-8 rounded-[3rem] bg-white border border-stone-100 hover:border-primary-500 hover:shadow-2xl transition-all text-left flex flex-col justify-between gap-8 animate-slideUp"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-600 group-hover:bg-primary-500 group-hover:text-white transition-all duration-500 shadow-sm relative overflow-hidden">
                      <Package className="w-8 h-8 relative z-10" />
                      <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-stone-500/10 group-hover:opacity-0"></div>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <p className="text-xl font-black text-stone-900 tracking-tight uppercase group-hover:text-primary-600 transition-colors">#{commande.id.slice(0, 8)}</p>
                      </div>
                      <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(commande.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="translate-y-1">
                    <StatusBadge status={commande.statut} />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-stone-50">
                  <div className="flex-1 flex gap-2">
                    <span className="px-4 py-2 bg-stone-50 text-[10px] font-black text-stone-500 rounded-xl group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors uppercase tracking-widest border border-stone-100">
                      {commande.commande_magasins.length} MAGS
                    </span>
                    <span className="px-4 py-2 bg-stone-50 text-[10px] font-black text-stone-500 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors uppercase tracking-widest border border-stone-100">
                      {commande.commande_produits.length} ARTS
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-300 group-hover:bg-primary-500 group-hover:text-white group-hover:translate-x-1 transition-all">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-slideUp { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out forwards; }
      `}</style>
    </DashboardLayout>
  )
}
