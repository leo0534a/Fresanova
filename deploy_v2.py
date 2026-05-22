import paramiko
import time
import sys
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('187.127.254.11', username='root', password='130Bust1ll01*', port=22, timeout=15)

def run(cmd, timeout=120):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out: print(out)
    if err: print(f"STDERR: {err}")
    return out, err

# Paso 1: Git pull
print("=" * 50)
print("PASO 1: Git pull")
print("=" * 50)
run("cd /root/Fresanova && git pull origin main", timeout=60)
run("cd /root/Fresanova && git log --oneline -3")

# Verificar imagen existe
run("cd /root/Fresanova && ls -la Imagenes/breb-qr.jpeg")

# Paso 2: Docker build
print("\n" + "=" * 50)
print("PASO 2: Docker build")
print("=" * 50)
out, err = run("cd /root/Fresanova && docker build -t fresanova:latest . 2>&1", timeout=600)

# Paso 3: Agregar TRANSFER_IMAGE_URL al servicio
print("\n" + "=" * 50)
print("PASO 3: Configurar TRANSFER_IMAGE_URL")
print("=" * 50)
run("docker service update --env-add TRANSFER_IMAGE_URL='https://fresanova.duckdns.org/images/breb-qr.jpeg' fresanova", timeout=180)

# Esperar
print("\nEsperando 25 segundos...")
time.sleep(25)

# Paso 4: Verificar estado
print("\n" + "=" * 50)
print("PASO 4: Verificar contenedor")
print("=" * 50)
run("docker ps --format 'table {{.Names}}\t{{.Status}}' -f name=fresanova")

# Paso 5: Seed delivery zones
print("\n" + "=" * 50)
print("PASO 5: Seed barrios de domicilio")
print("=" * 50)
run("docker exec $(docker ps -q -f name=fresanova) node src/jobs/seedDeliveryZones.js 2>&1", timeout=60)

# Paso 6: Verificar imagen accesible
print("\n" + "=" * 50)
print("PASO 6: Verificar imagen BRE-B")
print("=" * 50)
run("curl -sk -o /dev/null -w 'HTTP %{http_code} - %{size_download} bytes' https://fresanova.duckdns.org/images/breb-qr.jpeg")

# Paso 7: Verificar TRANSFER_IMAGE_URL en el contenedor
print("\n" + "=" * 50)
print("PASO 7: Verificar env var")
print("=" * 50)
run("docker exec $(docker ps -q -f name=fresanova) printenv TRANSFER_IMAGE_URL")

# Paso 8: Test health
print("\n" + "=" * 50)
print("PASO 8: Health check")
print("=" * 50)
run("curl -sk https://fresanova.duckdns.org/health")

# Paso 9: Logs
print("\n" + "=" * 50)
print("PASO 9: Logs")
print("=" * 50)
run("docker logs $(docker ps -q -f name=fresanova) --tail 30 2>&1")

# Limpieza imagenes docker
run("docker image prune -f 2>&1")

ssh.close()
print("\n\n" + "=" * 50)
print("DESPLIEGUE V2 COMPLETADO")
print("=" * 50)
