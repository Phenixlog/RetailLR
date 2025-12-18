// 🎨 Design System Premium - La Redoute x Phenix Log
// Vision: Élégant, féminin, minimaliste, SaaS 2025

export const designTokens = {
  colors: {
    // Palette principale - Rose sophistiqué
    primary: {
      50: '#fff1f4',
      100: '#ffe1e9',
      200: '#ffc7d7',
      300: '#ff9db5',
      400: '#ff628d',
      500: '#ff3366', // Rose signature La Redoute
      600: '#e60f52',
      700: '#c20645',
      800: '#a00841',
      900: '#880b3e',
    },
    // Accent - Corail chaleureux
    accent: {
      50: '#fff8f5',
      100: '#fff0e8',
      200: '#ffdcc6',
      300: '#ffc099',
      400: '#ff9a60',
      500: '#ff7b3d',
      600: '#f25c1a',
      700: '#d94a12',
      800: '#b33e13',
      900: '#923616',
    },
    // Gris chauds
    neutral: {
      50: '#fafaf9',
      100: '#f5f5f4',
      200: '#e7e5e4',
      300: '#d6d3d1',
      400: '#a8a29e',
      500: '#78716c',
      600: '#57534e',
      700: '#44403c',
      800: '#292524',
      900: '#1c1917',
    },
    // Succès - Vert doux
    success: {
      50: '#f0fdf5',
      100: '#dcfce8',
      200: '#bbf7d1',
      300: '#86efad',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    // Warning - Ambre
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    // Info - Bleu pastel
    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
  },

  // Espacements harmonieux (échelle 8pt)
  spacing: {
    xs: '0.5rem',     // 8px
    sm: '0.75rem',    // 12px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
    '4xl': '6rem',    // 96px
  },

  // Border radius doux
  borderRadius: {
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    full: '9999px',
  },

  // Ombres subtiles et élégantes
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.05)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.15)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    glow: '0 0 20px rgb(255 51 102 / 0.15)',
  },

  // Transitions fluides
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: '500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Typography scale
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },

  // Animations
  animations: {
    fadeIn: 'fadeIn 400ms cubic-bezier(0.4, 0, 0.2, 1)',
    slideUp: 'slideUp 400ms cubic-bezier(0.4, 0, 0.2, 1)',
    slideDown: 'slideDown 400ms cubic-bezier(0.4, 0, 0.2, 1)',
    scaleIn: 'scaleIn 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    float: 'float 3s ease-in-out infinite',
    pulse: 'pulse 2s ease-in-out infinite',
    shimmer: 'shimmer 2s linear infinite',
  },
}

export type DesignTokens = typeof designTokens
