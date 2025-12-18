'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import type { User } from '@/types/database.types'

interface EmailTracking {
  id: string
  commande_id: string
  subject: string
  body: string
  email_type: string
  statut_reponse: string
  destinataire_email: string
  created_at: string
  date_reponse: string | null
  note_reponse: string | null
  prochaine_relance_at: string | null
  commande_statut: string
}

export default function EmailsTrackingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [emails, setEmails] = useState<EmailTracking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmail, setSelectedEmail] = useState<EmailTracking | null>(null)
  const [showContentModal, setShowContentModal] = useState(false)
  const [showResponseModal, setShowResponseModal] = useState(false)
  const [responseStatus, setResponseStatus] = useState<string>('confirme')
  const [responseNote, setResponseNote] = useState('')
  const [savingResponse, setSavingResponse] = useState(false)

  // Filtres
  const [filterStatut, setFilterStatut] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
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
        if (profile.role !== 'admin') {
          router.push('/dashboard')
          return
        }

        setUser(profile)

        // Charger tous les emails avec les informations de commande
        const { data: emailsData, error } = await supabase
          .from('emails_sent')
          .select(`
            id,
            commande_id,
            subject,
            body,
            email_type,
            statut_reponse,
            destinataire_email,
            created_at,
            date_reponse,
            note_reponse,
            prochaine_relance_at,
            commandes (
              statut
            )
          `)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Formater les données
        const formattedEmails = emailsData?.map((email: any) => ({
          ...email,
          commande_statut: email.commandes?.statut || 'N/A'
        })) || []

        setEmails(formattedEmails)
      } catch (error) {
        console.error('Error loading emails:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  async function handleSaveResponse() {
    if (!selectedEmail) return

    setSavingResponse(true)
    try {
      const { error } = await supabase
        .from('emails_sent')
        .update({
          statut_reponse: responseStatus,
          note_reponse: responseNote,
          date_reponse: new Date().toISOString(),
          prochaine_relance_at: null // Annuler les relances
        })
        .eq('id', selectedEmail.id)

      if (error) throw error

      // Recharger les données
      const { data: updatedEmails } = await supabase
        .from('emails_sent')
        .select(`
          id,
          commande_id,
          subject,
          body,
          email_type,
          statut_reponse,
          destinataire_email,
          created_at,
          date_reponse,
          note_reponse,
          prochaine_relance_at,
          commandes (statut)
        `)
        .order('created_at', { ascending: false })

      const formattedEmails = updatedEmails?.map((email: any) => ({
        ...email,
        commande_statut: email.commandes?.statut || 'N/A'
      })) || []

      setEmails(formattedEmails)
      setShowResponseModal(false)
      setResponseNote('')
    } catch (error: any) {
      console.error('Error saving response:', error)
      alert('Erreur lors de l\'enregistrement: ' + error.message)
    } finally {
      setSavingResponse(false)
    }
  }

  async function handleRelancer(email: EmailTracking) {
    if (!confirm('Voulez-vous envoyer une relance pour cet email ?')) {
      return
    }

    try {
      // Déterminer le type de relance
      let newEmailType = 'relance_1'
      if (email.email_type === 'relance_1') newEmailType = 'relance_2'
      else if (email.email_type === 'relance_2') newEmailType = 'relance_3'

      // Créer un nouvel email de relance
      const { error } = await supabase.from('emails_sent').insert({
        commande_id: email.commande_id,
        subject: `[RELANCE] ${email.subject}`,
        body: email.body, // Même contenu (on pourrait modifier)
        sent_by: user!.id,
        email_type: newEmailType,
        statut_reponse: 'en_attente',
        destinataire_email: email.destinataire_email,
        relance: true
      })

      if (error) throw error

      alert('✅ Relance envoyée avec succès !')

      // Recharger les données
      const { data: updatedEmails } = await supabase
        .from('emails_sent')
        .select(`
          id,
          commande_id,
          subject,
          body,
          email_type,
          statut_reponse,
          destinataire_email,
          created_at,
          date_reponse,
          note_reponse,
          prochaine_relance_at,
          commandes (statut)
        `)
        .order('created_at', { ascending: false })

      const formattedEmails = updatedEmails?.map((e: any) => ({
        ...e,
        commande_statut: e.commandes?.statut || 'N/A'
      })) || []

      setEmails(formattedEmails)
    } catch (error: any) {
      console.error('Error sending relance:', error)
      alert('Erreur lors de l\'envoi de la relance: ' + error.message)
    }
  }

  // Filtrer les emails
  const filteredEmails = emails.filter(email => {
    // Filtre par statut
    if (filterStatut !== 'all' && email.statut_reponse !== filterStatut) {
      return false
    }

    // Filtre par type
    if (filterType !== 'all' && email.email_type !== filterType) {
      return false
    }

    // Recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        email.destinataire_email?.toLowerCase().includes(query) ||
        email.commande_id.toLowerCase().includes(query) ||
        email.subject.toLowerCase().includes(query)
      )
    }

    return true
  })

  // Statistiques
  const stats = {
    total: emails.length,
    en_attente: emails.filter(e => e.statut_reponse === 'en_attente').length,
    confirme: emails.filter(e => e.statut_reponse === 'confirme').length,
    besoin_relance: emails.filter(e => {
      if (!e.prochaine_relance_at) return false
      return new Date(e.prochaine_relance_at) <= new Date()
    }).length
  }

  function getStatutBadge(statut: string) {
    const styles = {
      en_attente: 'bg-amber-100 text-amber-800 border-amber-300',
      confirme: 'bg-green-100 text-green-800 border-green-300',
      refuse: 'bg-red-100 text-red-800 border-red-300',
      ignore: 'bg-gray-100 text-gray-800 border-gray-300'
    }

    const labels = {
      en_attente: '⏳ En attente',
      confirme: '✅ Confirmé',
      refuse: '❌ Refusé',
      ignore: '🔇 Ignoré'
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[statut as keyof typeof styles] || styles.en_attente}`}>
        {labels[statut as keyof typeof labels] || statut}
      </span>
    )
  }

  function getTypeBadge(type: string) {
    const styles = {
      initial: 'bg-blue-100 text-blue-800',
      relance_1: 'bg-orange-100 text-orange-800',
      relance_2: 'bg-red-100 text-red-800',
      relance_3: 'bg-purple-100 text-purple-800'
    }

    const labels = {
      initial: '📧 Initial',
      relance_1: '🔔 Relance 1',
      relance_2: '🔔🔔 Relance 2',
      relance_3: '🔔🔔🔔 Relance 3'
    }

    return (
      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${styles[type as keyof typeof styles] || styles.initial}`}>
        {labels[type as keyof typeof labels] || type}
      </span>
    )
  }

  function needsRelance(email: EmailTracking): boolean {
    if (!email.prochaine_relance_at || email.statut_reponse !== 'en_attente') {
      return false
    }
    return new Date(email.prochaine_relance_at) <= new Date()
  }

  if (loading || !user) {
    return <PageLoader />
  }

  return (
    <DashboardLayout user={user} title="Suivi des Emails">
      <div className="space-y-6">
        {/* Header avec stats */}
        <div className="flex items-center justify-between animate-slideDown">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              Suivi des Emails
            </h1>
            <p className="text-stone-600 mt-1">Tracez tous les emails envoyés et gérez les relances</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-slideUp">
          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-stone-600">Total</p>
                  <p className="text-2xl font-bold text-stone-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-stone-600">En attente</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.en_attente}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-stone-600">Confirmés</p>
                  <p className="text-2xl font-bold text-green-600">{stats.confirme}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-stone-600">À relancer</p>
                  <p className="text-2xl font-bold text-red-600">{stats.besoin_relance}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres et recherche */}
        <Card variant="elevated" className="animate-slideUp" style={{animationDelay: '100ms'}}>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Rechercher</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Email, commande, sujet..."
                  className="w-full border-2 border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Statut réponse</label>
                <select
                  value={filterStatut}
                  onChange={(e) => setFilterStatut(e.target.value)}
                  className="w-full border-2 border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 transition-colors"
                >
                  <option value="all">Tous</option>
                  <option value="en_attente">En attente</option>
                  <option value="confirme">Confirmé</option>
                  <option value="refuse">Refusé</option>
                  <option value="ignore">Ignoré</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Type d'email</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full border-2 border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 transition-colors"
                >
                  <option value="all">Tous</option>
                  <option value="initial">Initial</option>
                  <option value="relance_1">Relance 1</option>
                  <option value="relance_2">Relance 2</option>
                  <option value="relance_3">Relance 3</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterStatut('all')
                    setFilterType('all')
                    setSearchQuery('')
                  }}
                  className="w-full px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition-colors"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tableau des emails */}
        <Card variant="elevated" className="animate-slideUp" style={{animationDelay: '200ms'}}>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b-2 border-stone-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Destinataire</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Commande</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase">Relance prévue</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-stone-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredEmails.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                        Aucun email trouvé
                      </td>
                    </tr>
                  ) : (
                    filteredEmails.map((email) => (
                      <tr key={email.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-4 py-4 text-sm text-stone-600">
                          {new Date(email.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                          <br />
                          <span className="text-xs text-stone-400">
                            {new Date(email.created_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-stone-900">
                            {email.destinataire_email || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => router.push(`/admin/commandes/${email.commande_id}`)}
                            className="text-sm font-mono text-primary-600 hover:text-primary-800 hover:underline"
                          >
                            #{email.commande_id.slice(0, 8)}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          {getTypeBadge(email.email_type)}
                        </td>
                        <td className="px-4 py-4">
                          {getStatutBadge(email.statut_reponse)}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {email.prochaine_relance_at ? (
                            <div className={needsRelance(email) ? 'text-red-600 font-semibold' : 'text-stone-600'}>
                              {new Date(email.prochaine_relance_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short'
                              })}
                              {needsRelance(email) && ' ⚠️'}
                            </div>
                          ) : (
                            <span className="text-stone-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedEmail(email)
                                setShowContentModal(true)
                              }}
                              className="p-2 hover:bg-stone-100 rounded-lg transition-colors group"
                              title="Voir le contenu"
                            >
                              <svg className="w-5 h-5 text-stone-600 group-hover:text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>

                            {email.statut_reponse === 'en_attente' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedEmail(email)
                                    setResponseStatus('confirme')
                                    setShowResponseModal(true)
                                  }}
                                  className="p-2 hover:bg-green-50 rounded-lg transition-colors group"
                                  title="Marquer réponse"
                                >
                                  <svg className="w-5 h-5 text-stone-600 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>

                                <button
                                  onClick={() => handleRelancer(email)}
                                  className={`p-2 rounded-lg transition-colors group ${
                                    needsRelance(email)
                                      ? 'bg-red-50 hover:bg-red-100'
                                      : 'hover:bg-orange-50'
                                  }`}
                                  title="Envoyer relance"
                                >
                                  <svg className={`w-5 h-5 ${
                                    needsRelance(email)
                                      ? 'text-red-600'
                                      : 'text-stone-600 group-hover:text-orange-600'
                                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
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

      {/* Modal - Voir contenu */}
      <Modal
        isOpen={showContentModal}
        onClose={() => setShowContentModal(false)}
        title="Contenu de l'email"
        size="lg"
      >
        {selectedEmail && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">Destinataire</label>
              <p className="text-sm text-stone-600">{selectedEmail.destinataire_email}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">Objet</label>
              <p className="text-sm text-stone-900">{selectedEmail.subject}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Contenu HTML</label>
              <div className="border-2 border-stone-200 rounded-xl p-4 bg-stone-50 max-h-96 overflow-y-auto">
                <div
                  className="prose prose-sm max-w-none bg-white p-4 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal - Marquer réponse */}
      <Modal
        isOpen={showResponseModal}
        onClose={() => setShowResponseModal(false)}
        title="Enregistrer la réponse"
      >
        {selectedEmail && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-stone-600 mb-4">
                Email envoyé à <strong>{selectedEmail.destinataire_email}</strong> le{' '}
                {new Date(selectedEmail.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Statut de la réponse</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setResponseStatus('confirme')}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                    responseStatus === 'confirme'
                      ? 'bg-green-100 text-green-800 border-2 border-green-500'
                      : 'bg-stone-100 text-stone-700 border-2 border-stone-200 hover:border-green-300'
                  }`}
                >
                  ✅ Confirmé
                </button>
                <button
                  onClick={() => setResponseStatus('refuse')}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                    responseStatus === 'refuse'
                      ? 'bg-red-100 text-red-800 border-2 border-red-500'
                      : 'bg-stone-100 text-stone-700 border-2 border-stone-200 hover:border-red-300'
                  }`}
                >
                  ❌ Refusé
                </button>
                <button
                  onClick={() => setResponseStatus('ignore')}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                    responseStatus === 'ignore'
                      ? 'bg-gray-100 text-gray-800 border-2 border-gray-500'
                      : 'bg-stone-100 text-stone-700 border-2 border-stone-200 hover:border-gray-300'
                  }`}
                >
                  🔇 Ignoré
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Note (optionnel)</label>
              <textarea
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                rows={4}
                placeholder="Ajoutez des détails sur la réponse du client..."
                className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-stone-200">
              <button
                onClick={() => setShowResponseModal(false)}
                className="px-5 py-2.5 border-2 border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveResponse}
                disabled={savingResponse}
                className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {savingResponse ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
