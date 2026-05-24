import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(r'd:\AI\WX_APP_RB\SSH\Wx_App_Rb.pem')
ssh.connect('111.229.107.123', username='ubuntu', pkey=key, timeout=60)

def run_cmd(cmd, timeout=300):
    print(f"\n>>> {cmd[:80]}...")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out[-1500:] if len(out) > 1500 else out)
    if err and 'warning' not in err.lower():
        print(f"Error: {err[:500]}")
    return stdout.channel.recv_exit_status()

# 安装 Node.js 20.x (LTS)
print("Installing Node.js 20.x LTS...")
run_cmd("curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -", timeout=180)
run_cmd("sudo DEBIAN_FRONTEND=noninteractive apt install -y nodejs", timeout=300)

# 安装 PM2
print("\nInstalling PM2...")
run_cmd("sudo npm install -g pm2", timeout=120)

# 安装 Nginx
print("\nInstalling Nginx...")
run_cmd("sudo DEBIAN_FRONTEND=noninteractive apt install -y nginx", timeout=180)
run_cmd("sudo systemctl start nginx")
run_cmd("sudo systemctl enable nginx")

# 配置防火墙
print("\nConfiguring firewall...")
run_cmd("sudo ufw allow ssh && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow 3306/tcp")
run_cmd("echo 'y' | sudo ufw enable", timeout=30)

# 验证
print("\n=== Verification ===")
run_cmd("node --version && npm --version")
run_cmd("pm2 --version")
run_cmd("nginx -v 2>&1")
run_cmd("sudo ufw status")

ssh.close()
print("\nDone!")
