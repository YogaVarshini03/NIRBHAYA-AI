/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070A11',
          900: '#0B0F19',
          850: '#0E1422',
          800: '#131B2E',
          700: '#1E293B',
          600: '#334155',
        },
        electric: {
          violet: '#8B5CF6',
          'violet-dark': '#7C3AED',
          blue: '#3B82F6',
          'blue-dark': '#2563EB',
          cyan: '#06B6D4',
        },
        safety: {
          emerald: '#10B981',
          amber: '#F59E0B',
          orange: '#F97316',
          red: '#EF4444',
          'red-crimson': '#DC2626',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-violet': '0 0 25px -5px rgba(139, 92, 246, 0.35)',
        'glow-blue': '0 0 25px -5px rgba(59, 130, 246, 0.35)',
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.35)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.35)',
        'glow-red': '0 0 35px 0px rgba(239, 68, 68, 0.5)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-danger': 'pulseDanger 1.5s ease-in-out infinite',
        'ping-slow': 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        pulseDanger: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 25px rgba(239, 68, 68, 0.5)' },
          '50%': { transform: 'scale(1.03)', boxShadow: '0 0 45px rgba(239, 68, 68, 0.8)' },
        }
      }
    },
  },
  plugins: [],
}
