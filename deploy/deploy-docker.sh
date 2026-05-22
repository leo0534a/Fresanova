#!/bin/bash
# ============================================
# Fresanova - Despliegue con Docker + Traefik
# Ejecutar como root en el VPS
# ============================================

set -e

DOMAIN="fresanova.duckdns.org"
APP_DIR="/home/fresanova/Fresanova"

echo "🍓 =========================================="
echo "   FRESANOVA - Despliegue Docker + Traefik"
echo "🍓 =========================================="

# --- 1. Detener y deshabilitar Nginx (Traefik se encarga) ---
echo ""
echo "🔧 [1/6] Deshabilitando Nginx (Traefik maneja el proxy)..."
systemctl stop nginx 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true
echo "   ✅ Nginx deshabilitado"

# --- 2. Verificar archivo .env ---
echo ""
echo "📋 [2/6] Verificando archivo .env..."
if [ ! -f "$APP_DIR/backend/.env" ]; then
    echo "   ❌ No se encontró backend/.env"
    echo "   Crea el archivo .env antes de continuar."
    exit 1
fi
echo "   ✅ .env encontrado"

# --- 3. Detectar la red de EasyPanel/Traefik ---
echo ""
echo "🌐 [3/6] Detectando red de Traefik..."
TRAEFIK_NETWORK=$(docker network ls --format '{{.Name}}' | grep -E 'easypanel' | head -1)
if [ -z "$TRAEFIK_NETWORK" ]; then
    echo "   ⚠️  No se encontró red de EasyPanel. Buscando red de Traefik..."
    TRAEFIK_NETWORK=$(docker inspect $(docker ps -q -f name=traefik) --format '{{range $net,$v := .NetworkSettings.Networks}}{{$net}}{{end}}' 2>/dev/null | head -1)
fi

if [ -z "$TRAEFIK_NETWORK" ]; then
    echo "   ❌ No se pudo detectar la red de Traefik."
    echo "   Ejecuta: docker network ls"
    echo "   Y busca la red que usa EasyPanel/Traefik."
    exit 1
fi
echo "   ✅ Red detectada: $TRAEFIK_NETWORK"

# --- 4. Construir imagen Docker ---
echo ""
echo "🐳 [4/6] Construyendo imagen Docker..."
cd "$APP_DIR"
docker build -t fresanova:latest .
echo "   ✅ Imagen construida"

# --- 5. Eliminar servicio anterior si existe ---
echo ""
echo "🔄 [5/6] Eliminando servicio anterior si existe..."
docker service rm fresanova 2>/dev/null || true
docker stop fresanova 2>/dev/null || true
docker rm fresanova 2>/dev/null || true
sleep 3

# --- 6. Desplegar como servicio Docker Swarm ---
echo ""
echo "🚀 [6/6] Desplegando servicio con Traefik..."
docker service create \
  --name fresanova \
  --network "$TRAEFIK_NETWORK" \
  --env-file "$APP_DIR/backend/.env" \
  --mount type=bind,source="$APP_DIR/backend/.env",target=/app/backend/.env,readonly \
  --label traefik.enable=true \
  --label "traefik.http.routers.fresanova.rule=Host(\`$DOMAIN\`)" \
  --label "traefik.http.routers.fresanova.entrypoints=https" \
  --label "traefik.http.routers.fresanova.tls=true" \
  --label "traefik.http.routers.fresanova.tls.certresolver=letsencrypt" \
  --label "traefik.http.services.fresanova.loadbalancer.server.port=5000" \
  --label "traefik.http.routers.fresanova-http.rule=Host(\`$DOMAIN\`)" \
  --label "traefik.http.routers.fresanova-http.entrypoints=http" \
  --label "traefik.http.routers.fresanova-http.middlewares=fresanova-redirect" \
  --label "traefik.http.middlewares.fresanova-redirect.redirectscheme.scheme=https" \
  --label "traefik.http.middlewares.fresanova-redirect.redirectscheme.permanent=true" \
  --replicas 1 \
  --restart-condition on-failure \
  --restart-max-attempts 5 \
  --limit-memory 512M \
  fresanova:latest

echo ""
echo "⏳ Esperando que el servicio arranque..."
sleep 10

# Verificar estado
SERVICE_STATE=$(docker service ps fresanova --format '{{.CurrentState}}' | head -1)
echo "   Estado: $SERVICE_STATE"

echo ""
echo "🍓 =========================================="
echo "   ✅ FRESANOVA DESPLEGADO"
echo "🍓 =========================================="
echo ""
echo "   🌐 Sitio: https://$DOMAIN"
echo "   🔐 SSL: Let's Encrypt (automático via Traefik)"
echo "   🔄 HTTP -> HTTPS: redirección automática"
echo ""
echo "   📋 Comandos útiles:"
echo "      docker service logs fresanova -f    # Ver logs"
echo "      docker service ps fresanova         # Ver estado"
echo "      docker service rm fresanova         # Eliminar"
echo ""
