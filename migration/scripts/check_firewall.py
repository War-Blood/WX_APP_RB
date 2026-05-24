import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(r'd:\AI\WX_APP_RB\SSH\Wx_App_Rb.pem')
ssh.connect('111.229.107.123', username='ubuntu', pkey=key, timeout=60)

def run_cmd(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out)
    if err:
        print(f"Error: {err}")

print("=== Firewall Status ===")
run_cmd("sudo ufw status verbose")

print("\n=== Ensure ports are open ===")
run_cmd("sudo ufw allow 22/tcp")
run_cmd("sudo ufw allow 80/tcp")
run_cmd("sudo ufw allow 443/tcp")
run_cmd("sudo ufw allow 3306/tcp")

print("\n=== Listening Ports ===")
run_cmd("sudo ss -tlnp | grep -E '22|80|443|3306'")

print("\n=== MySQL Status ===")
run_cmd("sudo systemctl status mysql | head -5")

print("\n=== Nginx Status ===")
run_cmd("sudo systemctl status nginx | head -5")

print("\n=== Test MySQL Connection ===")
run_cmd("mysql -u daily_report_user -p'DailyReport@2024' -e 'SELECT 1;' daily_report 2>/dev/null && echo 'MySQL connection OK' || echo 'MySQL connection FAILED'")

ssh.close()
