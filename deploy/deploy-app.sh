#!/bin/bash
# ============================================
# Fresanova - Script de despliegue de la app
# Ejecutar como usuario fresanova
# ============================================

set -e

APP_DIR="/home/fresanova/Fresanova"

echo "🍓 =========================================="
echo "   FRESANOVA - Desplegando aplicación"
echo "🍓 =========================================="

# --- 1. Verificar que estamos en el directorio correcto ---
if [ ! -d "$APP_DIR" ]; then
    echo "❌ No se encontró $APP_DIR"
    echo "   Primero sube el proyecto al servidor."
    exit 1
fi

cd "$APP_DIR"

# --- 2. Instalar dependencias del backend ---
echo ""
echo "📦 [1/5] Instalando dependencias del backend..."
cd "$APP_DIR/backend"
npm install --omit=dev

# --- 3. Verificar .env ---
echo ""
echo "📋 [2/5] Verificando archivo .env..."
if [ ! -f "$APP_DIR/backend/.env" ]; then
    echo "❌ No se encontró backend/.env"
    echo "   Crea el archivo .env antes de continuar."
    echo "   Usa .env.example como referencia."
    exit 1
fi
echo "   ✅ .env encontrado"

# --- 4. Construir frontend ---
echo ""
echo "🎨 [3/5] Construyendo frontend..."
cd "$APP_DIR/frontend"
npm install
npm run build

if [ ! -d "$APP_DIR/frontend/dist" ]; then
    echo "❌ Error al construir el frontend"
    exit 1
fi
echo "   ✅ Frontend construido en /frontend/dist"

# --- 5. Configurar permisos ---
echo ""
echo "🔒 [4/5] Configurando permisos..."
chmod 600 "$APP_DIR/backend/.env"
chmod -R 755 "$APP_DIR/frontend/dist"

# --- 6. Iniciar/Reiniciar con PM2 ---
echo ""
echo "🚀 [5/5] Iniciando backend con PM2..."
cd "$APP_DIR/backend"

# Detener instancia anterior si existe
pm2 delete fresanova-api 2>/dev/null || true

# Iniciar nueva instancia
pm2 start src/server.js \
    --name fresanova-api \
    --max-memory-restart 512M \
    --time \
    --env production

pm2 save

echo ""
echo "🍓 =========================================="
echo "   ✅ APLICACIÓN DESPLEGADA"
echo "🍓 =========================================="
echo ""
pm2 status
echo ""
echo "   Siguiente paso: configurar Nginx y SSL"
echo ""
