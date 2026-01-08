'use client'

import { useCart } from '@/lib/cart-context'

interface CartSummaryProps {
    onValidate: () => void
    onBack: () => void
    isSubmitting: boolean
}

export function CartSummary({ onValidate, onBack, isSubmitting }: CartSummaryProps) {
    const {
        cart,
        selectedMagasins,
        getTotalForProduct,
        getTotalForMagasin,
        getGrandTotal,
    } = useCart()

    const cartItems = Array.from(cart.values())
    const grandTotal = getGrandTotal()

    if (cartItems.length === 0 || selectedMagasins.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <p className="text-lg font-medium text-stone-900 mb-1">Panier incomplet</p>
                <p className="text-sm text-stone-500 mb-6">Ajoutez des produits et sélectionnez au moins un magasin</p>
                <button
                    onClick={onBack}
                    className="px-6 py-3 bg-stone-100 text-stone-700 rounded-xl font-semibold hover:bg-stone-200 transition-all"
                >
                    Retour au panier
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-stone-900">Récapitulatif de commande</h2>
                    <p className="text-stone-500">Vérifiez les détails avant de valider</p>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                        {grandTotal} unités
                    </p>
                    <p className="text-sm text-stone-500">{cartItems.length} produit(s) • {selectedMagasins.length} magasin(s)</p>
                </div>
            </div>

            {/* Détail par magasin */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedMagasins.map(magasin => {
                    const magasinTotal = getTotalForMagasin(magasin.id)
                    const magasinProducts = cartItems.filter(item => (item.quantities[magasin.id] || 0) > 0)

                    return (
                        <div
                            key={magasin.id}
                            className="bg-white rounded-xl border-2 border-stone-200 overflow-hidden hover:border-primary-300 transition-colors"
                        >
                            <div className="bg-gradient-to-r from-primary-500 to-accent-500 px-4 py-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-white">{magasin.nom}</p>
                                        <p className="text-xs text-white/80">{magasin.ville} • {magasin.code}</p>
                                    </div>
                                    <span className="inline-flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur rounded-lg">
                                        <span className="text-white font-bold">{magasinTotal}</span>
                                    </span>
                                </div>
                            </div>
                            <div className="p-4">
                                {magasinProducts.length === 0 ? (
                                    <p className="text-sm text-stone-400 italic">Aucun produit</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {magasinProducts.map(item => (
                                            <li key={item.produit.id} className="flex items-center justify-between text-sm">
                                                <span className="text-stone-700 truncate flex-1 mr-2">{item.produit.nom}</span>
                                                <span className="font-bold text-primary-600">×{item.quantities[magasin.id]}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Tableau récapitulatif des produits */}
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <div className="bg-stone-50 px-4 py-3 border-b border-stone-200">
                    <h3 className="font-bold text-stone-700 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Détail des produits
                    </h3>
                </div>
                <div className="divide-y divide-stone-100">
                    {cartItems.map(item => (
                        <div key={item.produit.id} className="px-4 py-3 flex items-center justify-between">
                            <div>
                                <p className="font-medium text-stone-900">{item.produit.nom}</p>
                                <p className="text-xs text-stone-500 font-mono">{item.produit.reference}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-lg text-primary-600">{getTotalForProduct(item.produit.id)} unités</p>
                                <p className="text-xs text-stone-500">
                                    {selectedMagasins
                                        .filter(m => (item.quantities[m.id] || 0) > 0)
                                        .map(m => `${m.nom}: ${item.quantities[m.id]}`)
                                        .join(' • ')}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-stone-200">
                <button
                    onClick={onBack}
                    className="px-6 py-3 bg-stone-100 text-stone-700 rounded-xl font-semibold hover:bg-stone-200 transition-all flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Modifier le panier
                </button>
                <button
                    onClick={onValidate}
                    disabled={isSubmitting || grandTotal === 0}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Validation en cours...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Valider la commande
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
