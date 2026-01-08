'use client'

import { useCart } from '@/lib/cart-context'

interface ProductCardWithCartProps {
    produit: {
        id: string
        nom: string
        reference: string
        categorie: string
        image_url?: string
        modele?: string
    }
}

export function ProductCardWithCart({ produit }: ProductCardWithCartProps) {
    const { addProduct, removeProduct, isProductInCart, getTotalForProduct, selectedMagasins } = useCart()

    const inCart = isProductInCart(produit.id)
    const totalQty = getTotalForProduct(produit.id)
    const noMagasinsSelected = selectedMagasins.length === 0

    const handleToggle = () => {
        if (inCart) {
            removeProduct(produit.id)
        } else {
            addProduct(produit)
        }
    }

    return (
        <div className={`relative group rounded-xl border-2 transition-all duration-200 overflow-hidden ${inCart
                ? 'border-primary-400 bg-gradient-to-br from-primary-50 to-accent-50 shadow-lg shadow-primary-500/10'
                : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-md'
            }`}>
            {/* Badge quantité */}
            {inCart && totalQty > 0 && (
                <div className="absolute top-2 right-2 z-10">
                    <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-bold rounded-full shadow-lg">
                        {totalQty}
                    </span>
                </div>
            )}

            {/* Image placeholder */}
            <div className="aspect-square bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
                {produit.image_url ? (
                    <img src={produit.image_url} alt={produit.nom} className="w-full h-full object-cover" />
                ) : (
                    <svg className="w-16 h-16 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <p className="text-xs text-stone-500 font-medium mb-1 uppercase tracking-wide">{produit.categorie}</p>
                <h3 className="font-bold text-stone-900 mb-1 line-clamp-2 text-sm">{produit.nom}</h3>
                <p className="text-xs text-stone-500 font-mono">{produit.reference}</p>
                {produit.modele && (
                    <p className="text-xs text-primary-600 mt-1 font-medium">{produit.modele}</p>
                )}
            </div>

            {/* Action button */}
            <div className="px-4 pb-4">
                <button
                    onClick={handleToggle}
                    disabled={noMagasinsSelected && !inCart}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${inCart
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : noMagasinsSelected
                                ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-primary-500 to-accent-500 text-white hover:shadow-lg hover:shadow-primary-500/30'
                        }`}
                >
                    {inCart ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Retirer
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {noMagasinsSelected ? 'Sélectionnez des magasins' : 'Ajouter au panier'}
                        </span>
                    )}
                </button>
            </div>
        </div>
    )
}
