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
  totalMagasins: number
  totalProduits: number
  commandesAujourdhui: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalCommandes: 0,
    enAttente: 0,
    enPreparation: 0,
    confirmees: 0,
    envoyees: 0,
    totalMagasins: 0,
    totalProduits: 0,
    commandesAujourdhui: 0,
  })
  const [recentCommandes, setRecentCommandes] = useState<any[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push('/login')
          return
        }

        const profile = await getUserProfile(currentUser.id)
        if (profile.role !== 'admin') {
          router.push('/dashboard')
          return
        }

        setUser(profile)

        // Charger les statistiques
        const { data: commandes } = await supabase
          .from('commandes')
          .select('id, statut, created_at')
          .order('created_at', { ascending: false })

        const { data: magasins } = await supabase
          .from('magasins')
          .select('id')

        const { data: produits } = await supabase
          .from('produits')
          .select('id')

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const commandesAujourdhui = commandes?.filter(c =>
          new Date(c.created_at) >= today
        ).length || 0

        setStats({
          totalCommandes: commandes?.length || 0,
          enAttente: commandes?.filter(c => c.statut === 'en_attente').length || 0,
          enPreparation: commandes?.filter(c => c.statut === 'en_preparation').length || 0,
          confirmees: commandes?.filter(c => c.statut === 'confirmee').length || 0,
          envoyees: commandes?.filter(c => c.statut === 'envoyee').length || 0,
          totalMagasins: magasins?.length || 0,
          totalProduits: produits?.length || 0,
          commandesAujourdhui,
        })

        // Charger les 5 dernières commandes
        const { data: recent } = await supabase
          .from('commandes')
          .select(`
            id, statut, created_at,
            users!commandes_user_id_fkey (email)
          `)
          .order('created_at', { ascending: false })
          .limit(5)

        setRecentCommandes(recent || [])
      } catch (error) {
        console.error('Error loading data:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

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
      title: 'Magasins',
      value: stats.totalMagasins,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
  ]

  return (
    <DashboardLayout user={user} title="Dashboard Admin">
      <div className="space-y-6">
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
                  { label: 'Confirmées', value: stats.confirmees },
                  { label: 'En préparation', value: stats.enPreparation },
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
                      onClick={() => router.push(`/admin/commandes/${commande.id}`)}
                      className="w-full p-4 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 hover:border-primary-300 transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm font-semibold text-stone-900">
                            #{commande.id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-stone-600 mt-1">
                            {commande.users?.email || 'N/A'}
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
                onClick={() => router.push('/admin/commandes-list')}
                className="p-4 rounded-xl bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200 hover:border-primary-300 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white border border-stone-200 flex items-center justify-center group-hover:bg-primary-50 transition-colors">
                    <svg className="w-5 h-5 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">Voir toutes les commandes</p>
                    <p className="text-xs text-stone-600 mt-0.5">Liste complète</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => router.push('/admin/statistiques')}
                className="p-4 rounded-xl bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200 hover:border-primary-300 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white border border-stone-200 flex items-center justify-center group-hover:bg-primary-50 transition-colors">
                    <svg className="w-5 h-5 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">Statistiques</p>
                    <p className="text-xs text-stone-600 mt-0.5">Analyse détaillée</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => router.push('/admin/parametres')}
                className="p-4 rounded-xl bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200 hover:border-primary-300 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white border border-stone-200 flex items-center justify-center group-hover:bg-primary-50 transition-colors">
                    <svg className="w-5 h-5 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">Paramètres</p>
                    <p className="text-xs text-stone-600 mt-0.5">Configuration</p>
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
