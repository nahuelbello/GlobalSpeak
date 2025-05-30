// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './app/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#A3E635',
        secondary: '#FACC15',
      }
    },
  },
  plugins: [
    // si quieres seguir usando @theme inline:
    // require('tailwindcss-theme-inline'),
  ],
}