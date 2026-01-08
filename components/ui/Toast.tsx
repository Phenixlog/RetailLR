'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface Toast {
    id: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
}

interface ToastContextType {
    showToast: (message: string, type?: Toast['type']) => void
    showSuccess: (message: string) => void
    showError: (message: string) => void
    showWarning: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
        const id = Date.now().toString()
        setToasts(prev => [...prev, { id, message, type }])

        // Auto-dismiss after 4 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 4000)
    }, [])

    const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast])
    const showError = useCallback((message: string) => showToast(message, 'error'), [showToast])
    const showWarning = useCallback((message: string) => showToast(message, 'warning'), [showToast])

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }

    const getToastStyles = (type: Toast['type']) => {
        switch (type) {
            case 'success':
                return 'bg-gradient-to-r from-green-500 to-emerald-600 border-green-400'
            case 'error':
                return 'bg-gradient-to-r from-red-500 to-rose-600 border-red-400'
            case 'warning':
                return 'bg-gradient-to-r from-amber-500 to-orange-600 border-amber-400'
            case 'info':
            default:
                return 'bg-gradient-to-r from-blue-500 to-indigo-600 border-blue-400'
        }
    }

    const getIcon = (type: Toast['type']) => {
        switch (type) {
            case 'success':
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )
            case 'error':
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )
            case 'warning':
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                )
            case 'info':
            default:
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )
        }
    }

    return (
        <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast, index) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-xl text-white shadow-2xl border-l-4 backdrop-blur-sm animate-slideUp ${getToastStyles(toast.type)}`}
                        style={{
                            animationDelay: `${index * 50}ms`,
                            minWidth: '300px',
                            maxWidth: '450px'
                        }}
                    >
                        <div className="flex-shrink-0">
                            {getIcon(toast.type)}
                        </div>
                        <p className="flex-1 font-medium text-sm leading-snug">{toast.message}</p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="flex-shrink-0 p-1 rounded-lg hover:bg-white/20 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}
