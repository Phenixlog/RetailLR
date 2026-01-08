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
  const [magasins, setMagasins] = useState<(Magasin & { users?: User[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingMagasin, setEditingMagasin] = useState<(Magasin & { users?: User[] }) | null>(null)

  const [newMagasin, setNewMagasin] = useState({
    nom: '',
    code: '',
    ville: '',
    adresse: '',
    responsable: '',
    directeur_regional: '',
    // Accès utilisateur
    createAccess: false,
    userEmail: '',
    userPassword: 'test123456', // Par défaut
    userPrenom: '',
    userNom: '',
    userTel: '',
    userPerimetre: 'Magasin uniquement',
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

      const profile = await getUserProfile(currentUser.id) as any

      if (profile.role !== 'la_redoute' && profile.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      setUser(profile)

      const { data: magasinsData } = await supabase
        .from('magasins')
        .select('*, users(*)')
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
      alert('Veuillez remplir au moins le nom, le code et la ville')
      return
    }

    setSubmitting(true)

    try {
      let magasinId = ''

      if (editingMagasin) {
        const { error } = await supabase
          .from('magasins')
          .update({
            nom: newMagasin.nom,
            code: newMagasin.code,
            ville: newMagasin.ville,
            adresse: newMagasin.adresse || null,
            responsable: newMagasin.responsable || null,
            directeur_regional: newMagasin.directeur_regional || null,
          })
          .eq('id', editingMagasin.id)

        if (error) throw error
        magasinId = editingMagasin.id
      } else {
        const { data, error } = await supabase
          .from('magasins')
          .insert({
            nom: newMagasin.nom,
            code: newMagasin.code,
            ville: newMagasin.ville,
            adresse: newMagasin.adresse || null,
            responsable: newMagasin.responsable || null,
            directeur_regional: newMagasin.directeur_regional || null,
          })
          .select()
          .single()

        if (error) throw error
        magasinId = data.id
      }

      // Si on doit créer un accès utilisateur (nouveau ou existant sans accès)
      if (newMagasin.createAccess) {
        const accessResponse = await fetch('/api/admin/create-store-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: newMagasin.userEmail,
            password: newMagasin.userPassword,
            role: 'magasin',
            magasin_id: magasinId,
            nom: newMagasin.userNom,
            prenom: newMagasin.userPrenom,
            telephone: newMagasin.userTel,
            perimetre: newMagasin.userPerimetre
          })
        })

        if (!accessResponse.ok) {
          const res = await accessResponse.json()
          alert(`Magasin sauvegardé mais erreur pour l'accès: ${res.error}`)
        }
      }

      alert(editingMagasin ? 'Magasin mis à jour !' : 'Magasin ajouté avec succès !')
      handleCloseModal()
      loadMagasins()
    } catch (error: any) {
      console.error('Error saving magasin:', error)
      alert('Erreur: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleCloseModal() {
    setShowAddModal(false)
    setEditingMagasin(null)
    setNewMagasin({
      nom: '',
      code: '',
      ville: '',
      adresse: '',
      responsable: '',
      directeur_regional: '',
      createAccess: false,
      userEmail: '',
      userPassword: 'test123456',
      userPrenom: '',
      userNom: '',
      userTel: '',
      userPerimetre: 'Magasin uniquement',
    })
  }

  function handleEditMagasin(magasin: Magasin & { users?: User[] }) {
    const existingUser = magasin.users?.[0] || null

    setEditingMagasin(magasin)
    setNewMagasin({
      nom: magasin.nom,
      code: magasin.code,
      ville: magasin.ville,
      adresse: magasin.adresse || '',
      responsable: magasin.responsable || '',
      directeur_regional: magasin.directeur_regional || '',
      createAccess: false,
      userEmail: existingUser?.email || '',
      userPassword: 'test123456',
      userPrenom: existingUser?.prenom || '',
      userNom: existingUser?.nom || '',
      userTel: existingUser?.telephone || '',
      userPerimetre: existingUser?.perimetre || 'Magasin uniquement',
    })
    setShowAddModal(true)
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
                    className="w-full px-4 py-3 pl-12 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all font-medium"
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
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl font-bold shadow-lg shadow-primary-600/30 hover:shadow-xl hover:shadow-primary-600/40 transition-all whitespace-nowrap active:scale-95"
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
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
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
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditMagasin(magasin)}
                        className="p-2 rounded-lg text-stone-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                        title="Modifier le magasin"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
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
                  </div>
                  {/* Detailed Info (Optional Display) */}
                  {(magasin.responsable || magasin.directeur_regional || magasin.users?.[0]) && (
                    <div className="mt-4 pt-4 border-t border-stone-100 flex flex-wrap gap-4">
                      {magasin.responsable && (
                        <div className="text-xs">
                          <span className="block text-stone-400 font-bold uppercase tracking-tighter text-[9px]">Responsable Magasin</span>
                          <span className="text-stone-700 font-medium">{magasin.responsable}</span>
                        </div>
                      )}
                      {magasin.directeur_regional && (
                        <div className="text-xs">
                          <span className="block text-stone-400 font-bold uppercase tracking-tighter text-[9px]">Dir. Régional</span>
                          <span className="text-stone-700 font-medium">{magasin.directeur_regional}</span>
                        </div>
                      )}
                      {magasin.users?.[0] && (
                        <div className="text-xs">
                          <span className="block text-green-600 font-bold uppercase tracking-tighter text-[9px]">Accès Créé</span>
                          <span className="text-stone-500 font-medium">{magasin.users[0].email}</span>
                        </div>
                      )}
                    </div>
                  )}
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

      {/* Modal Ajout/Edition Magasin */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <Card variant="elevated" className="w-full max-w-2xl animate-slideUp my-auto">
            <CardHeader className="border-b border-stone-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">
                    {editingMagasin ? `Modifier ${editingMagasin.nom}` : 'Ajouter un magasin'}
                  </CardTitle>
                  <p className="text-sm text-stone-500 mt-1">Saisissez les informations détaillées du magasin</p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Section Magasin */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-stone-800 uppercase tracking-wider">Identité Magasin</h4>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 mb-1 uppercase tracking-widest">Nom du magasin *</label>
                      <input
                        type="text"
                        value={newMagasin.nom}
                        onChange={(e) => setNewMagasin({ ...newMagasin, nom: e.target.value })}
                        placeholder="La Redoute Lille"
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-400 mb-1 uppercase tracking-widest">Code Magasin *</label>
                        <input
                          type="text"
                          value={newMagasin.code}
                          onChange={(e) => setNewMagasin({ ...newMagasin, code: e.target.value })}
                          placeholder="MAG_045"
                          className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-mono text-sm uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-stone-400 mb-1 uppercase tracking-widest">Ville *</label>
                        <input
                          type="text"
                          value={newMagasin.ville}
                          onChange={(e) => setNewMagasin({ ...newMagasin, ville: e.target.value })}
                          placeholder="Lille"
                          className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 mb-1 uppercase tracking-widest">Adresse Complète</label>
                      <input
                        type="text"
                        value={newMagasin.adresse}
                        onChange={(e) => setNewMagasin({ ...newMagasin, adresse: e.target.value })}
                        placeholder="12 rue de la Paix, 59000 Lille"
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 mb-1 uppercase tracking-widest">Responsable Magasin</label>
                      <input
                        type="text"
                        value={newMagasin.responsable}
                        onChange={(e) => setNewMagasin({ ...newMagasin, responsable: e.target.value })}
                        placeholder="Jean-Marc Durant"
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 mb-1 uppercase tracking-widest">Directeur Régional</label>
                      <input
                        type="text"
                        value={newMagasin.directeur_regional}
                        onChange={(e) => setNewMagasin({ ...newMagasin, directeur_regional: e.target.value })}
                        placeholder="Sophie Martin"
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Section Accès */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-accent-100 flex items-center justify-center text-accent-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-stone-800 uppercase tracking-wider">Accès Utilisateur</h4>
                  </div>

                  {(!editingMagasin || (editingMagasin && !editingMagasin.users?.length)) ? (
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 space-y-4">
                      <label className="flex items-center gap-3 pb-4 border-b border-stone-200/60 cursor-pointer select-none">
                        <div className="relative inline-flex items-center">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={newMagasin.createAccess}
                            onChange={(e) => setNewMagasin({ ...newMagasin, createAccess: e.target.checked })}
                          />
                          <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </div>
                        <span className="text-sm font-bold text-stone-700">Créer un profil d'accès</span>
                      </label>

                      {newMagasin.createAccess && (
                        <div className="space-y-4 animate-fadeIn">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-stone-400 mb-1 uppercase">Prénom</label>
                              <input
                                type="text"
                                value={newMagasin.userPrenom}
                                onChange={(e) => setNewMagasin({ ...newMagasin, userPrenom: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:border-primary-500 transition-all font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-stone-400 mb-1 uppercase">Nom</label>
                              <input
                                type="text"
                                value={newMagasin.userNom}
                                onChange={(e) => setNewMagasin({ ...newMagasin, userNom: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:border-primary-500 transition-all font-medium"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-stone-400 mb-1 uppercase">Email professionnel</label>
                            <input
                              type="email"
                              value={newMagasin.userEmail}
                              onChange={(e) => setNewMagasin({ ...newMagasin, userEmail: e.target.value })}
                              placeholder="magasin@laredoute.fr"
                              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:border-primary-500 transition-all font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-stone-400 mb-1 uppercase">Téléphone Direct</label>
                            <input
                              type="tel"
                              value={newMagasin.userTel}
                              onChange={(e) => setNewMagasin({ ...newMagasin, userTel: e.target.value })}
                              placeholder="01 23 45 67 89"
                              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:border-primary-500 transition-all font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-stone-400 mb-1 uppercase">Périmètre d'action</label>
                            <select
                              value={newMagasin.userPerimetre}
                              onChange={(e) => setNewMagasin({ ...newMagasin, userPerimetre: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:border-primary-500 transition-all font-medium appearance-none"
                            >
                              <option>Magasin uniquement</option>
                              <option>Magasin + Rayon Femme</option>
                              <option>Magasin + Rayon Homme</option>
                              <option>Magasin + Maison</option>
                              <option>Admin Régional</option>
                            </select>
                          </div>
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-[10px] text-amber-700 leading-tight">
                              <span className="font-bold">Note :</span> Le mot de passe par défaut est <code className="font-bold">test123456</code>.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-6 flex flex-col items-center text-center animate-fadeIn">
                      <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mb-4 shadow-sm shadow-green-200">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <p className="text-sm font-bold text-stone-800 mb-1 uppercase tracking-tight">Accès Déjà Créé</p>
                      <div className="space-y-1 mb-4">
                        <p className="text-xs text-stone-500 font-medium">{newMagasin.userEmail}</p>
                        <p className="text-xs text-stone-500">{newMagasin.userPrenom} {newMagasin.userNom}</p>
                      </div>
                      <div className="w-full pt-4 border-t border-stone-200 mt-2">
                        <p className="text-[10px] text-stone-400 italic">
                          L'accès est actif. Pour toute modification majeure, contactez l'administrateur.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 mt-10 pt-6 border-t border-stone-100">
                <button
                  onClick={handleCloseModal}
                  className="px-8 py-3.5 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-all active:scale-95 text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddMagasin}
                  disabled={submitting}
                  className="flex-1 px-8 py-3.5 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl font-bold shadow-xl shadow-primary-600/20 hover:shadow-2xl hover:shadow-primary-600/40 transition-all active:scale-95 disabled:opacity-50 text-sm"
                >
                  {submitting ? 'Enregistrement en cours...' : editingMagasin ? 'Mettre à jour le magasin' : 'Créer le magasin et les accès'}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  )
}
