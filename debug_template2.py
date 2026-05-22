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

# Reproducir la creacion exacta del template que falla
print("=" * 60)
print("DEBUG: Reproducir template de productos")
print("=" * 60)
run("""docker exec $(docker ps -q -f name=fresanova) node -e "
const twilio = require('twilio');
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  const { formatCurrency } = require('./src/helpers/formatCurrency');
  const Category = require('./src/models/Category');
  const Product = require('./src/models/Product');

  const categories = await Category.find({ isActive: true });
  console.log('Categorias:', categories.length);

  for (const category of categories) {
    const products = await Product.find({ category: category._id, isActive: true }).sort('displayOrder');
    console.log('Categoria:', category.name, '| Productos:', products.length);

    const items = products.map(prod => {
      let priceText = '';
      if (prod.sizes && prod.sizes.length > 0) {
        priceText = 'Desde ' + formatCurrency(prod.sizes[0].price);
      } else {
        priceText = formatCurrency(prod.basePrice);
      }
      const desc = priceText + (prod.includesNote ? ' - ' + prod.includesNote : '');
      console.log('  Item:', prod.name, '| Desc:', desc, '| ID:', 'prod_' + prod._id);
      return {
        id: 'prod_' + prod._id,
        item: prod.name,
        description: desc
      };
    });

    const body = category.emoji + ' *' + category.name.toUpperCase() + '*\\n' + 'Que se te antoja?';
    console.log('Body:', body);
    console.log('Items count:', items.length);
    console.log('Items JSON:', JSON.stringify(items, null, 2));

    try {
      const result = await client.content.v1.contents.create({
        friendlyName: 'TEST_PROD_' + category.slug + '_' + Date.now(),
        language: 'es',
        variables: {},
        types: {
          'twilio/list-picker': {
            body: body,
            button: 'Ver productos',
            items: items
          }
        }
      });
      console.log('SUCCESS:', result.sid);
    } catch (e) {
      console.error('FULL ERROR:', JSON.stringify(e, Object.getOwnPropertyNames(e), 2));
    }
  }

  process.exit(0);
}

test().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
" 2>&1""", timeout=30)

ssh.close()
print("\nDONE")
