'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Pagination } from '@/components/ui/Pagination'
import type { User, Produit } from '@/types/database.types'

interface ProduitWithFilters extends Produit {
    categorie?: string
    modele_id?: string
    actif?: boolean
}

const CATEGORIES = [
    { id: null, label: 'Tous', color: 'bg-stone-900 text-white' },
    { id: 'consommable', label: 'Consommable', color: 'bg-blue-600 text-white' },
    { id: 'echantillon_lri', label: 'Éch. LRI', color: 'bg-purple-600 text-white' },
    { id: 'echantillon_ampm', label: 'Éch. AM.PM', color: 'bg-indigo-600 text-white' },
    { id: 'pentes', label: 'Pentes', color: 'bg-orange-600 text-white' },
    { id: 'tissus', label: 'Tissus', color: 'bg-pink-600 text-white' },
]

export default function AdminTableurPage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [produits, setProduits] = useState<ProduitWithFilters[]>([])
    const [modeles, setModeles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [selectedModel, setSelectedModel] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 50

    useEffect(() => {
        async function loadData() {
            try {
                const currentUser = await getCurrentUser()
                if (!currentUser) {
                    router.push('/login')
                    return
                }

                const profile = (await getUserProfile(currentUser.id)) as any
                if (profile.role !== 'admin') {
                    router.push('/dashboard')
                    return
                }

                setUser(profile)

                const [produitsRes, modelesRes] = await Promise.all([
                    supabase.from('produits').select('*').order('categorie').order('nom'),
                    supabase.from('modeles').select('*').order('nom')
                ])

                setProduits(produitsRes.data || [])
                setModeles(modelesRes.data || [])
            } catch (error) {
                console.error('Error loading data:', error)
                router.push('/login')
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [router])

    const filteredProduits = produits.filter(p => {
        const matchesCategory = !selectedCategory || p.categorie === selectedCategory
        const matchesModel = !selectedModel || p.modele_id === selectedModel
        const matchesSearch = !searchQuery ||
            p.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.reference.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesCategory && matchesModel && matchesSearch
    })

    const totalPages = Math.ceil(filteredProduits.length / itemsPerPage)
    const paginatedProduits = filteredProduits.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    function exportToCSV() {
        const headers = ['Catégorie', 'Référence', 'Nom', 'Modèle', 'Actif']
        const rows = filteredProduits.map(p => [
            p.categorie || '',
            p.reference,
            p.nom,
            modeles.find(m => m.id === p.modele_id)?.nom || '',
            p.actif !== false ? 'Oui' : 'Non'
        ])

        const csvContent = [
            headers.join(';'),
            ...rows.map(r => r.join(';'))
        ].join('\n')

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `catalogue_admin_${new Date().toISOString().slice(0, 10)}.csv`
        link.click()
    }

    if (loading || !user) return <PageLoader />

    return (
        <DashboardLayout user={user} title="Catalogue Tableur">
            <div className="space-y-4">
                {/* Toolbar */}
                <div className="bg-white rounded-xl border-2 border-stone-200 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                                X
                            </div>
                            <div>
                                <p className="font-bold text-stone-900">Catalogue Produits (Admin)</p>
                                <p className="text-xs text-stone-500">{filteredProduits.length} produits</p>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="flex-1 max-w-md">
                            <input
                                type="text"
                                placeholder="Rechercher réf. ou nom..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                                className="w-full px-4 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
                            />
                        </div>

                        {/* Export */}
                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export CSV
                        </button>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-stone-100">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id || 'all'}
                                onClick={() => { setSelectedCategory(cat.id); setSelectedModel(null); setCurrentPage(1) }}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedCategory === cat.id ? cat.color : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Model filter (LRI only) */}
                    {selectedCategory === 'echantillon_lri' && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-stone-100">
                            <span className="text-xs font-bold text-purple-600 uppercase mr-2">Modèle:</span>
                            {modeles.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => { setSelectedModel(selectedModel === m.id ? null : m.id); setCurrentPage(1) }}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${selectedModel === m.id ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                        }`}
                                >
                                    {m.nom}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border-2 border-stone-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
                            <thead>
                                <tr className="bg-green-600 text-white">
                                    <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-green-500 w-12">#</th>
                                    <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-green-500">Catégorie</th>
                                    <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-green-500">Référence</th>
                                    <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-green-500">Nom du produit</th>
                                    <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-green-500">Modèle</th>
                                    <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider w-20">Actif</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedProduits.map((produit, idx) => {
                                    const rowNum = (currentPage - 1) * itemsPerPage + idx + 1
                                    return (
                                        <tr
                                            key={produit.id}
                                            className={`border-b border-stone-200 hover:bg-green-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50'}`}
                                        >
                                            <td className="px-3 py-2 text-sm text-stone-500 font-mono border-r border-stone-200 bg-stone-100">
                                                {rowNum}
                                            </td>
                                            <td className="px-3 py-2 text-xs border-r border-stone-200">
                                                <span className="px-2 py-1 bg-stone-100 rounded text-stone-600 font-medium">
                                                    {produit.categorie?.replace('_', ' ') || '-'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-sm font-mono text-stone-700 border-r border-stone-200">
                                                {produit.reference}
                                            </td>
                                            <td className="px-3 py-2 text-sm font-medium text-stone-900 border-r border-stone-200">
                                                {produit.nom}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-stone-600 border-r border-stone-200">
                                                {modeles.find(m => m.id === produit.modele_id)?.nom || '-'}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${produit.actif !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {produit.actif !== false ? '✓' : '✗'}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-4">
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>

                    {/* Footer Stats */}
                    <div className="bg-stone-100 px-4 py-3 border-t-2 border-stone-200">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex gap-6">
                                <span className="text-stone-600">
                                    <span className="font-semibold text-stone-900">{filteredProduits.length}</span> produits
                                </span>
                                <span className="text-stone-600">
                                    Actifs: <span className="font-semibold text-green-600">{filteredProduits.filter(p => p.actif !== false).length}</span>
                                </span>
                                <span className="text-stone-600">
                                    Archivés: <span className="font-semibold text-red-600">{filteredProduits.filter(p => p.actif === false).length}</span>
                                </span>
                            </div>
                            <span className="text-stone-500 text-xs">
                                Dernière mise à jour: {new Date().toLocaleString('fr-FR')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
