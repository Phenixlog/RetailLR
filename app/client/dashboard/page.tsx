'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import type { User } from '@/types/database.types'
import {
  Package,
  Clock,
  Send,
  CheckCircle2,
  Plus,
  History,
  Store,
  ChevronRight,
  Filter,
  RefreshCcw,
  Calendar
} from 'lucide-react'

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
  const [showFilters, setShowFilters] = useState(false)

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
      icon: <Package className="w-5 h-5" />,
      bgColor: 'bg-slate-100',
      iconColor: 'text-slate-600',
    },
    {
      title: "Activités du jour",
      value: stats.commandesAujourdhui,
      icon: <RefreshCcw className="w-5 h-5" />,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      title: 'En attente',
      value: stats.enAttente,
      icon: <Clock className="w-5 h-5" />,
      bgColor: 'bg-red-50',
      iconColor: 'text-red-500',
    },
    {
      title: 'Déjà envoyées',
      value: stats.envoyees,
      icon: <Send className="w-5 h-5" />,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
  ]

  const statusMap = [
    { label: 'En attente', value: stats.enAttente, color: 'bg-rose-500', bgColor: 'bg-rose-100', textColor: 'text-rose-700' },
    { label: 'Préparation', value: stats.enPreparation, color: 'bg-amber-500', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
    { label: 'Confirmées', value: stats.confirmees, color: 'bg-blue-500', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
    { label: 'Expédiées', value: stats.envoyees, color: 'bg-emerald-500', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  ]

  return (
    <DashboardLayout user={user} title="Tableau de Bord">
      <div className="space-y-8 pb-12">
        {/* HERO SECTION */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-800 p-8 text-white shadow-lg animate-fadeIn">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <h1 className="text-2xl md:text-3xl font-semibold mb-3">
                Bonjour, {user.email?.split('@')[0]}
              </h1>
              <p className="text-slate-300 mb-6">
                Vous avez <span className="text-white font-semibold">{stats.enAttente} commandes</span> en attente de traitement.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => router.push('/client/commande')}
                  className="px-6 py-3 bg-white text-slate-800 rounded-lg font-semibold shadow hover:bg-slate-100 transition-all flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Nouvelle Commande
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-5 py-3 rounded-lg font-medium transition-all flex items-center gap-2 border ${showFilters
                    ? 'bg-white/20 border-white/30 text-white'
                    : 'bg-transparent border-slate-600 text-slate-300 hover:border-slate-400'
                    }`}
                >
                  <Filter className="w-4 h-4" />
                  Filtrer par date
                </button>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <div className="p-5 bg-white/10 border border-white/10 rounded-xl text-center min-w-[120px]">
                <p className="text-3xl font-bold mb-1">{stats.totalCommandes}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total</p>
              </div>
              <div className="p-5 bg-red-500/20 border border-red-500/30 rounded-xl text-center min-w-[120px]">
                <p className="text-3xl font-bold text-red-300 mb-1">{stats.enAttente}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-red-400/80">En cours</p>
              </div>
            </div>
          </div>
        </div>

        {/* FILTERS PANEL */}
        {showFilters && (
          <Card className="border-none shadow-xl bg-white/80 backdrop-blur-xl animate-slideDown overflow-hidden">
            <div className="p-6 flex flex-col md:flex-row items-end gap-6">
              <div className="flex-1 w-full">
                <label className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-3">
                  <Calendar className="w-4 h-4 text-primary-500" />
                  Date de début
                </label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full px-5 py-4 bg-stone-100 border-2 border-transparent rounded-2xl focus:bg-white focus:border-primary-500 focus:outline-none transition-all font-medium"
                />
              </div>
              <div className="flex-1 w-full">
                <label className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-3">
                  <Calendar className="w-4 h-4 text-primary-500" />
                  Date de fin
                </label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full px-5 py-4 bg-stone-100 border-2 border-transparent rounded-2xl focus:bg-white focus:border-primary-500 focus:outline-none transition-all font-medium"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={resetFilters}
                  className="px-6 py-4 bg-stone-200 text-stone-700 rounded-2xl font-bold hover:bg-stone-300 transition-all active:scale-95"
                >
                  Effacer
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* STATS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, idx) => (
            <div
              key={stat.title}
              className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow animate-slideUp"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center ${stat.iconColor}`}>
                  {stat.icon}
                </div>
              </div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">{stat.title}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* RÉPARTITION */}
          <Card className="lg:col-span-1 border border-slate-100 shadow-sm overflow-hidden bg-white">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-3">
                  <div className="w-1 h-6 bg-slate-800 rounded-full"></div>
                  Répartition
                </h2>
              </div>

              <div className="space-y-5">
                {statusMap.map((item, idx) => (
                  <div key={item.label} className="animate-fadeIn" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                        <span className="text-sm font-medium text-slate-600">{item.label}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded ${item.bgColor} ${item.textColor} text-xs font-semibold`}>
                        {item.value}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`${item.color} h-full rounded-full transition-all duration-700`}
                        style={{ width: `${stats.totalCommandes > 0 ? (item.value / stats.totalCommandes) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* RÉCENTES COMMANDES */}
          <Card className="lg:col-span-2 border border-slate-100 shadow-sm overflow-hidden bg-white">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-3">
                  <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                  Dernières Activités
                </h2>
                <button
                  onClick={() => router.push('/client/historique')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                >
                  Voir tout
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {recentCommandes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-stone-400">
                    <History className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-bold">Aucune activité récente</p>
                    <p className="text-sm">Vos futures commandes apparaîtront ici.</p>
                  </div>
                ) : (
                  recentCommandes.map((commande, idx) => (
                    <button
                      key={commande.id}
                      onClick={() => router.push(`/client/historique`)}
                      className="group w-full p-6 rounded-3xl bg-white hover:bg-stone-50 border border-stone-100 hover:border-primary-100 shadow-sm transition-all text-left flex items-center justify-between gap-4 animate-slideInRight"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center group-hover:bg-white transition-colors relative">
                          <Package className="w-6 h-6 text-stone-600" />
                          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${commande.statut === 'en_attente' ? 'bg-amber-400' :
                            commande.statut === 'en_preparation' ? 'bg-blue-400' :
                              'bg-emerald-400'
                            }`}></div>
                        </div>
                        <div>
                          <p className="font-black text-stone-900 group-hover:text-primary-600 transition-colors">
                            Comm. #{commande.id.slice(0, 8).toUpperCase()}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-xs font-bold text-stone-500">
                              <Store className="w-3 h-3" />
                              {commande.commande_magasins?.length || 0} magasins
                            </span>
                            <span className="w-1 h-1 rounded-full bg-stone-300"></span>
                            <span className="text-xs font-bold text-stone-500">
                              {new Date(commande.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:block text-right">
                          <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border ${commande.statut === 'en_attente' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            commande.statut === 'en_preparation' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              commande.statut === 'envoyee' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                'bg-stone-50 text-stone-600 border-stone-100'
                            }`}>
                            {commande.statut.replace('_', ' ')}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* ACTIONS RAPIDES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => router.push('/client/magasins')}
            className="group relative overflow-hidden rounded-[2rem] bg-indigo-600 p-8 text-white shadow-xl hover:shadow-indigo-500/30 transition-all hover:-translate-y-1 active:scale-[0.98]"
          >
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black mb-2 flex items-center gap-3">
                  <Store className="w-8 h-8" />
                  Vos Magasins
                </h3>
                <p className="text-indigo-100/80 font-medium">Gérez la liste des points de vente Retail</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-white/30 transition-all">
                <ChevronRight className="w-8 h-8" />
              </div>
            </div>
            {/* Background design */}
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
          </button>

          <button
            onClick={() => router.push('/client/historique')}
            className="group relative overflow-hidden rounded-[2rem] bg-stone-900 p-8 text-white shadow-xl hover:shadow-stone-500/30 transition-all hover:-translate-y-1 active:scale-[0.98]"
          >
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black mb-2 flex items-center gap-3">
                  <History className="w-8 h-8" />
                  Historique
                </h3>
                <p className="text-stone-400 font-medium">Consultez vos archives et justificatifs</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-white/30 transition-all">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            </div>
            {/* Background design */}
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl group-hover:bg-primary-500/20 transition-all"></div>
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slideDown { animation: slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slideUp { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slideInRight { animation: slideInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </DashboardLayout>
  )
}
