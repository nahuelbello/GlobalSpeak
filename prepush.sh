#!/usr/bin/env bash
set -euo pipefail

echo "🔄 1. Limpiando e instalando dependencias raíz…"
rm -rf node_modules package-lock.json
npm install

echo "🔄 2. Instalando deps en frontend…"
cd frontend
rm -rf node_modules package-lock.json
npm install

echo "🔄 3. Instalando deps en backend…"
cd ../backend
rm -rf node_modules package-lock.json
npm install

echo "✅ Dependencias OK"

echo "🔎 4. Comprobando variables de entorno…"
[ -f ../frontend/.env.local ] && echo "  • frontend/.env.local encontrado" \
  || { echo "❌ Falta frontend/.env.local"; exit 1; }
[ -f .env ] && echo "  • backend/.env encontrado" \
  || { echo "❌ Falta backend/.env"; exit 1; }

echo "✅ Variables de entorno OK"

echo "🚀 5. Iniciando backend en prod…"
npm start & BACKEND_PID=$!
sleep 3
curl -sf http://localhost:4000/api/ping \
  && echo "  • Backend OK" \
  || { echo "❌ Backend fallo"; kill $BACKEND_PID; exit 1; }
kill $BACKEND_PID

echo "🚀 6. Build + start frontend en prod…"
cd ../frontend
npm run build
npm start & FRONTEND_PID=$!
sleep 5
curl -sf http://localhost:3000/ >/dev/null \
  && echo "  • Frontend OK" \
  || { echo "❌ Frontend fallo"; kill $FRONTEND_PID; exit 1; }
kill $FRONTEND_PID

echo "🎉 ¡Todo funcionó correctamente! Podés pushear sin miedo."