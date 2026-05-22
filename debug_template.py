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

# Test de creacion de template con error detallado
print("=" * 60)
print("DEBUG: Intentar crear list-picker template")
print("=" * 60)
run("""docker exec $(docker ps -q -f name=fresanova) node -e "
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function test() {
  try {
    // Test 1: quick-reply (que deberia funcionar)
    console.log('--- Test 1: Quick Reply ---');
    const qr = await client.content.v1.contents.create({
      friendlyName: 'TEST_QR_' + Date.now(),
      language: 'es',
      variables: {},
      types: {
        'twilio/quick-reply': {
          body: 'Test quick reply',
          actions: [{ title: 'Opcion 1', id: 'opt1' }, { title: 'Opcion 2', id: 'opt2' }]
        }
      }
    });
    console.log('Quick Reply OK:', qr.sid);
  } catch (e) {
    console.error('Quick Reply ERROR:', JSON.stringify(e, null, 2));
    console.error('Error type:', typeof e);
    console.error('Error message:', e.message);
    console.error('Error status:', e.status);
    console.error('Error code:', e.code);
  }

  try {
    // Test 2: list-picker (que falla)
    console.log('\\n--- Test 2: List Picker ---');
    const lp = await client.content.v1.contents.create({
      friendlyName: 'TEST_LP_' + Date.now(),
      language: 'es',
      variables: {},
      types: {
        'twilio/list-picker': {
          body: 'Test list picker',
          button: 'Ver opciones',
          items: [
            { id: 'item1', item: 'Producto 1', description: 'Desc 1' },
            { id: 'item2', item: 'Producto 2', description: 'Desc 2' }
          ]
        }
      }
    });
    console.log('List Picker OK:', lp.sid);
  } catch (e) {
    console.error('List Picker ERROR:', JSON.stringify(e, null, 2));
    console.error('Error type:', typeof e);
    console.error('Error message:', e.message);
    console.error('Error status:', e.status);
    console.error('Error code:', e.code);
  }
}

test().then(() => process.exit(0)).catch(e => { console.error('Fatal:', e); process.exit(1); });
" 2>&1""", timeout=30)

ssh.close()
print("\nDEBUG COMPLETADO")
