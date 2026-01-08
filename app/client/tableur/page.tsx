'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile, supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Pagination } from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/Toast'
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

export default function TableurPage() {
    const router = useRouter()
    const { showSuccess } = useToast()
    const [user, setUser] = useState<User | null>(null)
    const [activeTab, setActiveTab] = useState<'commandes' | 'catalogue'>('commandes')

    // Commandes state
    const [commandes, setCommandes] = useState<any[]>([])
    const [dateDebut, setDateDebut] = useState('')
    const [dateFin, setDateFin] = useState('')

    // Catalogue state
    const [produits, setProduits] = useState<ProduitWithFilters[]>([])
    const [modeles, setModeles] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [selectedModel, setSelectedModel] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 50

    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [router])

    async function loadData() {
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

            // Load commandes
            const { data: commandesData } = await supabase
                .from('commandes')
                .select(`
          id, statut, created_at,
          commande_magasins (magasin_id, magasins (nom, code, ville)),
          commande_produits (quantite, produit_id, produits (nom, reference)),
          commande_magasin_produits (magasin_id, produit_id, quantite)
        `)
                .order('created_at', { ascending: false })

            setCommandes(commandesData || [])

            // Load catalogue
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

    // Commandes filters
    function getFilteredCommandes() {
        let filtered = [...commandes]
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
        return filtered
    }

    function getCommandesSpreadsheetData() {
        const filteredCommandes = getFilteredCommandes()
        const rows: any[] = []
        filteredCommandes.forEach(commande => {
            commande.commande_magasins?.forEach((cm: any) => {
                commande.commande_produits?.forEach((cp: any) => {
                    const specificQty = commande.commande_magasin_produits?.find(
                        (cmp: any) => cmp.magasin_id === cm.magasin_id && cmp.produit_id === cp.produit_id
                    )
                    rows.push({
                        commandeId: commande.id.slice(0, 8),
                        date: new Date(commande.created_at).toLocaleDateString('fr-FR'),
                        statut: commande.statut,
                        magasin: cm.magasins?.nom || 'N/A',
                        magasinCode: cm.magasins?.code || 'N/A',
                        ville: cm.magasins?.ville || 'N/A',
                        produit: cp.produits?.nom || 'N/A',
                        reference: cp.produits?.reference || 'N/A',
                        quantite: specificQty?.quantite || cp.quantite
                    })
                })
            })
        })
        return rows
    }

    // Catalogue filters
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

    function exportCommandesCSV() {
        const data = getCommandesSpreadsheetData()
        const headers = ['Commande', 'Date', 'Statut', 'Magasin', 'Code', 'Ville', 'Produit', 'Référence', 'Quantité']
        const csvContent = [
            headers.join(';'),
            ...data.map(row => [row.commandeId, row.date, row.statut, row.magasin, row.magasinCode, row.ville, row.produit, row.reference, row.quantite].join(';'))
        ].join('\n')
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `commandes_${new Date().toISOString().slice(0, 10)}.csv`
        link.click()
        showSuccess('Export CSV téléchargé !')
    }

    function exportCatalogueCSV() {
        const headers = ['Catégorie', 'Référence', 'Nom', 'Modèle', 'Actif']
        const rows = filteredProduits.map(p => [
            p.categorie || '',
            p.reference,
            p.nom,
            modeles.find(m => m.id === p.modele_id)?.nom || '',
            p.actif !== false ? 'Oui' : 'Non'
        ])
        const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `catalogue_${new Date().toISOString().slice(0, 10)}.csv`
        link.click()
        showSuccess('Export CSV téléchargé !')
    }

    const commandesData = getCommandesSpreadsheetData()
    const statusColors: Record<string, string> = {
        en_attente: 'bg-amber-100 text-amber-800',
        confirmee: 'bg-green-100 text-green-800',
        en_preparation: 'bg-blue-100 text-blue-800',
        envoyee: 'bg-purple-100 text-purple-800'
    }

    if (loading || !user) return <PageLoader />

    return (
        <DashboardLayout user={user} title="Vue Tableur">
            <div className="space-y-4">
                {/* Tab Toggle */}
                <div className="bg-white rounded-xl border-2 border-stone-200 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                                X
                            </div>
                            <div className="flex bg-stone-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setActiveTab('commandes')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'commandes' ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'
                                        }`}
                                >
                                    📋 Commandes
                                </button>
                                <button
                                    onClick={() => setActiveTab('catalogue')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'catalogue' ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'
                                        }`}
                                >
                                    📦 Catalogue
                                </button>
                            </div>
                        </div>

                        {activeTab === 'commandes' ? (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-stone-600">Du:</label>
                                    <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)}
                                        className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-green-500" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-stone-600">Au:</label>
                                    <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)}
                                        className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-green-500" />
                                </div>
                                {(dateDebut || dateFin) && (
                                    <button onClick={() => { setDateDebut(''); setDateFin(''); }} className="px-3 py-2 text-sm text-stone-600 hover:text-stone-900">
                                        Réinitialiser
                                    </button>
                                )}
                                <button onClick={exportCommandesCSV}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Export CSV
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <input type="text" placeholder="Rechercher..." value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                                    className="px-4 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-green-500 w-64" />
                                <button onClick={exportCatalogueCSV}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Export CSV
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Category Tabs (Catalogue only) */}
                    {activeTab === 'catalogue' && (
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
                    )}

                    {/* Model filter (LRI only) */}
                    {activeTab === 'catalogue' && selectedCategory === 'echantillon_lri' && (
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

                {/* Tables */}
                <div className="bg-white rounded-xl border-2 border-stone-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        {activeTab === 'commandes' ? (
                            <table className="w-full border-collapse" style={{ minWidth: '1000px' }}>
                                <thead>
                                    <tr className="bg-green-600 text-white">
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase border-r border-green-500">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase border-r border-green-500">Commande</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase border-r border-green-500">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase border-r border-green-500">Statut</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase border-r border-green-500">Magasin</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase border-r border-green-500">Code</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase border-r border-green-500">Ville</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase border-r border-green-500">Produit</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase border-r border-green-500">Référence</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold uppercase">Qté</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {commandesData.length === 0 ? (
                                        <tr><td colSpan={10} className="px-4 py-12 text-center text-stone-500">Aucune donnée</td></tr>
                                    ) : (
                                        commandesData.map((row, idx) => (
                                            <tr key={idx} className={`border-b border-stone-200 hover:bg-green-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50'}`}>
                                                <td className="px-4 py-3 text-sm text-stone-500 font-mono border-r border-stone-200 bg-stone-100">{idx + 1}</td>
                                                <td className="px-4 py-3 text-sm font-semibold border-r border-stone-200">#{row.commandeId}</td>
                                                <td className="px-4 py-3 text-sm border-r border-stone-200">{row.date}</td>
                                                <td className="px-4 py-3 border-r border-stone-200">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[row.statut] || 'bg-stone-100'}`}>
                                                        {row.statut.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium border-r border-stone-200">{row.magasin}</td>
                                                <td className="px-4 py-3 text-sm font-mono border-r border-stone-200">{row.magasinCode}</td>
                                                <td className="px-4 py-3 text-sm border-r border-stone-200">{row.ville}</td>
                                                <td className="px-4 py-3 text-sm font-medium border-r border-stone-200">{row.produit}</td>
                                                <td className="px-4 py-3 text-sm font-mono border-r border-stone-200">{row.reference}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 rounded font-bold">{row.quantite}</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
                                <thead>
                                    <tr className="bg-green-600 text-white">
                                        <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-green-500 w-12">#</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-green-500">Catégorie</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-green-500">Référence</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-green-500">Nom du produit</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-green-500">Modèle</th>
                                        <th className="px-3 py-3 text-center text-xs font-bold uppercase w-20">Actif</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedProduits.map((produit, idx) => {
                                        const rowNum = (currentPage - 1) * itemsPerPage + idx + 1
                                        return (
                                            <tr key={produit.id} className={`border-b border-stone-200 hover:bg-green-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50'}`}>
                                                <td className="px-3 py-2 text-sm text-stone-500 font-mono border-r border-stone-200 bg-stone-100">{rowNum}</td>
                                                <td className="px-3 py-2 text-xs border-r border-stone-200">
                                                    <span className="px-2 py-1 bg-stone-100 rounded text-stone-600 font-medium">{produit.categorie?.replace('_', ' ') || '-'}</span>
                                                </td>
                                                <td className="px-3 py-2 text-sm font-mono text-stone-700 border-r border-stone-200">{produit.reference}</td>
                                                <td className="px-3 py-2 text-sm font-medium text-stone-900 border-r border-stone-200">{produit.nom}</td>
                                                <td className="px-3 py-2 text-sm text-stone-600 border-r border-stone-200">{modeles.find(m => m.id === produit.modele_id)?.nom || '-'}</td>
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
                        )}
                    </div>

                    {/* Pagination (Catalogue only) */}
                    {activeTab === 'catalogue' && (
                        <div className="px-4">
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        </div>
                    )}

                    {/* Footer Stats */}
                    <div className="bg-stone-100 px-4 py-3 border-t-2 border-stone-200">
                        <div className="flex items-center justify-between text-sm">
                            {activeTab === 'commandes' ? (
                                <div className="flex gap-6">
                                    <span className="text-stone-600"><span className="font-semibold text-stone-900">{commandesData.length}</span> lignes</span>
                                    <span className="text-stone-600"><span className="font-semibold text-stone-900">{getFilteredCommandes().length}</span> commandes</span>
                                    <span className="text-stone-600">Total: <span className="font-semibold text-green-700">{commandesData.reduce((s, r) => s + r.quantite, 0)}</span> produits</span>
                                </div>
                            ) : (
                                <div className="flex gap-6">
                                    <span className="text-stone-600"><span className="font-semibold text-stone-900">{filteredProduits.length}</span> produits</span>
                                    <span className="text-stone-600">Actifs: <span className="font-semibold text-green-600">{filteredProduits.filter(p => p.actif !== false).length}</span></span>
                                </div>
                            )}
                            <span className="text-stone-500 text-xs">Dernière mise à jour: {new Date().toLocaleString('fr-FR')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
