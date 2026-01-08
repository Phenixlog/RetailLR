'use client'

import { LucideIcon, Boxes, Tag, Moon, Ruler, ScrollText, LayoutPanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Category {
    id: string
    label: string
    icon: LucideIcon
    color: string
}

export const CATEGORIES: Category[] = [
    { id: 'consommable', label: 'Consommable', icon: Boxes, color: 'text-blue-500 bg-blue-50' },
    { id: 'echantillon_lri', label: 'Échantillon LRI', icon: Tag, color: 'text-purple-500 bg-purple-50' },
    { id: 'echantillon_ampm', label: 'Échantillon AM.PM', icon: Moon, color: 'text-indigo-500 bg-indigo-50' },
    { id: 'pentes', label: 'Pentes', icon: Ruler, color: 'text-orange-500 bg-orange-50' },
    { id: 'tissus', label: 'Tissus', icon: ScrollText, color: 'text-pink-500 bg-pink-50' },
]

interface CategorySidebarProps {
    selectedCategory: string | null
    onSelectCategory: (id: string | null) => void
    totalProducts: number
}

export function CategorySidebar({ selectedCategory, onSelectCategory, totalProducts }: CategorySidebarProps) {
    return (
        <div className="w-64 flex-shrink-0 flex flex-col gap-2 animate-fadeIn">
            <div className="px-4 py-2 border-b border-stone-100 mb-2">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Famille de produits</h2>
            </div>

            <button
                onClick={() => onSelectCategory(null)}
                className={cn(
                    "group flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300",
                    !selectedCategory
                        ? "bg-stone-900 text-white shadow-xl shadow-stone-900/10 translate-x-1"
                        : "hover:bg-stone-100 text-stone-600 hover:translate-x-1"
                )}
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-xl transition-colors",
                        !selectedCategory ? "bg-white/10" : "bg-stone-50 group-hover:bg-white"
                    )}>
                        <LayoutPanelLeft className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm">Tous les produits</span>
                </div>
                {!selectedCategory && (
                    <span className="text-[10px] font-mono opacity-60 bg-white/20 px-1.5 rounded-md">{totalProducts}</span>
                )}
            </button>

            <div className="space-y-1 mt-2">
                {CATEGORIES.map((cat) => {
                    const Icon = cat.icon
                    const isActive = selectedCategory === cat.id

                    return (
                        <button
                            key={cat.id}
                            onClick={() => onSelectCategory(cat.id)}
                            className={cn(
                                "group w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300",
                                isActive
                                    ? "bg-white shadow-lg border border-stone-100 translate-x-1"
                                    : "text-stone-500 hover:bg-stone-50 hover:translate-x-1"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2 rounded-xl transition-all duration-300",
                                    isActive ? cat.color : "bg-stone-50 group-hover:bg-white text-stone-400 group-hover:text-stone-600"
                                )}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <span className={cn(
                                    "text-sm transition-all duration-300",
                                    isActive ? "font-bold text-stone-900" : "font-medium"
                                )}>
                                    {cat.label}
                                </span>
                            </div>
                            {isActive && (
                                <div className="w-1.5 h-1.5 rounded-full bg-stone-900 animate-pulse" />
                            )}
                        </button>
                    )
                })}
            </div>

            <div className="mt-auto p-4 bg-gradient-to-br from-stone-50/50 to-stone-100/50 rounded-3xl border border-stone-100/50 mt-8">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Statut Catalogue</p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-stone-600">Mise à jour aujourd'hui</span>
                </div>
            </div>
        </div>
    )
}
