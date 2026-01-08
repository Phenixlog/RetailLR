'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn(email, password)
      const user = result.user
      if (!user) throw new Error('User not found')

      const { supabase } = await import('@/lib/supabase')
      const { data: profile, error: profileError } = await (supabase as any)
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      await new Promise(resolve => setTimeout(resolve, 500))

      const role = (profile as any)?.role

      switch (role) {
        case 'admin':
          window.location.href = '/admin'
          break
        case 'la_redoute':
          window.location.href = '/client'
          break
        case 'magasin':
          window.location.href = '/magasin'
          break
        default:
          throw new Error('Rôle invalide')
      }
    } catch (err: any) {
      console.error('❌ Erreur de connexion:', err)
      setError(err.message || 'Erreur de connexion')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-mesh relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
      <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-primary-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo & Header */}
          <div className="text-center mb-10 animate-fadeIn">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 mb-6 shadow-xl shadow-primary-500/20">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-3">
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                La Redoute
              </span>
              {' × '}
              <span className="bg-gradient-to-r from-accent-600 to-primary-600 bg-clip-text text-transparent">
                Phenix Log
              </span>
            </h1>
            <p className="text-stone-600 text-sm font-medium">
              Plateforme de gestion logistique
            </p>
          </div>

          {/* Login Card */}
          <div className="glass rounded-3xl shadow-2xl shadow-primary-500/10 p-8 animate-slideUp backdrop-blur-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 animate-slideDown">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold text-sm text-red-900">Erreur de connexion</p>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-5">
                <Input
                  label="Adresse email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@example.com"
                  leftIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  }
                />

                <Input
                  label="Mot de passe"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                />
              </div>

              <Button
                type="submit"
                fullWidth
                isLoading={loading}
                size="lg"
                className="mt-8 gradient-rose text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-300"
              >
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-stone-500 font-medium">Comptes de démo</span>
              </div>
            </div>

            {/* Demo Accounts */}
            <div className="space-y-2">
              {[
                { role: 'Magasin', email: 'lrmagasin@phenixlog.fr', color: 'from-green-500 to-emerald-500' },
                { role: 'Client', email: 'lrtest@phenixlog.fr', color: 'from-blue-500 to-cyan-500' },
              ].map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email)
                    setPassword('123456')
                  }}
                  className="w-full p-3 rounded-xl bg-stone-50 hover:bg-stone-100 transition-all duration-200 group border border-stone-200 hover:border-primary-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${account.color} flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}>
                        <span className="text-white text-xs font-bold">{account.role[0]}</span>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-stone-900">{account.role}</p>
                        <p className="text-xs text-stone-500 font-mono">{account.email}</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-stone-400 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-xs text-center text-stone-500 mt-6">
              Mot de passe par défaut : <code className="px-2 py-1 bg-stone-100 rounded font-mono text-primary-600">123456</code>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center mt-8 text-sm text-stone-600 animate-fadeIn" style={{ animationDelay: '200ms' }}>
            © 2026 La Redoute × Phenix Log
          </p>
        </div>
      </div>
    </div>
  )
}
