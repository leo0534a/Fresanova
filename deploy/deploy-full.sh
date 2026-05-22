#!/bin/bash
# ============================================
# Fresanova - Despliegue completo en VPS limpio
# Ejecutar como root: bash deploy-full.sh
# ============================================

set -e

DOMAIN="fresanova.duckdns.org"
DUCK_TOKEN="e7b0d3c7-6dcf-49af-a25b-6bb3e4ff884c"
LE_EMAIL="leonardoandres.2026.z@gmail.com"
APP_DIR="/home/fresanova/Fresanova"
GIT_REPO="https://github.com/leo0534a/Fresanova.git"

echo "🍓 =========================================="
echo "   FRESANOVA - Despliegue Completo VPS"
echo "🍓 =========================================="
echo ""

# ╔══════════════════════════════════════════╗
# ║  FASE 1: Configuración del sistema       ║
# ╚══════════════════════════════════════════╝

echo "📦 [FASE 1] Actualizando sistema e instalando dependencias..."
apt update && apt upgrade -y
apt install -y curl git ufw fail2ban unzip software-properties-common dnsutils

# --- Firewall ---
echo ""
echo "🔒 Configurando firewall (UFW)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
echo "y" | ufw enable
ufw status verbose

# --- Fail2ban ---
echo ""
echo "🛡️ Configurando Fail2ban..."
cat > /etc/fail2ban/jail.local << 'FAIL2BAN'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
maxretry = 3
bantime = 7200
FAIL2BAN
systemctl enable fail2ban
systemctl restart fail2ban

# --- Usuario de aplicación ---
echo ""
echo "👤 Creando usuario fresanova..."
if id "fresanova" &>/dev/null; then
    echo "   Usuario fresanova ya existe, continuando..."
else
    adduser --disabled-password --gecos "Fresanova App" fresanova
    usermod -aG sudo fresanova
    echo "   Usuario fresanova creado."
fi

# --- Node.js 20 LTS ---
echo ""
echo "📗 Instalando Node.js 20 LTS..."
if command -v node &>/dev/null; then
    echo "   Node.js ya instalado: $(node --version)"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    echo "   Node.js instalado: $(node --version)"
fi

# --- PM2 ---
echo ""
echo "⚙️ Instalando PM2..."
npm install -g pm2

# --- Nginx ---
echo ""
echo "🌐 Instalando Nginx..."
apt install -y nginx
systemctl enable nginx
sed -i 's/# server_tokens off;/server_tokens off;/' /etc/nginx/nginx.conf

# --- Certbot ---
echo ""
echo "🔐 Instalando Certbot..."
apt install -y certbot python3-certbot-nginx

echo ""
echo "✅ [FASE 1] Sistema configurado"
echo ""

# ╔══════════════════════════════════════════╗
# ║  FASE 2: Clonar proyecto y configurar    ║
# ╚══════════════════════════════════════════╝

echo "📂 [FASE 2] Clonando proyecto desde GitHub..."

# Clonar el proyecto
if [ -d "$APP_DIR" ]; then
    echo "   Proyecto ya existe, actualizando..."
    cd "$APP_DIR"
    git pull origin main
else
    su - fresanova -c "git clone $GIT_REPO $APP_DIR"
fi

# Copiar .env de producción
echo ""
echo "📋 Configurando variables de entorno..."
cp "$APP_DIR/deploy/production.env" "$APP_DIR/backend/.env"
chmod 600 "$APP_DIR/backend/.env"

# --- Instalar dependencias del backend ---
echo ""
echo "📦 Instalando dependencias del backend..."
cd "$APP_DIR/backend"
npm install --omit=dev

# --- Construir frontend ---
echo ""
echo "🎨 Construyendo frontend..."
cd "$APP_DIR/frontend"
npm install
npm run build

if [ ! -d "$APP_DIR/frontend/dist" ]; then
    echo "❌ Error al construir el frontend"
    exit 1
fi
echo "   ✅ Frontend construido"

# --- Crear directorio de logs ---
mkdir -p "$APP_DIR/backend/logs"

# --- Permisos ---
echo ""
echo "🔒 Configurando permisos..."
chown -R fresanova:fresanova "$APP_DIR"
chmod -R 755 "$APP_DIR/frontend/dist"

echo ""
echo "✅ [FASE 2] Proyecto configurado"
echo ""

# ╔══════════════════════════════════════════╗
# ║  FASE 3: Iniciar backend con PM2         ║
# ╚══════════════════════════════════════════╝

echo "🚀 [FASE 3] Iniciando backend con PM2..."
cd "$APP_DIR/backend"

# Detener instancia anterior si existe
pm2 delete fresanova-api 2>/dev/null || true

# Iniciar como usuario fresanova
su - fresanova -c "cd $APP_DIR/backend && pm2 start src/server.js --name fresanova-api --max-memory-restart 512M --time --env production"
su - fresanova -c "pm2 save"

# Configurar PM2 para arranque automático
env PATH=$PATH:/usr/bin pm2 startup systemd -u fresanova --hp /home/fresanova 2>/dev/null || true

echo ""
echo "✅ [FASE 3] Backend corriendo"
echo ""

# ╔══════════════════════════════════════════╗
# ║  FASE 4: Configurar DuckDNS + SSL        ║
# ╚══════════════════════════════════════════╝

echo "🌐 [FASE 4] Configurando DuckDNS..."
SERVER_IP=$(curl -4 -s ifconfig.me)

