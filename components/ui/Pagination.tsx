'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

    // Logic to show a limited number of page buttons with ellipsis if needed
    // For now keep it simple as 20 per page on a catalog of ~500 items is ~25 pages
    const visiblePages = pages.filter(p =>
        p === 1 ||
        p === totalPages ||
        (p >= currentPage - 2 && p <= currentPage + 2)
    )

    return (
        <div className="flex items-center justify-center gap-2 mt-8 py-4 border-t border-stone-100">
            <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-stone-200 text-stone-600 hover:border-stone-900 hover:text-stone-900 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1">
                {pages.map((page, idx) => {
                    const isVisible = visiblePages.includes(page)
                    const prevPage = pages[idx - 1]
                    const showEllipsis = isVisible && prevPage && !visiblePages.includes(prevPage)

                    return (
                        <div key={page} className="flex items-center gap-1">
                            {showEllipsis && <span className="text-stone-400 px-1 text-xs font-bold">...</span>}
                            {isVisible && (
                                <button
                                    onClick={() => onPageChange(page)}
                                    className={cn(
                                        "w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all",
                                        currentPage === page
                                            ? "bg-stone-900 text-white shadow-lg shadow-stone-900/10"
                                            : "bg-white border border-stone-200 text-stone-600 hover:border-stone-900 hover:text-stone-900"
                                    )}
                                >
                                    {page}
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>

            <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-stone-200 text-stone-600 hover:border-stone-900 hover:text-stone-900 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
                <ChevronRight className="w-5 h-5" />
            </button>

            <div className="ml-4 text-xs font-bold text-stone-400 uppercase tracking-widest">
                Page {currentPage} sur {totalPages}
            </div>
        </div>
    )
}
