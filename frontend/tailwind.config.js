/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand:  { DEFAULT: '#e85d26', hover: '#ff7a45', light: '#fff3ee' },
        navy:   { DEFAULT: '#0c1420', 2: '#111d2e', 3: '#162238' },
        slate:  { text: '#94a3b8' },
      },
      fontFamily: {
        sans:  ['var(--font-sora)', 'system-ui', 'sans-serif'],
        mono:  ['var(--font-mono)', 'monospace'],
        serif: ['var(--font-libre)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
