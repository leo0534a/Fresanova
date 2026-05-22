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

# 1. Todas las env vars del contenedor
print("=" * 60)
print("1. TODAS LAS ENV VARS")
print("=" * 60)
run("docker exec $(docker ps -q -f name=fresanova) printenv | sort")

# 2. Test rapido de logging desde dentro del contenedor
print("\n" + "=" * 60)
print("2. TEST DE LOGGING DIRECTO")
print("=" * 60)
run("""docker exec $(docker ps -q -f name=fresanova) node -e "
const logger = require('./src/utils/logger');
logger.error('TEST-ERROR: esto es un error de prueba');
logger.warn('TEST-WARN: esto es un warn de prueba');
logger.info('TEST-INFO: esto es un info de prueba');
logger.debug('TEST-DEBUG: esto es un debug de prueba');
console.log('CONSOLE-LOG: esto es un console.log');
console.error('CONSOLE-ERROR: esto es un console.error');
setTimeout(() => process.exit(0), 1000);
" 2>&1""")

# 3. Verificar ruta del webhook
print("\n" + "=" * 60)
print("3. RUTAS REGISTRADAS")
print("=" * 60)
run("""docker exec $(docker ps -q -f name=fresanova) node -e "
const app = require('./src/app');
app._router.stack.forEach(r => {
  if (r.route) console.log(r.route.methods, r.route.path);
  else if (r.name === 'router') {
    r.handle.stack.forEach(rr => {
      if (rr.route) console.log(rr.route.methods, rr.route.path);
    });
  }
});
setTimeout(() => process.exit(0), 2000);
" 2>&1""")

ssh.close()
print("\nDONE")
