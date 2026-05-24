import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(r'd:\AI\WX_APP_RB\SSH\Wx_App_Rb.pem')
ssh.connect('111.229.107.123', username='ubuntu', pkey=key, timeout=30)

def run_cmd(cmd, timeout=300):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out)
    if err and exit_status != 0:
        print(f"STDERR: {err}")
    return exit_status, out, err

print("=" * 50)
print("  Ubuntu 24.04 服务器环境安装")
print("=" * 50)

# 1. 更新系统
print("\n[1/6] 更新系统包...")
run_cmd("sudo apt update && sudo apt upgrade -y", timeout=300)

# 2. 安装 MySQL
print("\n[2/6] 安装 MySQL 8.0...")
run_cmd("sudo apt install -y mysql-server", timeout=300)
run_cmd("sudo systemctl start mysql")
run_cmd("sudo systemctl enable mysql")

# 3. 安装 Node.js 18.x
print("\n[3/6] 安装 Node.js 18.x LTS...")
run_cmd("curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -", timeout=120)
run_cmd("sudo apt install -y nodejs", timeout=180)

# 4. 安装 PM2
print("\n[4/6] 安装 PM2...")
run_cmd("sudo npm install -g pm2", timeout=120)

# 5. 安装 Nginx
print("\n[5/6] 安装 Nginx...")
run_cmd("sudo apt install -y nginx", timeout=180)
run_cmd("sudo systemctl start nginx")
run_cmd("sudo systemctl enable nginx")

# 6. 配置防火墙
print("\n[6/6] 配置防火墙...")
run_cmd("sudo ufw allow ssh")
run_cmd("sudo ufw allow 80/tcp")
run_cmd("sudo ufw allow 443/tcp")
run_cmd("sudo ufw allow 3306/tcp")
run_cmd("echo 'y' | sudo ufw enable")

# 验证安装
print("\n" + "=" * 50)
print("  安装验证")
print("=" * 50)
run_cmd("mysql --version")
run_cmd("node --version")
run_cmd("npm --version")
run_cmd("pm2 --version")
run_cmd("nginx -v")
run_cmd("sudo ufw status")

print("\n" + "=" * 50)
print("  安装完成!")
print("=" * 50)

ssh.close()
