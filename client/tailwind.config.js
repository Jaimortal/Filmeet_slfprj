/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        royal: {
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
          950: '#0038a8', // Philippine Royal Blue
        },
        dark: {
          950: '#070B14',
          900: '#0B1120',
          800: '#111C35',
          700: '#1E2D4A',
          600: '#33476B',
        }
      }
    },
  },
  plugins: [],
}
