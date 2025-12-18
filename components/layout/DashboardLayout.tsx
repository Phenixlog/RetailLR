'use client'

import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/supabase'
import type { User } from '@/types/database.types'
import { formatRole } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'

interface DashboardLayoutProps {
  children: React.ReactNode
  user: User
  title: string
}

export default function DashboardLayout({ children, user, title }: DashboardLayoutProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  async function handleSignOut() {
    setIsLoggingOut(true)
    await signOut()
    router.push('/login')
  }

  const getRoleGradient = (role: string) => {
    // Simplifié : une seule couleur pour tous
    return 'from-primary-500 to-accent-500'
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        )
      case 'la_redoute':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
      case 'magasin':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
    }
  }

  return (
    <div className="min-h-screen gradient-mesh relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fadeIn"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar - Premium */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 glass border-r border-stone-200 z-50 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 animate-slideInFromLeft`}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Brand */}
          <div className="p-6 border-b border-stone-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                  La Redoute
                </h1>
                <p className="text-xs text-stone-500 font-medium">Phenix Log</p>
              </div>
            </div>
            <div className="text-sm text-stone-600 font-medium">{title}</div>
          </div>

          {/* User Profile Card */}
          <div className="p-4 border-b border-stone-200">
            <div className="relative p-4 rounded-xl bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary-200/30 to-accent-200/30 rounded-full blur-2xl"></div>
              <div className="relative flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getRoleGradient(user.role)} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
                  {getRoleIcon(user.role)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-900 truncate">{user.email}</p>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r ${getRoleGradient(user.role)} text-white shadow-sm`}>
                      {formatRole(user.role)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider px-3 mb-3">
              Navigation
            </div>

            {user.role === 'admin' && (
              <>
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-700 hover:bg-stone-100 transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <span className="font-medium text-sm">Dashboard</span>
                </button>

                <button
                  onClick={() => router.push('/admin/commandes-list')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-700 hover:bg-stone-100 transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <span className="font-medium text-sm">Commandes</span>
                </button>

                <button
                  onClick={() => router.push('/admin/statistiques')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-700 hover:bg-stone-100 transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <span className="font-medium text-sm">Statistiques</span>
                </button>

                <button
                  onClick={() => router.push('/admin/emails')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-700 hover:bg-stone-100 transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="font-medium text-sm">Suivi Emails</span>
                </button>
              </>
            )}

            {user.role === 'la_redoute' && (
              <>
                <button
                  onClick={() => router.push('/client/dashboard')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-700 hover:bg-stone-100 transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <span className="font-medium text-sm">Dashboard</span>
                </button>

                <button
                  onClick={() => router.push('/client/commande')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-700 hover:bg-stone-100 transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="font-medium text-sm">Commande</span>
                </button>

                <button
                  onClick={() => router.push('/client/magasins')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-700 hover:bg-stone-100 transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <span className="font-medium text-sm">Magasins</span>
                </button>

                <button
                  onClick={() => router.push('/client/historique')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-700 hover:bg-stone-100 transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="font-medium text-sm">Historique</span>
                </button>
              </>
            )}

            {user.role === 'magasin' && (
              <>
                <button
                  onClick={() => router.push('/magasin/dashboard')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-700 hover:bg-stone-100 transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <span className="font-medium text-sm">Dashboard</span>
                </button>

                <button
                  onClick={() => router.push('/magasin/commande')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-700 hover:bg-stone-100 transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="font-medium text-sm">Commande</span>
                </button>

                <button
                  onClick={() => router.push('/magasin/historique')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-700 hover:bg-stone-100 transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="font-medium text-sm">Historique</span>
                </button>
              </>
            )}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-stone-200">
            <Button
              onClick={handleSignOut}
              variant="outline"
              fullWidth
              isLoading={isLoggingOut}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              }
              className="justify-center hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 hover:text-white hover:border-red-500 transition-all duration-200"
            >
              Déconnexion
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Layout */}
      <div className="lg:ml-72 min-h-screen flex flex-col">
        {/* Top Header - Mobile */}
        <header className="glass border-b border-stone-200 sticky top-0 z-30 backdrop-blur-lg shadow-sm lg:hidden animate-slideDown">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-gradient-to-br hover:from-primary-400 hover:to-accent-400 text-stone-700 hover:text-white flex items-center justify-center transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="flex items-center gap-2">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 shadow-md">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h1 className="text-sm font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                  La Redoute
                </h1>
              </div>

              <div className="w-10"></div>
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:block glass border-b border-stone-200 sticky top-0 z-30 backdrop-blur-lg shadow-sm animate-slideDown">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-stone-900">{title}</h2>
                <p className="text-sm text-stone-500 mt-0.5">
                  Bienvenue, {user.email?.split('@')[0]}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200">
                  <p className="text-xs text-stone-500 font-medium">
                    {new Date().toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8 animate-fadeIn">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-auto py-6 border-t border-stone-200 glass">
          <div className="px-4 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <p className="text-sm text-stone-500">
                © 2024 La Redoute × Phenix Log
              </p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold shadow-sm">
                  <span className="w-1.5 h-1.5 bg-white rounded-full mr-2 animate-pulse"></span>
                  En ligne
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