DUCK_RESPONSE=$(curl -4 -s "https://www.duckdns.org/update?domains=fresanova&token=${DUCK_TOKEN}&ip=${SERVER_IP}")
if [ "$DUCK_RESPONSE" = "OK" ]; then
    echo "   ✅ DuckDNS actualizado: $DOMAIN -> $SERVER_IP"
else
    echo "   ❌ Error al actualizar DuckDNS. Verifica tu token."
    echo "   Continuando sin DuckDNS..."
fi

# Cron de DuckDNS
mkdir -p /home/fresanova/duckdns
cat > /home/fresanova/duckdns/duck.sh << DUCKSCRIPT
#!/bin/bash
curl -4 -s "https://www.duckdns.org/update?domains=fresanova&token=${DUCK_TOKEN}&ip=" -o /home/fresanova/duckdns/duck.log
DUCKSCRIPT
chmod 700 /home/fresanova/duckdns/duck.sh
chown -R fresanova:fresanova /home/fresanova/duckdns

CRON_LINE="*/5 * * * * /home/fresanova/duckdns/duck.sh >/dev/null 2>&1"
(crontab -u fresanova -l 2>/dev/null | grep -v "duckdns" ; echo "$CRON_LINE") | crontab -u fresanova -

# --- Nginx temporal para Certbot ---
echo ""
echo "🌐 Configurando Nginx para HTTP..."
cat > /etc/nginx/sites-available/fresanova << NGINXTEMP
server {
    listen 80;
    server_name $DOMAIN;
    server_tokens off;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    root $APP_DIR/frontend/dist;
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

    location /images {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
    }

    location /uploads {
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
echo "   ✅ Nginx HTTP configurado"

# --- Esperar propagación DNS ---
echo ""
echo "⏳ Verificando DNS..."
sleep 5
for i in {1..12}; do
    RESOLVED_IP=$(dig +short "$DOMAIN" 2>/dev/null || echo "")
    if [ "$RESOLVED_IP" = "$SERVER_IP" ]; then
        echo "   ✅ DNS propagado: $DOMAIN -> $RESOLVED_IP"
        break
    fi
    if [ $i -eq 12 ]; then
        echo "   ⚠️ DNS aún no propagado. Intentando Certbot de todas formas..."
    fi
    echo "   Intento $i/12... esperando 10 segundos"
    sleep 10
done

# --- SSL ---
echo ""
echo "🔐 Obteniendo certificado SSL..."
certbot --nginx \
    -d "$DOMAIN" \
    --email "$LE_EMAIL" \
    --agree-tos \
    --non-interactive \
    --redirect || {
    echo "⚠️ Certbot falló. El sitio funcionará en HTTP por ahora."
    echo "   Ejecuta manualmente después: certbot --nginx -d $DOMAIN --email $LE_EMAIL --agree-tos --non-interactive --redirect"
}

# --- Configuración final de Nginx con seguridad ---
echo ""
echo "🛡️ Aplicando seguridad final..."

mkdir -p /etc/nginx/snippets
cat > /etc/nginx/snippets/security-headers.conf << 'SECHEADERS'
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
SECHEADERS

cat > /etc/nginx/conf.d/rate-limit.conf << 'RATELIMIT'
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=5r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
RATELIMIT

# Solo reescribir si SSL se obtuvo correctamente
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    cat > /etc/nginx/sites-available/fresanova << NGINXFINAL
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

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    include /etc/nginx/snippets/security-headers.conf;

    server_tokens off;
    client_max_body_size 10M;

    root $APP_DIR/frontend/dist;
    index index.html;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

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

    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
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
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /images {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /uploads {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /socket.io {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location / {
        limit_req zone=general burst=30 nodelay;
        try_files \$uri \$uri/ /index.html;
    }

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
    echo "   ✅ Nginx con HTTPS configurado"
fi

systemctl enable certbot.timer 2>/dev/null || true

# ╔══════════════════════════════════════════╗
# ║  FASE 5: Seed de admin y verificación     ║
# ╚══════════════════════════════════════════╝

echo ""
echo "🌱 [FASE 5] Creando usuario admin..."
cd "$APP_DIR/backend"
su - fresanova -c "cd $APP_DIR/backend && node src/jobs/seedAdmin.js" || echo "   ⚠️ Seed pudo haber fallado si el admin ya existe"

echo ""
echo "🔍 Verificando estado..."
sleep 3
su - fresanova -c "pm2 status"

echo ""
echo "🍓 ════════════════════════════════════════════"
echo "   ✅ ¡FRESANOVA DESPLEGADO EXITOSAMENTE! 🎉"
echo "🍓 ════════════════════════════════════════════"
echo ""
echo "   🌐 Sitio: https://$DOMAIN"
echo "   🏥 Health: https://$DOMAIN/health"
echo "   📊 API: https://$DOMAIN/api"
echo "   📡 Webhook: https://$DOMAIN/webhook"
echo ""
echo "   👤 Admin Panel: https://$DOMAIN/login"
echo "   📧 Email: admin@fresanova.com"
echo "   🔑 Contraseña: Fn-0BW2GIGSyqDCNG9Px!"
echo ""
echo "   📋 Comandos útiles:"
echo "   pm2 status                    — Ver estado"
echo "   pm2 logs fresanova-api        — Ver logs"
echo "   pm2 restart fresanova-api     — Reiniciar"
echo ""
echo "   ⚠️ RECUERDA configurar el webhook de Twilio:"
echo "   URL: https://$DOMAIN/webhook"
echo "   Método: POST"
echo ""
