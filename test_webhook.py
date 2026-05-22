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

# 1. Ver TODOS los logs del contenedor actual
print("=" * 60)
print("1. LOGS COMPLETOS")
print("=" * 60)
run("docker logs $(docker ps -q -f name=fresanova) --tail 50 2>&1")

# 2. Verificar productos en la base de datos
print("\n" + "=" * 60)
print("2. PRODUCTOS EN DB")
print("=" * 60)
run("""docker exec $(docker ps -q -f name=fresanova) node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const products = await mongoose.connection.db.collection('products').find({}).toArray();
  console.log('Total productos:', products.length);
  products.forEach(p => console.log(' -', p.name, '| basePrice:', p.basePrice, '| sizes:', JSON.stringify(p.sizes || [])));
  const cats = await mongoose.connection.db.collection('categories').find({}).toArray();
  console.log('\\nTotal categorias:', cats.length);
  cats.forEach(c => console.log(' -', c.name, '| slug:', c.slug));
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
" """)

# 3. Test webhook externo
print("\n" + "=" * 60)
print("3. TEST WEBHOOK EXTERNO")
print("=" * 60)
run("curl -sk -X POST https://fresanova.duckdns.org/webhook -H 'Content-Type: application/x-www-form-urlencoded' -d 'Body=hola&From=whatsapp%3A%2B573009999999&To=whatsapp%3A%2B14155238886&MessageSid=TESTCURL123' -w '\\nHTTP_CODE: %{http_code}' 2>&1")

# 4. Esperar un momento y ver logs despues del test
import time
time.sleep(5)
print("\n" + "=" * 60)
print("4. LOGS DESPUES DEL TEST")
print("=" * 60)
run("docker logs $(docker ps -q -f name=fresanova) --tail 30 2>&1")

ssh.close()
print("\nTEST COMPLETADO")
