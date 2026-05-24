import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(r'd:\AI\WX_APP_RB\SSH\Wx_App_Rb.pem')
ssh.connect('111.229.107.123', username='ubuntu', pkey=key, timeout=30)

def run_sudo(cmd):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=600)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out[-2000:] if len(out) > 2000 else out)
    if err:
        print(f"Error: {err[-500:]}" if len(err) > 500 else f"Error: {err}")
    return out, err

print("Step 1: Update system...")
run_sudo("sudo DEBIAN_FRONTEND=noninteractive apt update -y")

print("\nStep 2: Install MySQL...")
run_sudo("sudo DEBIAN_FRONTEND=noninteractive apt install -y mysql-server")

print("\nStep 3: Start MySQL...")
run_sudo("sudo systemctl start mysql && sudo systemctl enable mysql")

print("\nStep 4: Check MySQL status...")
run_sudo("sudo systemctl status mysql | head -5")

print("\nStep 5: Install Node.js repo...")
run_sudo("curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -")

print("\nStep 6: Install Node.js...")
run_sudo("sudo DEBIAN_FRONTEND=noninteractive apt install -y nodejs")

print("\nStep 7: Install PM2...")
run_sudo("sudo npm install -g pm2")

print("\nStep 8: Install Nginx...")
run_sudo("sudo DEBIAN_FRONTEND=noninteractive apt install -y nginx")
run_sudo("sudo systemctl start nginx && sudo systemctl enable nginx")

print("\n=== Verification ===")
run_sudo("mysql --version && node --version && npm --version && pm2 --version && nginx -v 2>&1")

ssh.close()
print("\nDone!")
