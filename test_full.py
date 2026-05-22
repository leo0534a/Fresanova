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

# 1. Ver cuantos logs hay ANTES del test
print("=" * 60)
print("1. CANTIDAD DE LOGS ANTES")
print("=" * 60)
run("docker logs $(docker ps -q -f name=fresanova) 2>&1 | wc -l")

# 2. Verificar auth token actual
print("\n" + "=" * 60)
print("2. AUTH TOKEN ACTUAL")
print("=" * 60)
run("docker exec $(docker ps -q -f name=fresanova) printenv TWILIO_AUTH_TOKEN")

# 3. Test directo de Twilio API con las credenciales
print("\n" + "=" * 60)
print("3. TEST TWILIO API DIRECTO")
print("=" * 60)
run("curl -s -u AC0504a16919cf46b7c6196873f4e54dbb:0cdf563294e9924bec261638b079190c 'https://api.twilio.com/2010-04-01/Accounts/AC0504a16919cf46b7c6196873f4e54dbb.json' | head -c 300")

# 4. Enviar test webhook
print("\n" + "=" * 60)
print("4. ENVIAR TEST WEBHOOK")
print("=" * 60)
run("curl -sk -X POST https://fresanova.duckdns.org/webhook -H 'Content-Type: application/x-www-form-urlencoded' -d 'Body=hola&From=whatsapp%3A%2B573009999999&To=whatsapp%3A%2B14155238886&MessageSid=TESTFIX001&NumMedia=0' -w '\\nHTTP: %{http_code}' 2>&1")

# Esperar 10 segundos
time.sleep(10)

# 5. Ver TODOS los logs despues
print("\n" + "=" * 60)
print("5. LOGS DESPUES DEL TEST")
print("=" * 60)
run("docker logs $(docker ps -q -f name=fresanova) 2>&1")

# 6. Tambien revisar el log file
print("\n" + "=" * 60)
print("6. COMBINED LOG FILE")
print("=" * 60)
run("docker exec $(docker ps -q -f name=fresanova) cat logs/combined.log 2>&1")

ssh.close()
print("\nTEST COMPLETO")
