'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'

export default function CatalogImportPage() {
    const router = useRouter()
    const { showSuccess, showError } = useToast()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [selectedCategory, setSelectedCategory] = useState('echantillon_lri')
    const [archiveMissing, setArchiveMissing] = useState(false)
    const [importResult, setImportResult] = useState<any>(null)

    const CATEGORIES = [
        { id: 'consommable', label: 'Consommable', icon: '📦' },
        { id: 'echantillon_lri', label: 'Échantillon LRI', icon: '🏷️' },
        { id: 'echantillon_ampm', label: 'Échantillon AM.PM', icon: '🌙' },
        { id: 'pentes', label: 'Pentes', icon: '📐' },
        { id: 'tissus', label: 'Tissus', icon: '🧵' },
    ]

    useEffect(() => {
        async function checkAuth() {
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
            } catch (error) {
                console.error('Auth error:', error)
            } finally {
                setLoading(false)
            }
        }
        checkAuth()
    }, [router])

    async function handleImport() {
        if (!file) return

        setUploading(true)
        setImportResult(null)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('category', selectedCategory)
        formData.append('archiveMissing', String(archiveMissing))

        try {
            const response = await fetch('/api/admin/catalog/import', {
                method: 'POST',
                body: formData,
            })

            const result = await response.json()

            if (response.ok) {
                showSuccess('Importation réussie !')
                setImportResult(result.summary)
                setFile(null)
            } else {
                showError(result.error || 'Erreur lors de l importation')
            }
        } catch (error: any) {
            showError('Erreur réseau ou serveur')
        } finally {
            setUploading(false)
        }
    }

    if (loading) return <PageLoader />

    return (
        <DashboardLayout user={user} title="Gestion du Catalogue">
            <div className="max-w-4xl mx-auto space-y-6">
                <Card variant="elevated">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <div>
                                <CardTitle className="text-2xl">Importation Mensuelle</CardTitle>
                                <p className="text-stone-500 mt-1">Mettez à jour les modèles et tissus via un fichier Excel (.xlsx)</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-stone-700 ml-1">Catégorie cible</label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${selectedCategory === cat.id
                                                ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm'
                                                : 'bg-white border-stone-100 text-stone-600 hover:border-stone-200'
                                                }`}
                                        >
                                            <span>{cat.icon}</span>
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                                <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-11v-4h11m0 4v4h4v-4m-4-4v-4h-4v4" />
                                </svg>
                                <div className="text-sm text-blue-800">
                                    <p className="font-bold mb-1">Structure attendue (.xlsx) :</p>
                                    <p className="opacity-90 leading-relaxed">
                                        {selectedCategory.includes('echantillon')
                                            ? "Modèle | Gamme | Référence | Type | Couleur | Housse | Statut"
                                            : "Nom | Référence | Description | Prix (Optionnel) | Stock (Optionnel)"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center justify-between gap-4">
                            <div className="flex gap-3">
                                <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <div>
                                    <p className="text-sm font-bold text-amber-900">Gestion des obsolets</p>
                                    <p className="text-xs text-amber-700">Archiver les produits deja en base mais absents de cet Excel</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={archiveMissing}
                                    onChange={(e) => setArchiveMissing(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                        </div>

                        <div className="p-8 border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50 hover:bg-stone-100 hover:border-primary-300 transition-all text-center group">
                            <input
                                type="file"
                                accept=".xlsx"
                                id="excel-upload"
                                className="hidden"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                            <label htmlFor="excel-upload" className="cursor-pointer">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-8 h-8 text-stone-400 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                {file ? (
                                    <div className="animate-fadeIn">
                                        <p className="text-primary-600 font-bold">{file.name}</p>
                                        <p className="text-sm text-stone-500 mt-1">Cliquez pour changer de fichier</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-lg font-medium text-stone-900">Cliquez pour sélectionner le fichier Excel</p>
                                        <p className="text-sm text-stone-500 mt-1">Format supporté : .xlsx uniquement</p>
                                    </>
                                )}
                            </label>
                        </div>

                        <button
                            onClick={handleImport}
                            disabled={!file || uploading}
                            className="w-full py-4 bg-stone-900 border-stone-800 text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {uploading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Traitement en cours...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    Lancer l importation
                                </>
                            )}
                        </button>

                        {importResult && (
                            <div className="p-6 bg-green-50 border border-green-100 rounded-2xl animate-fadeIn">
                                <h3 className="text-green-800 font-bold flex items-center gap-2 mb-4">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Importation terminée avec succès
                                </h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                                        <p className="text-xs text-stone-500 uppercase font-bold tracking-wider">Modèles</p>
                                        <p className="text-2xl font-black text-stone-900">{importResult.modeles}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                                        <p className="text-xs text-stone-500 uppercase font-bold tracking-wider">Produits</p>
                                        <p className="text-2xl font-black text-stone-900">{importResult.produits}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                                        <p className="text-xs text-stone-500 uppercase font-bold tracking-wider">Erreurs</p>
                                        <p className="text-2xl font-black text-red-500">{importResult.erreurs}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-100 col-span-3 mt-2">
                                        <p className="text-xs text-stone-500 uppercase font-bold tracking-wider">📦 Produits Archivés (Obsolets)</p>
                                        <p className="text-2xl font-black text-amber-600">{importResult.archived || 0}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
