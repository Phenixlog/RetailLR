'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import type { User, Commande } from '@/types/database.types'
import { formatDate, formatStatut, getStatutColor } from '@/lib/utils'

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [commandes, setCommandes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'en_attente' | 'en_preparation' | 'confirmee' | 'envoyee'>('all')

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push('/login')
          return
        }

        const profile = await getUserProfile(currentUser.id) as any

        // Vérifier que c'est bien un admin
        if (profile.role !== 'admin') {
          router.push('/dashboard')
          return
        }

        setUser(profile)

        // Charger toutes les commandes avec les relations
        const { data: commandesData, error } = await supabase
          .from('commandes')
          .select(`
            id, statut, created_at, user_id,
            users!commandes_user_id_fkey (email, role),
            commande_magasins (
              magasins (nom, code, ville)
            ),
            commande_produits (
              quantite,
              produits (nom, reference)
            ),
            photos (id)
          `)
          .order('created_at', { ascending: false })

        if (error) throw error
        setCommandes(commandesData || [])
      } catch (error) {
        console.error('Error loading data:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const filteredCommandes = filter === 'all'
    ? commandes
    : commandes.filter(c => c.statut === filter)

  if (loading || !user) {
    return <PageLoader />
  }

  const stats = [
    {
      label: 'Total commandes',
      value: (commandes as any[]).length,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      label: 'En attente',
      value: (commandes as any[]).filter(c => c.statut === 'en_attente').length,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Confirmées',
      value: (commandes as any[]).filter(c => c.statut === 'confirmee').length,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'En préparation',
      value: (commandes as any[]).filter(c => c.statut === 'en_preparation').length,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      label: 'Envoyées',
      value: (commandes as any[]).filter(c => c.statut === 'envoyee').length,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  return (
    <DashboardLayout user={user} title="Dashboard Administrateur">
      <div className="space-y-6">
        {/* Stats Cards Premium */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <Card
              key={stat.label}
              hoverable
              variant="elevated"
              className="animate-slideUp overflow-hidden relative group"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                    {stat.icon}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-600 mb-1">{stat.label}</p>
                  <p className="text-4xl font-bold text-stone-900 tracking-tight">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtres Premium */}
        <Card variant="elevated" className="animate-slideUp" style={{ animationDelay: '200ms' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-stone-900">Filtrer les commandes</h3>
              <span className="text-sm text-stone-500">{filteredCommandes.length} résultats</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setFilter('all')}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${filter === 'all'
                  ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/30'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
              >
                Toutes <span className="ml-1.5 font-bold">({commandes.length})</span>
              </button>
              <button
                onClick={() => setFilter('en_attente')}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${filter === 'en_attente'
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg shadow-yellow-500/30'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
              >
                En attente <span className="ml-1.5 font-bold">({(commandes as any[]).filter(c => c.statut === 'en_attente').length})</span>
              </button>
              <button
                onClick={() => setFilter('confirmee')}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${filter === 'confirmee'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
              >
                Confirmées <span className="ml-1.5 font-bold">({(commandes as any[]).filter(c => c.statut === 'confirmee').length})</span>
              </button>
              <button
                onClick={() => setFilter('en_preparation')}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${filter === 'en_preparation'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
              >
                En préparation <span className="ml-1.5 font-bold">({(commandes as any[]).filter(c => c.statut === 'en_preparation').length})</span>
              </button>
              <button
                onClick={() => setFilter('envoyee')}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${filter === 'envoyee'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
              >
                Envoyées <span className="ml-1.5 font-bold">({(commandes as any[]).filter(c => c.statut === 'envoyee').length})</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Liste des commandes - Design Premium */}
        <Card variant="elevated" className="animate-slideUp" style={{ animationDelay: '300ms' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Commandes récentes</CardTitle>
                <p className="text-sm text-stone-500 mt-1">{filteredCommandes.length} commande(s) trouvée(s)</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                </button>
                <button className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-gradient-to-r from-stone-50 to-stone-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Magasins</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Produits</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Photos</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-stone-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-100">
                  {filteredCommandes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-20 h-20 bg-gradient-to-br from-stone-100 to-stone-200 rounded-2xl flex items-center justify-center mb-4">
                            <svg className="w-10 h-10 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                          </div>
                          <p className="text-lg font-medium text-stone-900 mb-1">Aucune commande trouvée</p>
                          <p className="text-sm text-stone-500">Essayez de modifier vos filtres</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCommandes.map((commande, idx) => (
                      <tr
                        key={commande.id}
                        className="group hover:bg-gradient-to-r hover:from-primary-50 hover:to-accent-50 transition-all duration-200 cursor-pointer animate-fadeIn border-l-4 border-transparent hover:border-primary-500"
                        style={{ animationDelay: `${idx * 30}ms` }}
                        onClick={() => router.push(`/admin/commandes/${commande.id}`)}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="text-sm font-mono font-semibold text-stone-900">
                              #{commande.id.slice(0, 8)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-sm text-stone-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(commande.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-xs font-bold">
                              {commande.users?.email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span className="text-sm font-medium text-stone-900">{commande.users?.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            {commande.commande_magasins.length}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            {commande.commande_produits.length}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          {commande.photos.length > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {commande.photos.length}
                            </span>
                          ) : (
                            <span className="text-sm text-stone-400">Aucune</span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <StatusBadge status={commande.statut} />
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-gradient-to-r hover:from-primary-500 hover:to-accent-500 text-stone-700 hover:text-white rounded-xl text-sm font-medium transition-all duration-200 group-hover:shadow-lg">
                            Voir
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
