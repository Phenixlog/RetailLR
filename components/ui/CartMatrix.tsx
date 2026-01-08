'use client'

import { useCart, Magasin } from '@/lib/cart-context'

interface CartMatrixProps {
    allMagasins: Magasin[]
}

export function CartMatrix({ allMagasins }: CartMatrixProps) {
    const {
        cart,
        selectedMagasins,
        toggleMagasin,
        setMagasins,
        updateQuantity,
        removeProduct,
        getTotalForProduct,
        getTotalForMagasin,
        getGrandTotal,
    } = useCart()

    const cartItems = Array.from(cart.values())
    const allSelected = selectedMagasins.length === allMagasins.length && allMagasins.length > 0
    const noneSelected = selectedMagasins.length === 0

    // Toggle all magasins
    const handleToggleAll = () => {
        if (allSelected) {
            setMagasins([])
        } else {
            setMagasins(allMagasins)
        }
    }

    return (
        <div className="space-y-6">
            {/* Sélection des magasins */}
            <div className="bg-gradient-to-r from-stone-50 to-blue-50 rounded-xl p-4 border border-stone-200">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Magasins sélectionnés ({selectedMagasins.length}/{allMagasins.length})
                    </p>
                    <button
                        onClick={handleToggleAll}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${allSelected
                                ? 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                                : 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-md hover:shadow-lg'
                            }`}
                    >
                        {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                </div>

                {noneSelected && (
                    <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Sélectionnez au moins un magasin pour voir la matrice
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    {allMagasins.map(magasin => {
                        const isSelected = selectedMagasins.some(m => m.id === magasin.id)
                        return (
                            <button
                                key={magasin.id}
                                onClick={() => toggleMagasin(magasin)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isSelected
                                        ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-md'
                                        : 'bg-white border border-stone-200 text-stone-600 hover:border-primary-300 hover:bg-primary-50'
                                    }`}
                            >
                                <span className="flex items-center gap-1.5">
                                    {isSelected && (
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                    {magasin.nom}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Message si pas de produits */}
            {cartItems.length === 0 && (
                <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-stone-100 to-stone-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <p className="text-lg font-medium text-stone-900 mb-1">Panier vide</p>
                    <p className="text-sm text-stone-500">Ajoutez des produits depuis le catalogue</p>
                </div>
            )}

            {/* Matrice produits x magasins */}
            {cartItems.length > 0 && selectedMagasins.length > 0 && (
                <div className="border rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gradient-to-r from-stone-100 to-stone-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-stone-700 uppercase tracking-wider sticky left-0 bg-stone-100 z-10">
                                        Produit
                                    </th>
                                    {selectedMagasins.map(magasin => (
                                        <th key={magasin.id} className="px-3 py-3 text-center text-xs font-bold text-stone-700 uppercase tracking-wider min-w-[100px]">
                                            <div className="flex flex-col items-center">
                                                <span>{magasin.nom}</span>
                                                <span className="text-[10px] text-stone-500 font-normal">{magasin.code}</span>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-center text-xs font-bold text-stone-700 uppercase tracking-wider bg-primary-100">
                                        Total
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-bold text-stone-700 uppercase tracking-wider">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 bg-white">
                                {cartItems.map((item) => (
                                    <tr key={item.produit.id} className="hover:bg-stone-50">
                                        <td className="px-4 py-3 sticky left-0 bg-white z-10">
                                            <div>
                                                <p className="font-medium text-stone-900 text-sm">{item.produit.nom}</p>
                                                <p className="text-xs text-stone-500 font-mono">{item.produit.reference}</p>
                                            </div>
                                        </td>
                                        {selectedMagasins.map(magasin => (
                                            <td key={magasin.id} className="px-3 py-3 text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={item.quantities[magasin.id] || 0}
                                                    onChange={(e) => updateQuantity(item.produit.id, magasin.id, parseInt(e.target.value) || 0)}
                                                    className="w-16 px-2 py-1.5 text-center border-2 border-stone-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all font-bold text-sm"
                                                />
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 text-center bg-primary-50">
                                            <span className="inline-flex items-center justify-center w-10 h-8 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-lg font-bold text-sm">
                                                {getTotalForProduct(item.produit.id)}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <button
                                                onClick={() => removeProduct(item.produit.id)}
                                                className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                                title="Supprimer"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gradient-to-r from-stone-100 to-stone-200">
                                <tr>
                                    <td className="px-4 py-3 font-bold text-stone-700 sticky left-0 bg-stone-100 z-10">
                                        TOTAL
                                    </td>
                                    {selectedMagasins.map(magasin => (
                                        <td key={magasin.id} className="px-3 py-3 text-center">
                                            <span className="inline-flex items-center justify-center w-10 h-8 bg-stone-600 text-white rounded-lg font-bold text-sm">
                                                {getTotalForMagasin(magasin.id)}
                                            </span>
                                        </td>
                                    ))}
                                    <td className="px-4 py-3 text-center bg-primary-200">
                                        <span className="inline-flex items-center justify-center px-3 h-8 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg font-bold text-sm">
                                            {getGrandTotal()} unités
                                        </span>
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* Message si produits mais pas de magasins */}
            {cartItems.length > 0 && selectedMagasins.length === 0 && (
                <div className="text-center py-12 bg-stone-50 rounded-xl border border-stone-200">
                    <p className="text-stone-600">
                        Sélectionnez des magasins ci-dessus pour afficher la matrice de quantités
                    </p>
                </div>
            )}
        </div>
    )
}
