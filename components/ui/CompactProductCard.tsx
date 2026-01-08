'use client'

import { Produit } from '@/types/database.types'
import { cn } from '@/lib/utils'
import { Plus, Minus, Package, Tag, Moon, Ruler, ScrollText } from 'lucide-react'

interface CompactProductCardProps {
    produit: Produit & { categorie?: string }
    quantite: number
    onUpdateQuantite: (quantite: number) => void
    idx?: number
}

const CATEGORY_ICONS: Record<string, any> = {
    consommable: Package,
    echantillon_lri: Tag,
    echantillon_ampm: Moon,
    pentes: Ruler,
    tissus: ScrollText,
}

export function CompactProductCard({ produit, quantite, onUpdateQuantite, idx = 0 }: CompactProductCardProps) {
    const Icon = CATEGORY_ICONS[produit.categorie || ''] || Package
    const isInCart = quantite > 0

    return (
        <div
            className={cn(
                "group flex items-center gap-4 p-3 rounded-2xl border transition-all duration-200 animate-fadeIn bg-white",
                isInCart
                    ? "border-stone-900 shadow-md ring-1 ring-stone-900/5"
                    : "border-stone-100 hover:border-stone-300 hover:bg-stone-50/50"
            )}
            style={{ animationDelay: `${(idx % 20) * 30}ms` }}
        >
            {/* Small Category Badge / Icon */}
            <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                isInCart ? "bg-stone-900 text-white" : "bg-stone-50 text-stone-400 group-hover:bg-white"
            )}>
                <Icon className="w-5 h-5" />
            </div>

            {/* Info Section */}
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-stone-900 truncate group-hover:text-stone-700 transition-colors">
                    {produit.nom}
                </h3>
                <p className="text-[11px] font-mono text-stone-400 mt-0.5">
                    {produit.reference}
                </p>
            </div>

            {/* Controls Section */}
            <div className="flex items-center gap-2 bg-stone-50 rounded-xl p-1 border border-stone-100/50">
                <button
                    onClick={() => onUpdateQuantite(Math.max(0, quantite - 1))}
                    className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-lg transition-all",
                        quantite > 0 ? "text-stone-600 hover:bg-white hover:shadow-sm" : "text-stone-300 pointer-events-none"
                    )}
                >
                    <Minus className="w-3.5 h-3.5" />
                </button>

                <div className="w-8 text-center">
                    <span className={cn(
                        "text-xs font-black",
                        quantite > 0 ? "text-stone-900" : "text-stone-300"
                    )}>
                        {quantite || 0}
                    </span>
                </div>

                <button
                    onClick={() => onUpdateQuantite(quantite + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-600 hover:bg-white hover:shadow-sm transition-all"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    )
}
