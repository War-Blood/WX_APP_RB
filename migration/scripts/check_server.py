import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(r'd:\AI\WX_APP_RB\SSH\Wx_App_Rb.pem')
ssh.connect('111.229.107.123', username='ubuntu', pkey=key, timeout=10)

cmds = [
    ('MySQL', 'mysql --version 2>/dev/null || echo "Not installed"'),
    ('Node.js', 'node --version 2>/dev/null || echo "Not installed"'),
    ('Nginx', 'nginx -v 2>&1 || echo "Not installed"'),
    ('PM2', 'pm2 --version 2>/dev/null || echo "Not installed"'),
    ('Redis', 'redis-server --version 2>/dev/null || echo "Not installed"'),
    ('Docker', 'docker --version 2>/dev/null || echo "Not installed"'),
]

print("=== 已安装软件检查 ===")
for name, cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    result = stdout.read().decode().strip()
    print(f'{name}: {result}')

print("\n=== 运行中的服务 ===")
stdin, stdout, stderr = ssh.exec_command('systemctl list-units --type=service --state=running | grep -E "mysql|nginx|redis|docker" || echo "None"')
print(stdout.read().decode())

print("=== 开放端口 ===")
stdin, stdout, stderr = ssh.exec_command('ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null')
print(stdout.read().decode())

ssh.close()
