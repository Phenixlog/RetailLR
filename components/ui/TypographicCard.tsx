'use client'

import { Produit } from '@/types/database.types'
import { cn } from '@/lib/utils'
import { Plus, Minus, Package, Tag, Moon, Ruler, ScrollText } from 'lucide-react'

interface TypographicCardProps {
    produit: Produit & { categorie?: string }
    quantite: number
    onUpdateQuantite: (quantite: number) => void
    idx?: number
}

const CATEGORY_CONFIG: Record<string, { icon: any, color: string, lightColor: string }> = {
    consommable: { icon: Package, color: 'text-blue-600', lightColor: 'bg-blue-50/50' },
    echantillon_lri: { icon: Tag, color: 'text-purple-600', lightColor: 'bg-purple-50/50' },
    echantillon_ampm: { icon: Moon, color: 'text-indigo-600', lightColor: 'bg-indigo-50/50' },
    pentes: { icon: Ruler, color: 'text-orange-600', lightColor: 'bg-orange-50/50' },
    tissus: { icon: ScrollText, color: 'text-pink-600', lightColor: 'bg-pink-50/50' },
}

export function TypographicCard({ produit, quantite, onUpdateQuantite, idx = 0 }: TypographicCardProps) {
    const config = CATEGORY_CONFIG[produit.categorie || ''] || { icon: Package, color: 'text-stone-400', lightColor: 'bg-stone-50/50' }
    const Icon = config.icon
    const initial = produit.nom.charAt(0).toUpperCase()

    return (
        <div
            className="group relative flex flex-col bg-white rounded-[2rem] border border-stone-100 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-stone-200/50 hover:-translate-y-1 animate-fadeIn"
            style={{ animationDelay: `${idx * 40}ms` }}
        >
            {/* Visual Area (No Image) */}
            <div className={cn(
                "relative aspect-[5/4] flex items-center justify-center overflow-hidden transition-colors duration-500",
                config.lightColor
            )}>
                {/* Subtle Decorative Initial */}
                <span className="absolute inset-0 flex items-center justify-center text-[10rem] font-black text-stone-900/5 select-none transition-transform duration-700 group-hover:scale-110">
                    {initial}
                </span>

                {/* Floating Category Icon */}
                <div className={cn(
                    "relative z-10 w-20 h-20 rounded-[2.5rem] bg-white shadow-xl shadow-stone-200/20 flex items-center justify-center transition-all duration-500 group-hover:scale-110",
                    config.color
                )}>
                    <Icon className="w-8 h-8" />
                </div>

                {/* Selection HUD (Active when quantite > 0) */}
                {quantite > 0 && (
                    <div className="absolute top-4 right-4 animate-scaleUp">
                        <div className="flex items-center justify-center w-10 h-10 bg-stone-900 text-white rounded-2xl font-bold shadow-lg">
                            {quantite}
                        </div>
                    </div>
                )}

                {/* Category Label Overlay */}
                <div className="absolute bottom-4 left-4">
                    <div className="px-3 py-1.5 bg-white/90 backdrop-blur-md border border-white/20 rounded-xl shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                            {produit.categorie?.replace('_', ' ') || 'Produit'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Info Area */}
            <div className="p-6 flex flex-col flex-1">
                <div className="mb-4">
                    <h3 className="text-base font-bold text-stone-900 line-clamp-1 group-hover:text-stone-600 transition-colors">
                        {produit.nom}
                    </h3>
                    <p className="text-xs font-mono font-medium text-stone-400 mt-0.5 tracking-tight">
                        {produit.reference}
                    </p>
                </div>

                <div className="mt-auto flex items-center gap-2">
                    <button
                        onClick={() => onUpdateQuantite(Math.max(0, quantite - 1))}
                        className="w-11 h-11 flex items-center justify-center rounded-2xl bg-stone-50 text-stone-400 hover:bg-stone-900 hover:text-white transition-all duration-200"
                    >
                        <Minus className="w-4 h-4" />
                    </button>

                    <div className="flex-1 h-11 flex items-center justify-center bg-stone-50 border border-stone-100 rounded-2xl">
                        <span className={cn(
                            "text-sm font-bold transition-all duration-300",
                            quantite > 0 ? "text-stone-900" : "text-stone-300"
                        )}>
                            {quantite || 0}
                        </span>
                    </div>

                    <button
                        onClick={() => onUpdateQuantite(quantite + 1)}
                        className="w-11 h-11 flex items-center justify-center rounded-2xl bg-stone-900 text-white hover:bg-stone-800 shadow-lg shadow-stone-900/20 active:scale-95 transition-all duration-200"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
