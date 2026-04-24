/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand:  { DEFAULT: '#2563eb', hover: '#1d4ed8', light: '#eff6ff', dark: '#1e40af' },
        navy:   { DEFAULT: '#f8fafc', 2: '#ffffff', 3: '#f1f5f9', 4: '#e2e8f0' },
        slate:  { text: '#64748b' },
        accent: {
          teal: '#0d9488',
          violet: '#7c3aed',
          amber: '#d97706',
          emerald: '#059669',
        },
      },
      fontFamily: {
        sans:  ['var(--font-inter)', 'var(--font-sora)', 'system-ui', 'sans-serif'],
        display: ['var(--font-sora)', 'system-ui', 'sans-serif'],
        mono:  ['var(--font-mono)', 'monospace'],
        serif: ['var(--font-libre)', 'Georgia', 'serif'],
      },
      animation: {
        'float': 'float 8s ease-in-out infinite',
        'float-slow': 'float 12s ease-in-out infinite',
        'gradient': 'gradientShift 6s ease infinite',
        'shimmer': 'shimmer 2s infinite',
        'fade-up': 'fadeUp 0.6s ease both',
        'scale-in': 'scaleIn 0.4s ease both',
      },
      backgroundSize: {
        '200': '200% 200%',
      },
      maxWidth: {
        '8xl': '88rem',
      },
    },
  },
  plugins: [],
}
