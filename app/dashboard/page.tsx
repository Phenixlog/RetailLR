'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile, signOut } from '@/lib/supabase'
import type { User } from '@/types/database.types'

export default function DashboardPage() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        console.log('📍 Dashboard: Chargement du user...')
        const user = await getCurrentUser()
        console.log('👤 User authentifié:', user)

        if (!user) {
          console.log('❌ Pas de user, redirection vers login')
          router.push('/login')
          return
        }

        console.log('📡 Récupération du profil pour:', user.id)
        const profile = await getUserProfile(user.id)
        console.log('✅ Profil récupéré:', profile)
        setUserProfile(profile)

        // Redirect based on role
        console.log('🔀 Redirection selon le rôle:', profile.role)
        switch (profile.role) {
          case 'admin':
            console.log('➡️ Redirection vers /admin')
            router.push('/admin')
            break
          case 'la_redoute':
            console.log('➡️ Redirection vers /client')
            router.push('/client')
            break
          case 'magasin':
            console.log('➡️ Redirection vers /magasin')
            router.push('/magasin')
            break
          default:
            console.log('❌ Rôle inconnu, redirection vers login')
            router.push('/login')
        }
      } catch (error) {
        console.error('❌ Error loading user:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [router])

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Redirection en cours...</h1>
        {userProfile && (
          <p className="text-gray-600">
            Connecté en tant que {userProfile.email}
          </p>
        )}
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Déconnexion
        </button>
      </div>
    </div>
  )
}
