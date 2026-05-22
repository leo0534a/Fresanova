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

# Logs completos desde el arranque
print("LOGS COMPLETOS DEL CONTENEDOR")
print("=" * 60)
run("docker logs $(docker ps -q -f name=fresanova) 2>&1")

ssh.close()
