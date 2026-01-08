'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import type { User } from '@/types/database.types'

export default function AdminOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [commande, setCommande] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [generatingEmail, setGeneratingEmail] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [photos, setPhotos] = useState<any[]>([])
  const [emailContent, setEmailContent] = useState('')
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showSuccessNotif, setShowSuccessNotif] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [notifType, setNotifType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push('/login')
          return
        }

        const profile = await getUserProfile(currentUser.id) as any
        if (profile.role !== 'admin') {
          router.push('/dashboard')
          return
        }

        setUser(profile)

        // Charger la commande
        const { data: commandeData, error } = await supabase
          .from('commandes')
          .select(`
            id, statut, created_at, user_id,
            users!commandes_user_id_fkey (email, role),
            commande_magasins (
              magasin_id,
              magasins (id, nom, code, ville)
            ),
            commande_produits (
              quantite,
              produit_id,
              produits (id, nom, reference, description)
            ),
            commande_magasin_produits (
              magasin_id,
              produit_id,
              quantite
            )
          `)
          .eq('id', orderId)
          .single()

        if (error) throw error
        setCommande(commandeData)

        // Charger les photos
        const { data: photosData } = await supabase
          .from('photos')
          .select('*')
          .eq('commande_id', orderId)
          .order('created_at', { ascending: false })

        setPhotos(photosData || [])
      } catch (error) {
        console.error('Error loading data:', error)
        router.push('/admin')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, orderId])

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${orderId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('order-photos')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        // Save to database
        const { error: dbError } = await supabase
          .from('photos')
          .insert({
            commande_id: orderId,
            file_path: fileName,
            uploaded_by: user!.id,
          })

        if (dbError) throw dbError
      }

      // Reload photos
      const { data: photosData } = await supabase
        .from('photos')
        .select('*')
        .eq('commande_id', orderId)
        .order('created_at', { ascending: false })

      setPhotos(photosData || [])

      // Show success notification
      setNotifType('success')
      setSuccessMessage(`✅ ${Array.from(files).length} photo(s) uploadée(s) avec succès !`)
      setShowSuccessNotif(true)
      setTimeout(() => setShowSuccessNotif(false), 4000)
    } catch (error: any) {
      console.error('Error uploading photos:', error)

      // Show error notification
      setNotifType('error')
      setSuccessMessage(`❌ Erreur lors de l'upload: ${error.message}`)
      setShowSuccessNotif(true)
      setTimeout(() => setShowSuccessNotif(false), 5000)
    } finally {
      setUploading(false)
    }
  }

  async function handleDeletePhoto(photoId: string, filePath: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
      return
    }

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('order-photos')
        .remove([filePath])

      if (storageError) throw storageError

      // Delete from database
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId)

      if (dbError) throw dbError

      // Update local state
      setPhotos(photos.filter(p => p.id !== photoId))

      // Show success notification
      setNotifType('success')
      setSuccessMessage('✅ Photo supprimée avec succès !')
      setShowSuccessNotif(true)
      setTimeout(() => setShowSuccessNotif(false), 3000)
    } catch (error: any) {
      console.error('Error deleting photo:', error)

      // Show error notification
      setNotifType('error')
      setSuccessMessage(`❌ Erreur lors de la suppression: ${error.message}`)
      setShowSuccessNotif(true)
      setTimeout(() => setShowSuccessNotif(false), 5000)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    handleFileUpload(files)
  }

  async function handleGenerateEmail() {
    setGeneratingEmail(true)
    try {
      // Prepare photo URLs
      const photoUrls = photos.map(photo =>
        supabase.storage.from('order-photos').getPublicUrl(photo.file_path).data.publicUrl
      )

      // Map status to French
      const statusMap: Record<string, string> = {
        en_attente: 'en attente de traitement',
        confirmee: 'confirmée',
        en_preparation: 'en cours de préparation',
        envoyee: 'envoyée'
      }

      // Try OpenRouter API first (if available)
      const openrouterKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY

      if (openrouterKey) {
        const prompt = `Tu es un assistant qui génère des emails professionnels pour Phenix Log, une entreprise de logistique.

Voici les détails de la commande :
- ID: ${commande.id.slice(0, 8)}
- Statut: ${statusMap[commande.statut] || commande.statut}
- Client: ${commande.users?.email || 'N/A'}
- Nombre de magasins: ${commande.commande_magasins.length}
- Nombre de produits: ${commande.commande_produits.length}
- Nombre de photos: ${photos.length}

Magasins concernés:
${commande.commande_magasins.map((cm: any) => `- ${cm.magasins.nom} (${cm.magasins.code}) - ${cm.magasins.ville}`).join('\n')}

Produits commandés:
${commande.commande_produits.map((cp: any) => `- ${cp.produits.nom} (${cp.produits.reference}) - Quantité: ${cp.quantite}`).join('\n')}

IMPORTANT - CHARTE GRAPHIQUE PHENIX LOG:
- Header avec gradient: background: linear-gradient(135deg, #ff3366 0%, #ff7b3d 100%)
- Couleurs principales: #ff3366 (rose) et #ff7b3d (orange)
- Police: Arial, sans-serif
- Couleurs texte: #374151 (gris foncé), #6b7280 (gris moyen)
- Backgrounds: #f9fafb (gris très clair), #ffffff (blanc)

Génère un email professionnel en HTML avec ces contraintes:
1. Header avec le gradient Phenix Log et titre blanc "Mise à jour de votre commande"
2. Section info commande avec numéro et statut
3. Tableaux/listes stylés pour magasins et produits
4. Design responsive (max-width: 600px)
5. Styles inline uniquement (pas de CSS externe)
6. Signature: "L'équipe Phenix Log" avec le gradient en texte si possible
7. Footer gris avec disclaimer automatique

NE MENTIONNE PAS les photos dans le HTML - elles seront ajoutées automatiquement après.

Format: HTML complet avec DOCTYPE, styles inline, optimisé pour clients email (Outlook, Gmail, etc.)`

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openrouterKey}`,
            'HTTP-Referer': 'https://phenixlog.com',
            'X-Title': 'Phenix Log - Email Generator'
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o',
            messages: [{
              role: 'user',
              content: prompt
            }],
            temperature: 0.7,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          let generatedEmail = data.choices[0].message.content

          // Clean up any markdown code blocks if present
          generatedEmail = generatedEmail.replace(/```html\n?/g, '').replace(/```\n?/g, '')

          // Add photos to email if available - BEFORE closing </body> tag
          if (photos.length > 0) {
            const photosHtml = `
              <div style="margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 8px;">
                <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 18px;">📸 Photos de la commande (${photos.length})</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                  ${photoUrls.map(url => `
                    <img src="${url}" alt="Photo commande" style="width: 100%; max-width: 300px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                  `).join('')}
                </div>
              </div>
            `

            // Insert photos BEFORE </body> tag, or before closing </table> if no </body>
            if (generatedEmail.includes('</body>')) {
              generatedEmail = generatedEmail.replace('</body>', `${photosHtml}</body>`)
            } else if (generatedEmail.includes('</table>')) {
              generatedEmail = generatedEmail.replace(/<\/table>(\s*)<\/html>/i, `</table>${photosHtml}$1</html>`)
            } else {
              // Fallback: append before </html>
              generatedEmail = generatedEmail.replace('</html>', `${photosHtml}</html>`)
            }
          }

          setEmailContent(generatedEmail)
          setShowEmailModal(true)
          return
        }
      }

      // Fallback to template if OpenRouter fails or not configured
      throw new Error('OpenRouter not available')

    } catch (error: any) {
      console.error('Error generating email:', error)

      // Professional fallback template
      const statusMap: Record<string, string> = {
        en_attente: 'en attente de traitement',
        confirmee: 'confirmée',
        en_preparation: 'en cours de préparation',
        envoyee: 'envoyée'
      }

      const photoUrls = photos.map(photo =>
        supabase.storage.from('order-photos').getPublicUrl(photo.file_path).data.publicUrl
      )

      const fallbackEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ff3366 0%, #ff7b3d 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Mise à jour de votre commande</h1>
  </div>

  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <p style="margin: 0 0 10px 0;"><strong>Numéro de commande :</strong> #${commande.id.slice(0, 8)}</p>
    <p style="margin: 0;"><strong>Statut :</strong> <span style="background: #dcfce7; padding: 4px 12px; border-radius: 12px; color: #166534; font-weight: 600;">${statusMap[commande.statut] || commande.statut}</span></p>
  </div>

  <p>Bonjour,</p>
  <p>Nous vous informons que votre commande est actuellement <strong>${statusMap[commande.statut] || commande.statut}</strong>.</p>

  <h3 style="color: #1f2937; margin-top: 30px;">📍 Magasins concernés (${commande.commande_magasins.length})</h3>
  <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
    ${commande.commande_magasins.map((cm: any) => `
      <div style="padding: 10px; background: white; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid #ff3366;">
        <strong>${cm.magasins.nom}</strong><br>
        <span style="color: #6b7280; font-size: 14px;">${cm.magasins.ville} • ${cm.magasins.code}</span>
      </div>
    `).join('')}
  </div>

  <h3 style="color: #1f2937; margin-top: 30px;">📦 Produits commandés (${commande.commande_produits.length})</h3>
  <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden;">
    <thead>
      <tr style="background: #e5e7eb;">
        <th style="padding: 12px; text-align: left; font-size: 14px;">Produit</th>
        <th style="padding: 12px; text-align: left; font-size: 14px;">Référence</th>
        <th style="padding: 12px; text-align: center; font-size: 14px;">Quantité</th>
      </tr>
    </thead>
    <tbody>
      ${commande.commande_produits.map((cp: any) => `
        <tr style="border-top: 1px solid #e5e7eb;">
          <td style="padding: 12px; font-weight: 600;">${cp.produits.nom}</td>
          <td style="padding: 12px; color: #6b7280; font-family: monospace;">${cp.produits.reference}</td>
          <td style="padding: 12px; text-align: center;"><span style="background: linear-gradient(135deg, #ff3366 0%, #ff7b3d 100%); color: white; padding: 4px 12px; border-radius: 6px; font-weight: bold;">${cp.quantite}</span></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  ${photos.length > 0 ? `
    <h3 style="color: #1f2937; margin-top: 30px;">📸 Photos de la commande (${photos.length})</h3>
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 15px;">
      ${photoUrls.map(url => `
        <img src="${url}" alt="Photo commande" style="width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
      `).join('')}
    </div>
  ` : ''}

  <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
    <p>Pour toute question concernant votre commande, n'hésitez pas à nous contacter.</p>
    <p style="margin-top: 30px;">
      Cordialement,<br>
      <strong style="background: linear-gradient(135deg, #ff3366 0%, #ff7b3d 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 18px;">L'équipe Phenix Log</strong>
    </p>
  </div>

  <div style="margin-top: 30px; padding: 15px; background: #f3f4f6; border-radius: 8px; font-size: 12px; color: #6b7280; text-align: center;">
    <p style="margin: 0;">Cet email a été généré automatiquement. Merci de ne pas y répondre directement.</p>
  </div>
</body>
</html>
      `
      setEmailContent(fallbackEmail)
      setShowEmailModal(true)
    } finally {
      setGeneratingEmail(false)
    }
  }

  async function handleSendEmail() {
    setSendingEmail(true)
    try {
      const emailSubject = `Mise à jour de votre commande #${commande.id.slice(0, 8)}`
      const destinataire = commande.users?.email

      if (!destinataire) {
        throw new Error('Aucun email destinataire trouvé pour cette commande')
      }

      // Envoyer l'email via Resend API
      const sendResponse = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: destinataire,
          subject: emailSubject,
          html: emailContent,
          from: process.env.EMAIL_FROM || 'noreply@phenixlog.com'
        })
      })

      const sendResult = await sendResponse.json()

      if (!sendResponse.ok) {
        throw new Error(sendResult.error || 'Erreur lors de l\'envoi de l\'email')
      }

      // Enregistrer en base de données après envoi réussi
      const { error: dbError } = await supabase.from('emails_sent').insert({
        commande_id: commande.id,
        subject: emailSubject,
        body: emailContent,
        sent_by: user!.id,
        relance: false,
        email_type: 'initial',
        statut_reponse: 'en_attente',
        destinataire_email: destinataire
      })

      if (dbError) {
        console.error('Database error (email was sent):', dbError)
        // L'email a été envoyé, mais pas enregistré en base
        // On continue quand même pour informer l'utilisateur
      }

      setShowEmailModal(false)

      // Show success notification
      setNotifType('success')
      setSuccessMessage(`✅ Email envoyé avec succès !\n📧 Destinataire: ${destinataire}\n🚀 L'email a été délivré`)
      setShowSuccessNotif(true)
      setTimeout(() => setShowSuccessNotif(false), 5000)
    } catch (error: any) {
      console.error('Error sending email:', error)

      // Show error notification
      setNotifType('error')
      setSuccessMessage(`❌ Erreur lors de l'envoi: ${error.message}`)
      setShowSuccessNotif(true)
      setTimeout(() => setShowSuccessNotif(false), 5000)
    } finally {
      setSendingEmail(false)
    }
  }

  async function handleUpdateStatus(newStatus: string) {
    try {
      const { error } = await supabase
        .from('commandes')
        .update({ statut: newStatus })
        .eq('id', orderId)

      if (error) throw error

      setCommande({ ...commande, statut: newStatus })

      // Show success notification
      setNotifType('success')
      setSuccessMessage('✅ Statut mis à jour !')
      setShowSuccessNotif(true)
      setTimeout(() => setShowSuccessNotif(false), 3000)
    } catch (error: any) {
      console.error('Error updating status:', error)

      // Show error notification
      setNotifType('error')
      setSuccessMessage(`❌ Erreur: ${error.message}`)
      setShowSuccessNotif(true)
      setTimeout(() => setShowSuccessNotif(false), 5000)
    }
  }

  if (loading || !user || !commande) {
    return <PageLoader />
  }

  return (
    <DashboardLayout user={user} title="Détail de la commande">
      {/* Custom Notification Toast */}
      {showSuccessNotif && (
        <div className="fixed top-4 right-4 z-50 animate-slideDown">
          <div className={`rounded-xl shadow-2xl p-4 min-w-[320px] max-w-md border-2 ${notifType === 'success'
            ? 'bg-green-50 border-green-500'
            : 'bg-red-50 border-red-500'
            }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${notifType === 'success' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                {notifType === 'success' ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold whitespace-pre-line ${notifType === 'success' ? 'text-green-900' : 'text-red-900'
                  }`}>
                  {successMessage}
                </p>
              </div>
              <button
                onClick={() => setShowSuccessNotif(false)}
                className={`p-1 rounded-lg transition-colors ${notifType === 'success'
                  ? 'hover:bg-green-100 text-green-600'
                  : 'hover:bg-red-100 text-red-600'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Header Premium */}
        <div className="flex items-center justify-between animate-slideDown">
          <button
            onClick={() => router.push('/admin')}
            className="inline-flex items-center gap-2 px-4 py-2 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all duration-200 group"
          >
            <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Retour au dashboard</span>
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleGenerateEmail}
              disabled={generatingEmail}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-medium shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-200 disabled:opacity-50"
            >
              {generatingEmail ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Génération...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Générer Email IA
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Info Premium */}
            <Card variant="elevated" className="animate-slideUp overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary-100 to-accent-100 rounded-full blur-3xl opacity-30 -mr-32 -mt-32" />
              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">Commande #{commande.id.slice(0, 8)}</CardTitle>
                    <p className="text-sm text-stone-500">
                      Créée le {new Date(commande.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })} à {new Date(commande.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <StatusBadge status={commande.statut} showDot />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-stone-500 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                      ID Commande
                    </div>
                    <p className="font-mono text-stone-900 font-semibold">{commande.id}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-stone-500 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Client
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-xs font-bold">
                        {commande.users?.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <p className="font-medium text-stone-900">{commande.users?.email || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <div className="flex items-center gap-2 text-stone-500 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Type de compte
                    </div>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary-50 to-accent-50 text-primary-700 rounded-lg font-medium">
                      {commande.users?.role === 'la_redoute' ? 'La Redoute' : 'Magasin'}
                    </span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-stone-200">
                  <p className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Modifier le statut
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {['en_attente', 'confirmee', 'en_preparation', 'envoyee'].map((status) => (
                      <button
                        key={status}
                        onClick={() => handleUpdateStatus(status)}
                        className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${commande.statut === status
                          ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/30 cursor-default'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200 hover:shadow-md'
                          }`}
                      >
                        <StatusBadge status={status} />
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Magasins */}
            <Card variant="elevated" className="animate-slideUp" style={{ animationDelay: '100ms' }}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-stone-100 rounded-lg">
                    <svg className="w-5 h-5 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle>Magasins concernés</CardTitle>
                    <p className="text-sm text-stone-500">{commande.commande_magasins.length} magasin(s)</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {commande.commande_magasins.map((cm: any, idx: number) => {
                    // Get products for this store
                    const storeProducts = commande.commande_produits.map((cp: any) => {
                      const specificQty = commande.commande_magasin_produits?.find(
                        (cmp: any) => cmp.magasin_id === cm.magasin_id && cmp.produit_id === cp.produit_id
                      )
                      return {
                        ...cp,
                        storeQuantite: specificQty?.quantite || cp.quantite
                      }
                    })
                    const totalStoreQty = storeProducts.reduce((sum: number, p: any) => sum + p.storeQuantite, 0)

                    return (
                      <div key={idx} className="group p-5 bg-stone-50 rounded-xl border border-stone-200 hover:border-primary-300 transition-all duration-200">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <p className="font-semibold text-lg text-stone-900 mb-1">{cm.magasins.nom}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="inline-flex items-center gap-1.5 text-stone-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                </svg>
                                {cm.magasins.code}
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-stone-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {cm.magasins.ville}
                              </span>
                            </div>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {totalStoreQty}
                          </div>
                        </div>

                        {/* Products for this store */}
                        <div className="space-y-2 pt-3 border-t border-stone-200">
                          {storeProducts.map((sp: any, pidx: number) => (
                            <div key={pidx} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600 font-bold text-xs">
                                  {sp.produits.nom.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-stone-900">{sp.produits.nom}</p>
                                  <p className="text-xs text-stone-500 font-mono">{sp.produits.reference}</p>
                                </div>
                              </div>
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 text-white rounded-lg font-bold text-sm">
                                {sp.storeQuantite}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Produits */}
            <Card variant="elevated" className="animate-slideUp" style={{ animationDelay: '200ms' }}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-stone-100 rounded-lg">
                    <svg className="w-5 h-5 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle>Produits commandés - Total</CardTitle>
                    <p className="text-sm text-stone-500">
                      {commande.commande_produits.reduce((sum: number, cp: any) => {
                        // Sum quantities from all stores
                        const totalForProduct = commande.commande_magasins.reduce((storeSum: number, cm: any) => {
                          const specificQty = commande.commande_magasin_produits?.find(
                            (cmp: any) => cmp.magasin_id === cm.magasin_id && cmp.produit_id === cp.produit_id
                          )
                          return storeSum + (specificQty?.quantite || cp.quantite)
                        }, 0)
                        return sum + totalForProduct
                      }, 0)} produit(s) au total
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-stone-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">
                          Produit
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">
                          Référence
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-stone-700 uppercase tracking-wider">
                          Quantité Totale
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {commande.commande_produits.map((cp: any, idx: number) => {
                        // Calculate total quantity for this product across all stores
                        const totalQuantity = commande.commande_magasins.reduce((storeSum: number, cm: any) => {
                          const specificQty = commande.commande_magasin_produits?.find(
                            (cmp: any) => cmp.magasin_id === cm.magasin_id && cmp.produit_id === cp.produit_id
                          )
                          return storeSum + (specificQty?.quantite || cp.quantite)
                        }, 0)

                        return (
                          <tr key={idx} className="group hover:bg-stone-50 transition-all duration-200">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-bold text-sm">
                                  {cp.produits.nom.charAt(0)}
                                </div>
                                <span className="text-sm font-semibold text-stone-900">{cp.produits.nom}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-sm font-mono text-stone-600">{cp.produits.reference}</span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 text-white rounded-xl font-bold text-lg shadow-md group-hover:shadow-lg transition-shadow">
                                {totalQuantity}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Photos */}
          <div className="space-y-6">
            <Card variant="elevated" className="animate-slideUp overflow-hidden" style={{ animationDelay: '300ms' }}>
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-primary-100 to-accent-100 rounded-full blur-3xl opacity-30 -mr-24 -mt-24" />
              <CardHeader className="relative">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-stone-100 rounded-lg">
                    <svg className="w-5 h-5 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle>Photos</CardTitle>
                    <p className="text-sm text-stone-500">{photos.length} photo(s)</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4">
                  {/* Drag & Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${isDragging
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-stone-300 bg-stone-50 hover:border-primary-400 hover:bg-stone-100'
                      }`}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files)}
                      className="hidden"
                      id="photo-upload"
                      disabled={uploading}
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all ${isDragging
                          ? 'bg-primary-100 scale-110'
                          : 'bg-stone-200'
                          }`}>
                          {uploading ? (
                            <svg className="animate-spin w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className={`w-8 h-8 ${isDragging ? 'text-primary-600' : 'text-stone-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-stone-900 mb-1">
                          {uploading ? 'Upload en cours...' : isDragging ? 'Déposez les fichiers ici' : 'Glissez vos photos ici'}
                        </p>
                        <p className="text-xs text-stone-500">
                          ou cliquez pour sélectionner
                        </p>
                      </div>
                    </label>
                  </div>

                  {photos.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm font-medium text-stone-700">Aucune photo uploadée</p>
                      <p className="text-xs text-stone-500 mt-1">Les photos apparaîtront ici</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {photos.map((photo, idx) => {
                        const photoUrl = supabase.storage
                          .from('order-photos')
                          .getPublicUrl(photo.file_path).data.publicUrl

                        console.log('Photo URL:', photoUrl) // Debug log

                        return (
                          <div
                            key={photo.id}
                            className="relative group animate-fadeIn"
                            style={{ animationDelay: `${idx * 50}ms` }}
                          >
                            <img
                              src={photoUrl}
                              alt={`Photo ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-xl shadow-md group-hover:shadow-xl transition-all duration-200 cursor-pointer"
                              onClick={() => window.open(photoUrl, '_blank')}
                              onError={(e) => {
                                console.error('Failed to load image:', photoUrl)
                                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext fill="%236b7280" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="16"%3EImage non disponible%3C/text%3E%3C/svg%3E'
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-end p-3">
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    window.open(photoUrl, '_blank')
                                  }}
                                  className="text-white hover:text-primary-300 transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeletePhoto(photo.id, photo.file_path)
                                  }}
                                  className="text-white hover:text-red-400 transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Email généré par IA"
        size="lg"
      >
        <div className="space-y-4">
          {/* Info Notice */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-blue-800 mb-1">Envoi d'email réel</h4>
                <p className="text-xs text-blue-700">L'email sera envoyé via Resend au destinataire et enregistré dans la base de données pour le suivi.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              📧 Destinataire: <span className="text-primary-600">{commande.users?.email || 'N/A'}</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Contenu de l'email (éditable)
            </label>
            <textarea
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              rows={12}
              className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all font-mono"
            />
          </div>

          <div className="border-2 border-stone-200 rounded-xl p-4 bg-stone-50 max-h-96 overflow-y-auto">
            <p className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Aperçu
            </p>
            <div
              className="prose prose-sm max-w-none bg-white p-4 rounded-lg"
              dangerouslySetInnerHTML={{ __html: emailContent }}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-stone-200">
            <button
              onClick={() => setShowEmailModal(false)}
              className="px-5 py-2.5 border-2 border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-medium shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {sendingEmail ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Envoi en cours...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Envoyer l'email
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
