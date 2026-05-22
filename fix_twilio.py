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

# Paso 1: Actualizar el Auth Token de Twilio en el servicio Docker
print("=" * 60)
print("PASO 1: Actualizar TWILIO_AUTH_TOKEN")
print("=" * 60)
run("docker service update --env-add TWILIO_AUTH_TOKEN=0cdf563294e9924bec261638b079190c fresanova", timeout=180)

# Esperar a que el servicio se reinicie
print("\nEsperando 30 segundos para que reinicie...")
time.sleep(30)

# Paso 2: Verificar que el contenedor esta corriendo
print("\n" + "=" * 60)
print("PASO 2: Verificar contenedor")
print("=" * 60)
run("docker ps --format 'table {{.Names}}\t{{.Status}}' -f name=fresanova")

# Paso 3: Verificar la nueva env var
print("\n" + "=" * 60)
print("PASO 3: Verificar TWILIO_AUTH_TOKEN actualizado")
print("=" * 60)
run("docker exec $(docker ps -q -f name=fresanova) printenv TWILIO_AUTH_TOKEN")

# Paso 4: Seed delivery zones (corregir mongodbUri)
print("\n" + "=" * 60)
print("PASO 4: Seed delivery zones")
print("=" * 60)
run("docker exec $(docker ps -q -f name=fresanova) node -e \"const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(async () => { const count = await mongoose.connection.db.collection('deliveryzones').countDocuments(); console.log('DeliveryZones count:', count); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); });\"")

# Paso 5: Si no hay delivery zones, ejecutar seed
print("\n" + "=" * 60)
print("PASO 5: Ejecutar seed delivery zones")
print("=" * 60)
run("docker exec $(docker ps -q -f name=fresanova) node src/jobs/seedDeliveryZones.js 2>&1", timeout=60)

# Paso 6: Health check
print("\n" + "=" * 60)
print("PASO 6: Health check")
print("=" * 60)
run("curl -sk https://fresanova.duckdns.org/health")

# Paso 7: Verificar logs - ultimas 20 lineas
print("\n" + "=" * 60)
print("PASO 7: Logs recientes")
print("=" * 60)
run("docker logs $(docker ps -q -f name=fresanova) --tail 20 2>&1")

ssh.close()
print("\n\nACTUALIZACION COMPLETADA")
print("Ahora prueba enviar un mensaje por WhatsApp!")
