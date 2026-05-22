import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('187.127.254.11', username='root', password='130Bu5t1ll01-', port=22, timeout=30, banner_timeout=30, auth_timeout=30)
    print('CONECTADO OK')
    stdin, stdout, stderr = ssh.exec_command('echo hola')
    print(stdout.read().decode())
    ssh.close()
except Exception as e:
    print('ERROR:', e)
