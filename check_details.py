import paramiko
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

# 1. Revisar archivos de log dentro del contenedor
print("=" * 60)
print("1. LOG FILES DENTRO DEL CONTENEDOR")
print("=" * 60)
run("docker exec $(docker ps -q -f name=fresanova) cat logs/combined.log 2>&1 | tail -60")

# 2. Error logs
print("\n" + "=" * 60)
print("2. ERROR LOG")
print("=" * 60)
run("docker exec $(docker ps -q -f name=fresanova) cat logs/error.log 2>&1 | tail -40")

# 3. Docker logs sin filtro (stderr + stdout separados)
print("\n" + "=" * 60)
print("3. DOCKER LOGS (todo)")
print("=" * 60)
run("docker logs $(docker ps -q -f name=fresanova) 2>&1 | head -50")

ssh.close()
print("\nDONE")
