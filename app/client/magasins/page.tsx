'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import type { User, Magasin } from '@/types/database.types'

export default function MagasinsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [magasins, setMagasins] = useState<Magasin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newMagasin, setNewMagasin] = useState({
    nom: '',
    code: '',
    ville: '',
  })

  useEffect(() => {
    loadMagasins()
  }, [router])

  async function loadMagasins() {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/login')
        return
      }

      const profile = await getUserProfile(currentUser.id)

      if (profile.role !== 'la_redoute') {
        router.push('/dashboard')
        return
      }

      setUser(profile)

      const { data: magasinsData } = await supabase
        .from('magasins')
        .select('*')
        .order('nom')

      setMagasins(magasinsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddMagasin() {
    if (!newMagasin.nom || !newMagasin.code || !newMagasin.ville) {
      alert('Veuillez remplir tous les champs')
      return
    }

    setSubmitting(true)

    try {
      const { error } = await supabase
        .from('magasins')
        .insert({
          nom: newMagasin.nom,
          code: newMagasin.code,
          ville: newMagasin.ville,
        })

      if (error) throw error

      alert('Magasin ajouté avec succès !')
      setNewMagasin({ nom: '', code: '', ville: '' })
      setShowAddModal(false)
      loadMagasins()
    } catch (error: any) {
      console.error('Error adding magasin:', error)
      alert('Erreur lors de l\'ajout du magasin: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteMagasin(magasinId: string, magasinNom: string) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le magasin "${magasinNom}" ?\n\nAttention: Cette action est irréversible.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('magasins')
        .delete()
        .eq('id', magasinId)

      if (error) throw error

      alert('Magasin supprimé avec succès !')
      loadMagasins()
    } catch (error: any) {
      console.error('Error deleting magasin:', error)
      alert('Erreur lors de la suppression du magasin: ' + error.message)
    }
  }

  if (loading || !user) {
    return <PageLoader />
  }

  const filteredMagasins = magasins.filter(magasin => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return magasin.nom.toLowerCase().includes(query) ||
           magasin.code.toLowerCase().includes(query) ||
           magasin.ville.toLowerCase().includes(query)
  })

  return (
    <DashboardLayout user={user} title="Magasins">
      <div className="space-y-6">
        {/* Header with search and add button */}
        <Card variant="elevated" className="animate-slideDown">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-stone-900">Liste des magasins</h2>
                <p className="text-sm text-stone-500 mt-1">
                  {filteredMagasins.length} magasin{filteredMagasins.length > 1 ? 's' : ''} trouvé{filteredMagasins.length > 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    placeholder="Rechercher un magasin..."
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
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all whitespace-nowrap"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter un magasin
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Magasins Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMagasins.length === 0 ? (
            <div className="col-span-full">
              <Card variant="elevated">
                <CardContent className="p-12">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-stone-100 to-stone-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-stone-900 mb-1">Aucun magasin trouvé</p>
                    <p className="text-sm text-stone-500">Essayez un autre terme de recherche</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredMagasins.map((magasin, idx) => (
              <Card
                key={magasin.id}
                variant="elevated"
                className="animate-slideUp hover:shadow-xl transition-all duration-200 group"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                      {magasin.nom.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-stone-900 mb-1 truncate">
                        {magasin.nom}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{magasin.ville}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4 flex-shrink-0 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                          <code className="px-2 py-1 bg-stone-100 rounded font-mono text-xs font-semibold text-stone-700">
                            {magasin.code}
                          </code>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMagasin(magasin.id, magasin.nom)}
                      className="p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      title="Supprimer le magasin"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Stats Card */}
        <Card variant="elevated" className="animate-slideUp" style={{ animationDelay: '300ms' }}>
          <CardHeader>
            <CardTitle>Statistiques des magasins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-stone-50 to-stone-100 rounded-xl border border-stone-200">
                <p className="text-3xl font-bold text-stone-900 mb-2">{magasins.length}</p>
                <p className="text-sm text-stone-600 font-medium">Total magasins</p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-stone-50 to-stone-100 rounded-xl border border-stone-200">
                <p className="text-3xl font-bold text-stone-900 mb-2">
                  {new Set(magasins.map(m => m.ville)).size}
                </p>
                <p className="text-sm text-stone-600 font-medium">Villes couvertes</p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-stone-50 to-stone-100 rounded-xl border border-stone-200">
                <p className="text-3xl font-bold text-stone-900 mb-2">{filteredMagasins.length}</p>
                <p className="text-sm text-stone-600 font-medium">Résultats affichés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Ajout Magasin */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <Card variant="elevated" className="w-full max-w-md animate-slideUp">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Ajouter un magasin</CardTitle>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    Nom du magasin
                  </label>
                  <input
                    type="text"
                    value={newMagasin.nom}
                    onChange={(e) => setNewMagasin({ ...newMagasin, nom: e.target.value })}
                    placeholder="Ex: Magasin Paris Centre"
                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    Code du magasin
                  </label>
                  <input
                    type="text"
                    value={newMagasin.code}
                    onChange={(e) => setNewMagasin({ ...newMagasin, code: e.target.value })}
                    placeholder="Ex: MAG001"
                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={newMagasin.ville}
                    onChange={(e) => setNewMagasin({ ...newMagasin, ville: e.target.value })}
                    placeholder="Ex: Paris"
                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 bg-stone-100 text-stone-700 rounded-xl font-semibold hover:bg-stone-200 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddMagasin}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  )
}
