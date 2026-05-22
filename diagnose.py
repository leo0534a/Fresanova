import paramiko
import time
import sys
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('187.127.254.11', username='root', password='130Bu5t1ll01*', port=22, timeout=30)

def run(cmd, timeout=120):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out: print(out)
    if err: print(f"STDERR: {err}")
    return out, err

# 1. Git log - ver que commit esta desplegado
print("=" * 60)
print("1. GIT LOG - Commit actual en el servidor")
print("=" * 60)
run("cd /root/Fresanova && git log --oneline -5")

# 2. Docker container status
print("\n" + "=" * 60)
print("2. DOCKER - Estado del contenedor")
print("=" * 60)
run("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' -f name=fresanova")

# 3. Docker logs - ultimas 80 lineas
print("\n" + "=" * 60)
print("3. DOCKER LOGS - Ultimas 80 lineas")
print("=" * 60)
run("docker logs $(docker ps -q -f name=fresanova) --tail 80 2>&1")

# 4. Verificar env vars del contenedor
print("\n" + "=" * 60)
print("4. ENV VARS - Variables de entorno clave")
print("=" * 60)
run("docker exec $(docker ps -q -f name=fresanova) printenv | grep -E 'TWILIO|MONGO|NODE_ENV|TRANSFER|PORT|DEEPSEEK'")

# 5. Test webhook internamente
print("\n" + "=" * 60)
print("5. TEST WEBHOOK - Curl interno")
print("=" * 60)
run("curl -s -X POST http://localhost:5000/webhook -H 'Content-Type: application/x-www-form-urlencoded' -d 'Body=hola&From=whatsapp:+573001234567&To=whatsapp:+14155238886&MessageSid=TEST123' -w '\\nHTTP_CODE: %{http_code}'")

# 6. Verificar imagen BRE-B
print("\n" + "=" * 60)
print("6. IMAGEN BRE-B - Verificar accesibilidad")
print("=" * 60)
run("curl -sk -o /dev/null -w 'HTTP %{http_code} - %{size_download} bytes' https://fresanova.duckdns.org/images/breb-qr.jpeg")

# 7. Verificar que la imagen existe en el contenedor
print("\n" + "=" * 60)
print("7. IMAGEN EN CONTENEDOR")
print("=" * 60)
run("docker exec $(docker ps -q -f name=fresanova) ls -la /app/Imagenes/")

# 8. MongoDB - verificar delivery zones
print("\n" + "=" * 60)
print("8. DELIVERY ZONES - Verificar seed")
print("=" * 60)
run("docker exec $(docker ps -q -f name=fresanova) node -e \"const mongoose = require('mongoose'); const {config} = require('./src/config/env'); mongoose.connect(config.mongoUri).then(async () => { const count = await mongoose.connection.db.collection('deliveryzones').countDocuments(); console.log('DeliveryZones count:', count); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); });\"")

ssh.close()
print("\n\nDIAGNOSTICO COMPLETADO")
