'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

// Types
export interface CartItem {
    produit: {
        id: string
        nom: string
        reference: string
        categorie: string
        image_url?: string
    }
    quantities: Record<string, number> // magasin_id -> quantité
}

export interface Magasin {
    id: string
    nom: string
    code: string
    ville: string
}

interface CartContextType {
    // State
    cart: Map<string, CartItem> // produit_id -> CartItem
    selectedMagasins: Magasin[]

    // Actions
    addProduct: (produit: CartItem['produit']) => void
    removeProduct: (produitId: string) => void
    updateQuantity: (produitId: string, magasinId: string, quantity: number) => void
    setQuantityForAllMagasins: (produitId: string, quantity: number) => void
    toggleMagasin: (magasin: Magasin) => void
    setMagasins: (magasins: Magasin[]) => void
    clearCart: () => void

    // Computed
    getTotalForProduct: (produitId: string) => number
    getTotalForMagasin: (magasinId: string) => number
    getGrandTotal: () => number
    getCartItemCount: () => number
    isProductInCart: (produitId: string) => boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
    const [cart, setCart] = useState<Map<string, CartItem>>(new Map())
    const [selectedMagasins, setSelectedMagasins] = useState<Magasin[]>([])

    // Add product to cart with quantity 1 for all selected magasins
    const addProduct = (produit: CartItem['produit']) => {
        setCart(prev => {
            const newCart = new Map(prev)
            const quantities: Record<string, number> = {}
            selectedMagasins.forEach(m => {
                quantities[m.id] = 1
            })
            newCart.set(produit.id, { produit, quantities })
            return newCart
        })
    }

    // Remove product from cart
    const removeProduct = (produitId: string) => {
        setCart(prev => {
            const newCart = new Map(prev)
            newCart.delete(produitId)
            return newCart
        })
    }

    // Update quantity for a specific product x magasin cell
    const updateQuantity = (produitId: string, magasinId: string, quantity: number) => {
        setCart(prev => {
            const newCart = new Map(prev)
            const item = newCart.get(produitId)
            if (item) {
                item.quantities[magasinId] = Math.max(0, quantity)
                newCart.set(produitId, { ...item })
            }
            return newCart
        })
    }

    // Set same quantity for all magasins for a product
    const setQuantityForAllMagasins = (produitId: string, quantity: number) => {
        setCart(prev => {
            const newCart = new Map(prev)
            const item = newCart.get(produitId)
            if (item) {
                selectedMagasins.forEach(m => {
                    item.quantities[m.id] = Math.max(0, quantity)
                })
                newCart.set(produitId, { ...item })
            }
            return newCart
        })
    }

    // Toggle magasin selection
    const toggleMagasin = (magasin: Magasin) => {
        setSelectedMagasins(prev => {
            const exists = prev.find(m => m.id === magasin.id)
            if (exists) {
                return prev.filter(m => m.id !== magasin.id)
            } else {
                // Add magasin and set quantity 0 for all products in cart
                setCart(prevCart => {
                    const newCart = new Map(prevCart)
                    newCart.forEach((item, key) => {
                        item.quantities[magasin.id] = 0
                        newCart.set(key, { ...item })
                    })
                    return newCart
                })
                return [...prev, magasin]
            }
        })
    }

    // Set all magasins at once
    const setMagasins = (magasins: Magasin[]) => {
        setSelectedMagasins(magasins)
        // Initialize quantities for new magasins
        setCart(prevCart => {
            const newCart = new Map(prevCart)
            newCart.forEach((item, key) => {
                magasins.forEach(m => {
                    if (!(m.id in item.quantities)) {
                        item.quantities[m.id] = 0
                    }
                })
                newCart.set(key, { ...item })
            })
            return newCart
        })
    }

    // Clear entire cart
    const clearCart = () => {
        setCart(new Map())
    }

    // Get total quantity for a product (sum across all magasins)
    const getTotalForProduct = (produitId: string): number => {
        const item = cart.get(produitId)
        if (!item) return 0
        return selectedMagasins.reduce((sum, m) => sum + (item.quantities[m.id] || 0), 0)
    }

    // Get total quantity for a magasin (sum across all products)
    const getTotalForMagasin = (magasinId: string): number => {
        let total = 0
        cart.forEach(item => {
            total += item.quantities[magasinId] || 0
        })
        return total
    }

    // Get grand total (all products x all magasins)
    const getGrandTotal = (): number => {
        let total = 0
        cart.forEach(item => {
            selectedMagasins.forEach(m => {
                total += item.quantities[m.id] || 0
            })
        })
        return total
    }

    // Get number of unique products in cart
    const getCartItemCount = (): number => {
        return cart.size
    }

    // Check if product is in cart
    const isProductInCart = (produitId: string): boolean => {
        return cart.has(produitId)
    }

    return (
        <CartContext.Provider
            value={{
                cart,
                selectedMagasins,
                addProduct,
                removeProduct,
                updateQuantity,
                setQuantityForAllMagasins,
                toggleMagasin,
                setMagasins,
                clearCart,
                getTotalForProduct,
                getTotalForMagasin,
                getGrandTotal,
                getCartItemCount,
                isProductInCart,
            }}
        >
            {children}
        </CartContext.Provider>
    )
}

export function useCart() {
    const context = useContext(CartContext)
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider')
    }
    return context
}
