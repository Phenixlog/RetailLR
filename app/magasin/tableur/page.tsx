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

interface UserWithMagasin extends User {
    magasins?: any
}

interface CartItem {
    produit: ProduitWithFilters
    quantite: number
}

const CATEGORIES = [
    { id: null, label: 'Tous', color: 'bg-stone-900 text-white' },
    { id: 'consommable', label: 'Consommable', color: 'bg-blue-600 text-white' },
    { id: 'echantillon_lri', label: 'Éch. LRI', color: 'bg-purple-600 text-white' },
    { id: 'echantillon_ampm', label: 'Éch. AM.PM', color: 'bg-indigo-600 text-white' },
    { id: 'pentes', label: 'Pentes', color: 'bg-orange-600 text-white' },
    { id: 'tissus', label: 'Tissus', color: 'bg-pink-600 text-white' },
]

export default function MagasinTableurPage() {
    const router = useRouter()
    const [user, setUser] = useState<UserWithMagasin | null>(null)
    const [produits, setProduits] = useState<ProduitWithFilters[]>([])
    const [modeles, setModeles] = useState<any[]>([])
    const [cart, setCart] = useState<CartItem[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
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
                if (profile.role !== 'magasin') {
                    router.push('/dashboard')
                    return
                }

                setUser(profile)

                const [produitsRes, modelesRes] = await Promise.all([
                    supabase.from('produits').select('*').order('categorie').order('nom'),
                    supabase.from('modeles').select('*').order('nom')
                ])

                const activeProduits = (produitsRes.data || [])
                    .map((p: any) => ({ ...p, actif: p.actif !== false }))
                    .filter((p: any) => p.actif)

                setProduits(activeProduits)
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

    function updateQuantite(produit: ProduitWithFilters, quantite: number) {
        if (quantite === 0) {
            setCart(prev => prev.filter(item => item.produit.id !== produit.id))
        } else {
            setCart(prev => {
                const existing = prev.find(item => item.produit.id === produit.id)
                if (existing) {
                    return prev.map(item =>
                        item.produit.id === produit.id ? { ...item, quantite } : item
                    )
                }
                return [...prev, { produit, quantite }]
            })
        }
    }

    function getQuantite(produitId: string): number {
        return cart.find(item => item.produit.id === produitId)?.quantite || 0
    }

    async function handleSubmit() {
        if (cart.length === 0) return
        if (!user?.magasin_id) {
            alert('Erreur: Magasin non trouvé')
            return
        }

        setSubmitting(true)
        try {
            const { data: commande, error: commandeError } = await (supabase.from('commandes') as any)
                .insert({ user_id: user.id, statut: 'en_attente' })
                .select()
                .single()

            if (commandeError) throw commandeError

            await (supabase.from('commande_magasins') as any)
                .insert({ commande_id: commande.id, magasin_id: user.magasin_id })

            await (supabase.from('commande_produits') as any)
                .insert(cart.map(item => ({
                    commande_id: commande.id,
                    produit_id: item.produit.id,
                    quantite: item.quantite,
                })))

            alert('Commande créée avec succès !')
            setCart([])
            router.push('/magasin')
        } catch (error: any) {
            console.error('Error creating order:', error)
            alert('Erreur: ' + error.message)
        } finally {
            setSubmitting(false)
        }
    }

    function exportToCSV() {
        const headers = ['Catégorie', 'Référence', 'Nom', 'Modèle', 'Qté panier']
        const rows = filteredProduits.map(p => [
            p.categorie || '',
            p.reference,
            p.nom,
            modeles.find(m => m.id === p.modele_id)?.nom || '',
            getQuantite(p.id)
        ])

        const csvContent = [
            headers.join(';'),
            ...rows.map(r => r.join(';'))
        ].join('\n')

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `catalogue_${new Date().toISOString().slice(0, 10)}.csv`
        link.click()
    }

    const cartTotal = cart.reduce((acc, item) => acc + item.quantite, 0)

    if (loading || !user) return <PageLoader />

    return (
        <DashboardLayout user={user as any} title="Vue Tableur">
            <div className="space-y-4">
                {/* Toolbar */}
                <div className="bg-white rounded-xl border-2 border-stone-200 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                                X
                            </div>
                            <div>
                                <p className="font-bold text-stone-900">Catalogue Produits</p>
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
                                    <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider w-32">Quantité</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedProduits.map((produit, idx) => {
                                    const qty = getQuantite(produit.id)
                                    const rowNum = (currentPage - 1) * itemsPerPage + idx + 1
                                    return (
                                        <tr
                                            key={produit.id}
                                            className={`border-b border-stone-200 hover:bg-green-50 transition-colors ${qty > 0 ? 'bg-green-50' : idx % 2 === 0 ? 'bg-white' : 'bg-stone-50'
                                                }`}
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
                                            <td className="px-3 py-2">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => updateQuantite(produit, Math.max(0, qty - 1))}
                                                        className="w-7 h-7 rounded bg-stone-200 hover:bg-stone-300 flex items-center justify-center font-bold text-stone-700"
                                                    >
                                                        −
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={qty}
                                                        onChange={(e) => updateQuantite(produit, parseInt(e.target.value) || 0)}
                                                        className="w-12 h-7 text-center border border-stone-200 rounded text-sm font-bold focus:outline-none focus:border-green-500"
                                                    />
                                                    <button
                                                        onClick={() => updateQuantite(produit, qty + 1)}
                                                        className="w-7 h-7 rounded bg-green-600 text-white flex items-center justify-center font-bold hover:bg-green-700"
                                                    >
                                                        +
                                                    </button>
                                                </div>
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
                            <span className="text-stone-600">
                                <span className="font-semibold text-stone-900">{filteredProduits.length}</span> produits
                            </span>
                            <span className="text-stone-500 text-xs">
                                Dernière mise à jour: {new Date().toLocaleString('fr-FR')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sticky Cart Footer */}
                {cart.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-green-500 shadow-2xl p-4 z-50">
                        <div className="max-w-7xl mx-auto flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white font-black text-lg">
                                    {cartTotal}
                                </div>
                                <div>
                                    <p className="font-bold text-stone-900">{cart.length} produit(s) sélectionné(s)</p>
                                    <p className="text-sm text-stone-500">Total: {cartTotal} unités</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setCart([])}
                                    className="px-4 py-2 text-stone-600 hover:text-stone-900 font-medium"
                                >
                                    Vider
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all disabled:opacity-50 shadow-lg"
                                >
                                    {submitting ? 'Envoi...' : 'Valider la commande'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
