'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import type { User } from '@/types/database.types'

export default function StatistiquesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

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

        // Stats par mois (derniers 6 mois)
        const last6Months = Array.from({ length: 6 }, (_, i) => {
          const date = new Date()
          date.setMonth(date.getMonth() - i)
          return {
            month: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
            count: commandes?.filter(c => {
              const cmdDate = new Date(c.created_at)
              return cmdDate.getMonth() === date.getMonth() && cmdDate.getFullYear() === date.getFullYear()
            }).length || 0
          }
        }).reverse()

        // Stats par statut
        const statsByStatus = {
          en_attente: commandes?.filter(c => c.statut === 'en_attente').length || 0,
          en_preparation: commandes?.filter(c => c.statut === 'en_preparation').length || 0,
          confirmee: commandes?.filter(c => c.statut === 'confirmee').length || 0,
          envoyee: commandes?.filter(c => c.statut === 'envoyee').length || 0,
        }

        setStats({
          last6Months,
          statsByStatus,
          total: commandes?.length || 0,
        })
      } catch (error) {
        console.error('Error loading data:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  if (loading || !user || !stats) {
    return <PageLoader />
  }

  const maxCount = Math.max(...stats.last6Months.map((m: any) => m.count), 1)

  return (
    <DashboardLayout user={user} title="Statistiques">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-stone-900">Statistiques</h1>
            <p className="text-stone-600 mt-1">Analyse des commandes et performances</p>
          </div>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-all"
          >
            Retour au dashboard
          </button>
        </div>

        {/* Stats globales */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Évolution des commandes (6 derniers mois)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.last6Months.map((month: any, idx: number) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-stone-700">{month.month}</span>
                    <span className="text-sm font-bold text-stone-900">{month.count} commandes</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-accent-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(month.count / maxCount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Répartition par statut */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'En attente', value: stats.statsByStatus.en_attente, color: 'from-amber-400 to-amber-600' },
            { label: 'En préparation', value: stats.statsByStatus.en_preparation, color: 'from-blue-400 to-blue-600' },
            { label: 'Confirmées', value: stats.statsByStatus.confirmee, color: 'from-green-400 to-green-600' },
            { label: 'Envoyées', value: stats.statsByStatus.envoyee, color: 'from-purple-400 to-purple-600' },
          ].map((item, idx) => (
            <Card key={item.label} variant="elevated" className="animate-slideUp" style={{ animationDelay: `${idx * 50}ms` }}>
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-4`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-stone-600 mb-1">{item.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-stone-900">{item.value}</p>
                  <p className="text-sm text-stone-500">
                    ({stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0}%)
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
