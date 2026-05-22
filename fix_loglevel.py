import paramiko
import time
import sys
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('187.127.254.11', username='root', password='130Bu5t1ll01*', port=22, timeout=30)

def run(cmd, timeout=180):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out: print(out)
    if err: print(f"STDERR: {err}")
    return out, err

# Paso 1: Cambiar LOG_LEVEL a info
print("=" * 60)
print("PASO 1: Cambiar LOG_LEVEL a info")
print("=" * 60)
run("docker service update --env-add LOG_LEVEL=info fresanova", timeout=300)

# Esperar reinicio
print("\nEsperando 25 segundos...")
time.sleep(25)

# Paso 2: Verificar contenedor y logs
print("\n" + "=" * 60)
print("PASO 2: Estado del contenedor")
print("=" * 60)
run("docker ps --format 'table {{.Names}}\t{{.Status}}' -f name=fresanova")

# Paso 3: Ver los logs de startup
print("\n" + "=" * 60)
print("PASO 3: Logs de startup")
print("=" * 60)
run("docker logs $(docker ps -q -f name=fresanova) 2>&1")

# Paso 4: Test webhook
print("\n" + "=" * 60)
print("PASO 4: Test webhook POST")
print("=" * 60)
run("curl -sk -X POST https://fresanova.duckdns.org/webhook -H 'Content-Type: application/x-www-form-urlencoded' -d 'Body=hola&From=whatsapp%3A%2B573009999999&To=whatsapp%3A%2B14155238886&MessageSid=TESTINFO001&NumMedia=0' -w '\\nHTTP: %{http_code}' 2>&1")

# Esperar procesamiento
time.sleep(8)

# Paso 5: Logs despues del test
print("\n" + "=" * 60)
print("PASO 5: Logs despues del test")
print("=" * 60)
run("docker logs $(docker ps -q -f name=fresanova) --tail 50 2>&1")

ssh.close()
print("\nLISTO - Verifica los logs!")
