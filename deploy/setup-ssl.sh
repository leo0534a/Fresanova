#!/bin/bash
# ============================================
# Fresanova - Configurar DuckDNS + SSL
# Ejecutar como root: bash setup-ssl.sh
# ============================================

set -e

echo "🍓 =========================================="
echo "   FRESANOVA - Configuración SSL/HTTPS"
echo "🍓 =========================================="
echo ""

# --- Pedir datos ---
read -p "📌 Tu subdominio DuckDNS (sin .duckdns.org): " DUCK_SUBDOMAIN
read -p "🔑 Tu token de DuckDNS: " DUCK_TOKEN
read -p "📧 Tu email (para Let's Encrypt): " LE_EMAIL

DOMAIN="${DUCK_SUBDOMAIN}.duckdns.org"
SERVER_IP=$(curl -4 -s ifconfig.me)

echo ""
echo "   Dominio: $DOMAIN"
echo "   IP del servidor: $SERVER_IP"
echo ""

# --- 1. Configurar DuckDNS ---
echo "🌐 [1/5] Configurando DuckDNS..."
DUCK_RESPONSE=$(curl -4 -s "https://www.duckdns.org/update?domains=${DUCK_SUBDOMAIN}&token=${DUCK_TOKEN}&ip=${SERVER_IP}")
if [ "$DUCK_RESPONSE" = "OK" ]; then
    echo "   ✅ DuckDNS actualizado correctamente: $DOMAIN -> $SERVER_IP"
else
    echo "   ❌ Error al actualizar DuckDNS. Verifica tu token y subdominio."
    exit 1
fi

# Crear cron para renovar DuckDNS cada 5 minutos
mkdir -p /home/fresanova/duckdns
cat > /home/fresanova/duckdns/duck.sh << DUCKSCRIPT
#!/bin/bash
curl -4 -s "https://www.duckdns.org/update?domains=${DUCK_SUBDOMAIN}&token=${DUCK_TOKEN}&ip=" -o /home/fresanova/duckdns/duck.log
DUCKSCRIPT
chmod 700 /home/fresanova/duckdns/duck.sh
chown -R fresanova:fresanova /home/fresanova/duckdns

# Agregar al crontab si no existe
CRON_LINE="*/5 * * * * /home/fresanova/duckdns/duck.sh >/dev/null 2>&1"
(crontab -u fresanova -l 2>/dev/null | grep -v "duckdns" ; echo "$CRON_LINE") | crontab -u fresanova -
echo "   ✅ Cron de DuckDNS configurado (actualización cada 5 min)"

# --- 2. Configurar Nginx temporal (HTTP) para Certbot ---
echo ""
echo "🌐 [2/5] Configurando Nginx temporal para verificación..."
cat > /etc/nginx/sites-available/fresanova << NGINXTEMP
server {
    listen 80;
    server_name $DOMAIN;
    server_tokens off;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    root /home/fresanova/Fresanova/frontend/dist;
    index index.html;

    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /webhook {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
    }

    location /socket.io {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINXTEMP

ln -sf /etc/nginx/sites-available/fresanova /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
echo "   ✅ Nginx temporal configurado"

# --- 3. Esperar propagación DNS ---
echo ""
echo "⏳ [3/5] Verificando propagación DNS..."
echo "   Esperando que $DOMAIN resuelva a $SERVER_IP..."
for i in {1..12}; do
    RESOLVED_IP=$(dig +short "$DOMAIN" 2>/dev/null || nslookup "$DOMAIN" 2>/dev/null | tail -1 | awk '{print $NF}')
    if [ "$RESOLVED_IP" = "$SERVER_IP" ]; then
        echo "   ✅ DNS propagado correctamente: $DOMAIN -> $RESOLVED_IP"
        break
    fi
    if [ $i -eq 12 ]; then
        echo "   ⚠️  DNS aún no propagado. Certbot podría fallar."
        echo "   Puedes esperar unos minutos y ejecutar Certbot manualmente:"
        echo "   certbot --nginx -d $DOMAIN --email $LE_EMAIL --agree-tos --non-interactive"
    fi
    echo "   Intento $i/12... esperando 10 segundos"
    sleep 10
done

# --- 4. Obtener certificado SSL ---
echo ""
echo "🔐 [4/5] Obteniendo certificado SSL con Let's Encrypt..."
certbot --nginx \
    -d "$DOMAIN" \
    --email "$LE_EMAIL" \
    --agree-tos \
    --non-interactive \
    --redirect

echo "   ✅ Certificado SSL instalado"

# --- 5. Configuración final de Nginx con seguridad completa ---
echo ""
echo "🛡️ [5/5] Aplicando configuración de seguridad final..."

# Crear configuración de rate limiting global
cat > /etc/nginx/conf.d/rate-limit.conf << 'RATELIMIT'
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=5r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
RATELIMIT

# Reconfigurar el bloque server que Certbot generó para agregar seguridad extra
# Certbot ya maneja los bloques listen 443 y los certificados
# Agregamos solo las directivas de seguridad adicionales

cat > /etc/nginx/snippets/security-headers.conf << 'SECHEADERS'
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
SECHEADERS

# Regenerar config completa de Nginx
cat > /etc/nginx/sites-available/fresanova << NGINXFINAL
# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name $DOMAIN;
    server_tokens off;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# Servidor HTTPS principal
server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # Certificados SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Headers de seguridad
    include /etc/nginx/snippets/security-headers.conf;

    # Ocultar versión
    server_tokens off;

    # Limitar tamaño de body
    client_max_body_size 10M;

    # Frontend
    root /home/fresanova/Fresanova/frontend/dist;
    index index.html;

    # Cache de assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # API
    location /api {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }

    # Rate limit estricto para login
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Webhook de WhatsApp (Twilio)
    location /webhook {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # Socket.io
    location /socket.io {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # SPA fallback
    location / {
        limit_req zone=general burst=30 nodelay;
        try_files \$uri \$uri/ /index.html;
    }

    # Bloquear archivos sensibles
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~ \.(env|git|sh)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
NGINXFINAL

nginx -t && systemctl restart nginx
echo "   ✅ Nginx configurado con seguridad completa"

# --- 6. Configurar renovación automática de SSL ---
echo ""
echo "🔄 Configurando renovación automática de SSL..."
# Certbot ya instala un timer de systemd, pero verificamos
systemctl enable certbot.timer 2>/dev/null || true
echo "   ✅ Renovación automática configurada"

# --- Resumen final ---
echo ""
echo "🍓 =========================================="
echo "   ✅ HTTPS/SSL CONFIGURADO EXITOSAMENTE"
echo "🍓 =========================================="
echo ""
echo "   🌐 Tu sitio: https://$DOMAIN"
echo "   🔐 SSL: Let's Encrypt (renovación automática)"
echo "   🛡️ Headers de seguridad: activos"
echo "   ⚡ HTTP/2: activo"
echo "   🔄 HTTP -> HTTPS: redirección automática"
echo "   🦆 DuckDNS: actualización cada 5 minutos"
echo ""
echo "   📋 Recuerda actualizar en backend/.env:"
echo "      FRONTEND_URL=https://$DOMAIN"
echo "      BACKEND_URL=https://$DOMAIN"
echo "      ALLOWED_ORIGINS=https://$DOMAIN"
echo ""
echo "   Luego reinicia la app: pm2 restart fresanova-api"
echo ""
