import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(r'd:\AI\WX_APP_RB\SSH\Wx_App_Rb.pem')
ssh.connect('111.229.107.123', username='ubuntu', pkey=key, timeout=60)

def run_cmd(cmd, timeout=60):
    print(f">>> {cmd[:60]}...")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out)
    if err:
        print(f"Error: {err}")
    return stdout.channel.recv_exit_status()

# 读取 SQL 文件
with open(r'd:\AI\WX_APP_RB\migration\database\init.sql', 'r', encoding='utf-8') as f:
    sql_content = f.read()

print("=== Step 1: Create database and tables ===")

# 创建临时 SQL 文件
run_cmd(f"cat > /tmp/init.sql << 'EOF'\n{sql_content}\nEOF")

# 执行 SQL
run_cmd("sudo mysql < /tmp/init.sql")

print("\n=== Step 2: Verify database ===")
run_cmd("sudo mysql -e 'SHOW DATABASES;'")
run_cmd("sudo mysql -e 'USE daily_report; SHOW TABLES;'")

print("\n=== Step 3: Create MySQL user for remote access ===")
run_cmd("sudo mysql -e \"CREATE USER IF NOT EXISTS 'daily_report_user'@'%' IDENTIFIED BY 'DailyReport@2024';\"")
run_cmd("sudo mysql -e \"GRANT ALL PRIVILEGES ON daily_report.* TO 'daily_report_user'@'%';\"")
run_cmd("sudo mysql -e \"FLUSH PRIVILEGES;\"")

print("\n=== Step 4: Configure MySQL for remote access ===")
run_cmd("sudo sed -i 's/bind-address.*/bind-address = 0.0.0.0/' /etc/mysql/mysql.conf.d/mysqld.cnf")
run_cmd("sudo systemctl restart mysql")

print("\n=== Step 5: Verify MySQL user ===")
run_cmd("sudo mysql -e \"SELECT user, host FROM mysql.user WHERE user='daily_report_user';\"")

ssh.close()
print("\n=== Database setup complete! ===")
