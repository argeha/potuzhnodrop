/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './js/**/*.js'],
  safelist: ['text-emerald-300', 'text-red-300'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0B0E14',
          card: '#121722',
          border: '#1E2638',
          accent: '#F59E0B',
        },
      },
    },
  },
  plugins: [],
}
