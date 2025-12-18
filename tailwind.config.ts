import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Nouvelle palette premium
        primary: {
          50: '#fff1f4',
          100: '#ffe1e9',
          200: '#ffc7d7',
          300: '#ff9db5',
          400: '#ff628d',
          500: '#ff3366',
          600: '#e60f52',
          700: '#c20645',
          800: '#a00841',
          900: '#880b3e',
          DEFAULT: '#ff3366',
        },
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
          DEFAULT: '#ff7b3d',
        },
        // Override des couleurs par défaut de shadcn
        border: "#e7e5e4",
        input: "#e7e5e4",
        ring: "#ff3366",
        background: "#fafaf9",
        foreground: "#1c1917",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 20px rgba(255, 51, 102, 0.15)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
