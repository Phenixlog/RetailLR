import React from 'react'
import { Badge } from './Badge'

interface StatusBadgeProps {
  status: string
  showDot?: boolean
}

export function StatusBadge({ status, showDot = false }: StatusBadgeProps) {
  const statusConfig: Record<string, { label: string; variant: any }> = {
    en_attente: { label: 'En attente', variant: 'warning' },
    confirmee: { label: 'Confirmée', variant: 'success' },
    en_preparation: { label: 'En préparation', variant: 'secondary' },
    envoyee: { label: 'Envoyée', variant: 'purple' },
  }

  const config = statusConfig[status] || { label: status, variant: 'default' }

  return (
    <Badge variant={config.variant} dot={showDot}>
      {config.label}
    </Badge>
  )
}
