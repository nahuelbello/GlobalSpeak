// postcss.config.js
console.log('🛠 cargando PostCSS config desde', __dirname);

module.exports = {
  plugins: {
    // Ahora usamos @tailwindcss/postcss en lugar de tailwindcss
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};