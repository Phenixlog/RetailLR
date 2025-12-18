import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// Format statut
export function formatStatut(statut: string): string {
  const statuts: Record<string, string> = {
    en_attente: 'En attente',
    en_preparation: 'En préparation',
    confirmee: 'Confirmée',
    envoyee: 'Envoyée',
  }
  return statuts[statut] || statut
}

// Format role
export function formatRole(role: string): string {
  const roles: Record<string, string> = {
    la_redoute: 'La Redoute',
    magasin: 'Magasin',
    admin: 'Admin Phenix Log',
  }
  return roles[role] || role
}

// Get badge color for statut
export function getStatutColor(statut: string): string {
  const colors: Record<string, string> = {
    en_attente: 'bg-yellow-100 text-yellow-800',
    en_preparation: 'bg-blue-100 text-blue-800',
    confirmee: 'bg-green-100 text-green-800',
    envoyee: 'bg-purple-100 text-purple-800',
  }
  return colors[statut] || 'bg-gray-100 text-gray-800'
}
