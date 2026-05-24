import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(r'd:\AI\WX_APP_RB\SSH\Wx_App_Rb.pem')
ssh.connect('111.229.107.123', username='ubuntu', pkey=key, timeout=60)

print("Installing software...")

# 创建安装脚本
install_script = '''
#!/bin/bash
set -e

echo "=== Step 1: Update system ==="
sudo apt update -y

echo "=== Step 2: Install MySQL ==="
sudo DEBIAN_FRONTEND=noninteractive apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql

echo "=== Step 3: Install Node.js ==="
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo DEBIAN_FRONTEND=noninteractive apt install -y nodejs

echo "=== Step 4: Install PM2 ==="
sudo npm install -g pm2

echo "=== Step 5: Install Nginx ==="
sudo DEBIAN_FRONTEND=noninteractive apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

echo "=== Step 6: Configure Firewall ==="
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3306/tcp
echo "y" | sudo ufw enable

echo "=== Done ==="
mysql --version
node --version
npm --version
pm2 --version
nginx -v
'''

# 执行安装
stdin, stdout, stderr = ssh.exec_command(install_script, timeout=900)
print("Running installation script (this may take several minutes)...")

# 实时输出
while True:
    line = stdout.readline()
    if not line:
        break
    print(line, end='')

exit_status = stdout.channel.recv_exit_status()
print(f"\nExit status: {exit_status}")

ssh.close()
