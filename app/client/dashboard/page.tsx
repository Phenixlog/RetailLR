'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import type { User } from '@/types/database.types'

interface Stats {
  totalCommandes: number
  enAttente: number
  enPreparation: number
  confirmees: number
  envoyees: number
  commandesAujourdhui: number
}

export default function ClientDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalCommandes: 0,
    enAttente: 0,
    enPreparation: 0,
    confirmees: 0,
    envoyees: 0,
    commandesAujourdhui: 0,
  })
  const [recentCommandes, setRecentCommandes] = useState<any[]>([])
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [allCommandes, setAllCommandes] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [router])

  useEffect(() => {
    if (allCommandes.length > 0) {
      filterData()
    }
  }, [dateDebut, dateFin, allCommandes])

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

      // Charger TOUTES les commandes pour cet utilisateur
      const { data: commandes } = await supabase
        .from('commandes')
        .select(`
          id, statut, created_at,
          commande_magasins (
            magasins (nom)
          ),
          commande_produits (
            quantite
          )
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      setAllCommandes(commandes || [])
    } catch (error) {
      console.error('Error loading data:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  function filterData() {
    let filtered = [...allCommandes]

    // Filtrer par dates si définies
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

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const commandesAujourdhui = filtered.filter(c =>
      new Date(c.created_at) >= today
    ).length

    setStats({
      totalCommandes: filtered.length,
      enAttente: filtered.filter(c => c.statut === 'en_attente').length,
      enPreparation: filtered.filter(c => c.statut === 'en_preparation').length,
      confirmees: filtered.filter(c => c.statut === 'confirmee').length,
      envoyees: filtered.filter(c => c.statut === 'envoyee').length,
      commandesAujourdhui,
    })

    setRecentCommandes(filtered.slice(0, 5))
  }

  function resetFilters() {
    setDateDebut('')
    setDateFin('')
  }

  if (loading || !user) {
    return <PageLoader />
  }

  const statCards = [
    {
      title: 'Total Commandes',
      value: stats.totalCommandes,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      title: "Aujourd'hui",
      value: stats.commandesAujourdhui,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'En attente',
      value: stats.enAttente,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'Envoyées',
      value: stats.envoyees,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
  ]

  return (
    <DashboardLayout user={user} title="Dashboard La Redoute">
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, idx) => (
            <Card
              key={stat.title}
              variant="elevated"
              className="animate-slideUp"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-stone-600 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-stone-900">{stat.value}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white">
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Répartition par statut */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card variant="elevated" className="animate-slideUp" style={{ animationDelay: '200ms' }}>
            <CardHeader>
              <CardTitle>Répartition des commandes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: 'En attente', value: stats.enAttente },
                  { label: 'En préparation', value: stats.enPreparation },
                  { label: 'Confirmées', value: stats.confirmees },
                  { label: 'Envoyées', value: stats.envoyees },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-stone-700">{item.label}</span>
                      <span className="text-sm font-bold text-stone-900">{item.value}</span>
                    </div>
                    <div className="w-full bg-stone-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-accent-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${stats.totalCommandes > 0 ? (item.value / stats.totalCommandes) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="animate-slideUp" style={{ animationDelay: '250ms' }}>
            <CardHeader>
              <CardTitle>Dernières commandes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentCommandes.length === 0 ? (
                  <p className="text-sm text-stone-500 text-center py-8">Aucune commande</p>
                ) : (
                  recentCommandes.map((commande, idx) => (
                    <button
                      key={commande.id}
                      onClick={() => router.push(`/client/historique`)}
                      className="w-full p-4 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 hover:border-primary-300 transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm font-semibold text-stone-900">
                            #{commande.id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-stone-600 mt-1">
                            {commande.commande_magasins?.length || 0} magasin(s) • {commande.commande_produits?.length || 0} produit(s)
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2 py-1 rounded-lg text-xs font-semibold bg-stone-100 text-stone-700">
                            {commande.statut.replace('_', ' ')}
                          </span>
                          <p className="text-xs text-stone-500 mt-1">
                            {new Date(commande.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions rapides */}
        <Card variant="elevated" className="animate-slideUp" style={{ animationDelay: '300ms' }}>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/client/commande')}
                className="p-4 rounded-xl bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200 hover:border-primary-300 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white border border-stone-200 flex items-center justify-center group-hover:bg-primary-50 transition-colors">
                    <svg className="w-5 h-5 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">Nouvelle commande</p>
                    <p className="text-xs text-stone-600 mt-0.5">Créer une commande</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => router.push('/client/magasins')}
                className="p-4 rounded-xl bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200 hover:border-primary-300 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white border border-stone-200 flex items-center justify-center group-hover:bg-primary-50 transition-colors">
                    <svg className="w-5 h-5 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">Magasins</p>
                    <p className="text-xs text-stone-600 mt-0.5">Voir les magasins</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => router.push('/client/historique')}
                className="p-4 rounded-xl bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200 hover:border-primary-300 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white border border-stone-200 flex items-center justify-center group-hover:bg-primary-50 transition-colors">
                    <svg className="w-5 h-5 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">Historique</p>
                    <p className="text-xs text-stone-600 mt-0.5">Mes commandes</p>
                  </div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
