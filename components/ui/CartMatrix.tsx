'use client'

import { useCart, Magasin } from '@/lib/cart-context'

interface CartMatrixProps {
    allMagasins: Magasin[]
    mode?: 'selection' | 'quantities' | 'both'
}

export function CartMatrix({ allMagasins, mode = 'both' }: CartMatrixProps) {
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

    const showSelection = mode === 'selection' || mode === 'both'
    const showQuantities = mode === 'quantities' || mode === 'both'

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
            {showSelection && (
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
            )}

            {/* Matrice de quantités */}
            {showQuantities && (
                <>
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

                    {/* Matrice magasins (lignes) x produits (colonnes) */}
                    {cartItems.length > 0 && selectedMagasins.length > 0 && (
                        <div className="border rounded-xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-gradient-to-r from-stone-100 to-stone-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-stone-700 uppercase tracking-wider sticky left-0 bg-stone-100 z-10">
                                                Magasin
                                            </th>
                                            {cartItems.map(item => (
                                                <th key={item.produit.id} className="px-3 py-3 text-center text-xs font-bold text-stone-700 uppercase tracking-wider min-w-[100px]">
                                                    <div className="flex flex-col items-center">
                                                        <span className="line-clamp-2">{item.produit.nom}</span>
                                                        <span className="text-[10px] text-stone-500 font-normal font-mono">{item.produit.reference}</span>
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="px-4 py-3 text-center text-xs font-bold text-stone-700 uppercase tracking-wider bg-primary-100">
                                                Total
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100 bg-white">
                                        {selectedMagasins.map((magasin) => (
                                            <tr key={magasin.id} className="hover:bg-stone-50">
                                                <td className="px-4 py-3 sticky left-0 bg-white z-10">
                                                    <div>
                                                        <p className="font-medium text-stone-900 text-sm">{magasin.nom}</p>
                                                        <p className="text-xs text-stone-500 font-mono">{magasin.code}</p>
                                                    </div>
                                                </td>
                                                {cartItems.map(item => (
                                                    <td key={item.produit.id} className="px-3 py-3 text-center">
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
                                                        {getTotalForMagasin(magasin.id)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gradient-to-r from-stone-100 to-stone-200">
                                        <tr>
                                            <td className="px-4 py-3 font-bold text-stone-700 sticky left-0 bg-stone-100 z-10">
                                                TOTAL
                                            </td>
                                            {cartItems.map(item => (
                                                <td key={item.produit.id} className="px-3 py-3 text-center">
                                                    <span className="inline-flex items-center justify-center w-10 h-8 bg-stone-600 text-white rounded-lg font-bold text-sm">
                                                        {getTotalForProduct(item.produit.id)}
                                                    </span>
                                                </td>
                                            ))}
                                            <td className="px-4 py-3 text-center bg-primary-200">
                                                <span className="inline-flex items-center justify-center px-3 h-8 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg font-bold text-sm">
                                                    {getGrandTotal()} unités
                                                </span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Actions sur les produits */}
                            <div className="p-4 bg-stone-50 border-t border-stone-200">
                                <p className="text-xs text-stone-500 mb-2">Supprimer un produit :</p>
                                <div className="flex flex-wrap gap-2">
                                    {cartItems.map(item => (
                                        <button
                                            key={item.produit.id}
                                            onClick={() => removeProduct(item.produit.id)}
                                            className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors flex items-center gap-1"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            {item.produit.nom.length > 20 ? item.produit.nom.substring(0, 20) + '...' : item.produit.nom}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Message si produits mais pas de magasins */}
                    {cartItems.length > 0 && selectedMagasins.length === 0 && (
                        <div className="text-center py-12 bg-stone-50 rounded-xl border border-stone-200">
                            <p className="text-stone-600">
                                Sélectionnez des magasins dans l'onglet précédent pour afficher la matrice de quantités
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
