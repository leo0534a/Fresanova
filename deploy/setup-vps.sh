#!/bin/bash
# ============================================
# Fresanova - Script de configuración del VPS
# Ejecutar como root: bash setup-vps.sh
# ============================================

set -e

echo "🍓 =========================================="
echo "   FRESANOVA - Configuración del VPS"
echo "🍓 =========================================="

# --- 1. Actualizar sistema ---
echo ""
echo "📦 [1/8] Actualizando sistema..."
apt update && apt upgrade -y
apt install -y curl git ufw fail2ban unzip software-properties-common

# --- 2. Configurar Firewall ---
echo ""
echo "🔒 [2/8] Configurando firewall (UFW)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
echo "y" | ufw enable
ufw status verbose

# --- 3. Configurar Fail2ban ---
echo ""
echo "🛡️ [3/8] Configurando Fail2ban..."
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

# --- 4. Crear usuario de aplicación ---
echo ""
echo "👤 [4/8] Creando usuario fresanova..."
if id "fresanova" &>/dev/null; then
    echo "   Usuario fresanova ya existe, continuando..."
else
    adduser --disabled-password --gecos "Fresanova App" fresanova
    usermod -aG sudo fresanova
    echo "   Usuario fresanova creado."
    echo "   ⚠️  Configura contraseña después con: passwd fresanova"
fi

# --- 5. Instalar Node.js 20 LTS ---
echo ""
echo "📗 [5/8] Instalando Node.js 20 LTS..."
if command -v node &>/dev/null; then
    echo "   Node.js ya instalado: $(node --version)"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    echo "   Node.js instalado: $(node --version)"
fi

# --- 6. Instalar PM2 ---
echo ""
echo "⚙️ [6/8] Instalando PM2..."
npm install -g pm2

# --- 7. Instalar Nginx ---
echo ""
echo "🌐 [7/8] Instalando Nginx..."
apt install -y nginx
systemctl enable nginx

# Seguridad Nginx global
sed -i 's/# server_tokens off;/server_tokens off;/' /etc/nginx/nginx.conf

# --- 8. Instalar Certbot ---
echo ""
echo "🔐 [8/8] Instalando Certbot (Let's Encrypt)..."
apt install -y certbot python3-certbot-nginx

echo ""
echo "🍓 =========================================="
echo "   ✅ VPS CONFIGURADO EXITOSAMENTE"
echo "🍓 =========================================="
echo ""
echo "   Node.js: $(node --version)"
echo "   NPM:     $(npm --version)"
echo "   PM2:     $(pm2 --version)"
echo "   Nginx:   $(nginx -v 2>&1)"
echo "   Certbot: $(certbot --version 2>&1)"
echo ""
echo "   Siguiente paso: ejecutar deploy-app.sh como usuario fresanova"
echo ""
