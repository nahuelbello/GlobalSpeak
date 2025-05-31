// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    // Si tuvieras alguna carpeta “pages/”, agrégala aquí:
    // "./pages/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#A3E635",   // Verde-amarillo cálido
        secondary: "#FACC15", // Amarillo suave
      },
      // Si necesitas más extensiones (tipografías, breakpoints, etc.), añádelas aquí
    },
  },
  plugins: [],
};