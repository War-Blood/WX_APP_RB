import paramiko
import socket
import datetime

print("=" * 60)
print("  云服务连接验证测试报告")
print(f"  测试时间: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 60)

results = []

# ==================== 1. SSH 连接测试 ====================
print("\n[1] SSH 连接测试")
print("-" * 40)
try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    key = paramiko.RSAKey.from_private_key_file(r'd:\AI\WX_APP_RB\SSH\Wx_App_Rb.pem')
    ssh.connect('111.229.107.123', username='ubuntu', pkey=key, timeout=10)
    print("  SSH 主机: 111.229.107.123:22")
    print("  SSH 用户: ubuntu")
    print("  认证方式: RSA 密钥")
    print("  状态: ✅ 连接成功")
    results.append(("SSH连接", "成功"))
    
    # 获取服务器信息
    stdin, stdout, stderr = ssh.exec_command('uname -a')
    server_info = stdout.read().decode().strip()
    print(f"  服务器: {server_info}")
    
    stdin, stdout, stderr = ssh.exec_command('cat /etc/os-release | grep PRETTY_NAME')
    os_info = stdout.read().decode().strip().split('=')[1].strip('"')
    print(f"  系统: {os_info}")
    
except Exception as e:
    print(f"  状态: ❌ 连接失败 - {e}")
    results.append(("SSH连接", f"失败: {e}"))
    ssh = None

# ==================== 2. MySQL 连接测试 ====================
print("\n[2] MySQL 数据库连接测试")
print("-" * 40)
if ssh:
    try:
        # 测试本地连接
        stdin, stdout, stderr = ssh.exec_command("mysql -u daily_report_user -p'DailyReport@2024' -e 'SELECT VERSION();' 2>/dev/null")
        mysql_version = stdout.read().decode().strip()
        if mysql_version:
            print("  MySQL 主机: 111.229.107.123")
            print("  MySQL 端口: 3306")
            print("  数据库名: daily_report")
            print("  用户名: daily_report_user")
            print(f"  版本: {mysql_version.split()[-1] if mysql_version else 'N/A'}")
            print("  状态: ✅ 连接成功")
            results.append(("MySQL连接", "成功"))
        else:
            print("  状态: ❌ 连接失败")
            results.append(("MySQL连接", "失败"))
            
        # 验证数据库表
        stdin, stdout, stderr = ssh.exec_command("mysql -u daily_report_user -p'DailyReport@2024' -e 'USE daily_report; SHOW TABLES;' 2>/dev/null")
        tables = stdout.read().decode().strip()
        print(f"  数据表: {tables.replace('Tables_in_daily_report', '').strip()}")
        
        # 验证远程访问配置
        stdin, stdout, stderr = ssh.exec_command("sudo mysql -e \"SELECT user, host FROM mysql.user WHERE user='daily_report_user';\" 2>/dev/null")
        user_info = stdout.read().decode().strip()
        print(f"  远程访问: {user_info}")
        
    except Exception as e:
        print(f"  状态: ❌ 测试失败 - {e}")
        results.append(("MySQL连接", f"失败: {e}"))

# ==================== 3. 端口连通性测试 ====================
print("\n[3] 端口连通性测试")
print("-" * 40)
ports = [
    (22, "SSH"),
    (80, "HTTP"),
    (443, "HTTPS"),
    (3306, "MySQL")
]
for port, service in ports:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex(('111.229.107.123', port))
        if result == 0:
            print(f"  端口 {port} ({service}): ✅ 开放")
            results.append((f"端口{port}", "开放"))
        else:
            print(f"  端口 {port} ({service}): ❌ 关闭")
            results.append((f"端口{port}", "关闭"))
        sock.close()
    except Exception as e:
        print(f"  端口 {port} ({service}): ❌ 错误 - {e}")
        results.append((f"端口{port}", f"错误: {e}"))

# ==================== 4. Nginx 服务测试 ====================
print("\n[4] Nginx 服务测试")
print("-" * 40)
if ssh:
    try:
        stdin, stdout, stderr = ssh.exec_command('sudo systemctl status nginx | head -5')
        nginx_status = stdout.read().decode()
        if 'active (running)' in nginx_status:
            print("  状态: ✅ 运行中")
            results.append(("Nginx服务", "运行中"))
        else:
            print("  状态: ❌ 未运行")
            results.append(("Nginx服务", "未运行"))
            
        stdin, stdout, stderr = ssh.exec_command('nginx -v 2>&1')
        nginx_version = stdout.read().decode().strip()
        print(f"  版本: {nginx_version}")
        
        # 测试 HTTP 响应
        stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost')
        http_code = stdout.read().decode().strip()
        print(f"  HTTP 响应码: {http_code}")
        
    except Exception as e:
        print(f"  状态: ❌ 测试失败 - {e}")
        results.append(("Nginx服务", f"失败: {e}"))

# ==================== 5. 防火墙状态 ====================
print("\n[5] 防火墙状态")
print("-" * 40)
if ssh:
    try:
        stdin, stdout, stderr = ssh.exec_command('sudo ufw status | head -10')
        ufw_status = stdout.read().decode()
        print(ufw_status)
        if 'Status: active' in ufw_status:
            results.append(("防火墙", "已启用"))
        else:
            results.append(("防火墙", "未启用"))
    except Exception as e:
        print(f"  状态: ❌ 获取失败 - {e}")

# ==================== 6. 云函数配置参数 ====================
print("\n[6] 云函数环境变量配置参数")
print("-" * 40)
print("  以下参数需在微信开发者工具中配置:")
print("")
print("  ┌─────────────────┬─────────────────────┐")
print("  │ 变量名          │ 值                  │")
print("  ├─────────────────┼─────────────────────┤")
print("  │ MYSQL_HOST      │ 111.229.107.123     │")
print("  │ MYSQL_PORT      │ 3306                │")
print("  │ MYSQL_USER      │ daily_report_user   │")
print("  │ MYSQL_PASSWORD  │ DailyReport@2024    │")
print("  │ MYSQL_DATABASE  │ daily_report        │")
print("  └─────────────────┴─────────────────────┘")

# ==================== 测试结果汇总 ====================
print("\n" + "=" * 60)
print("  测试结果汇总")
print("=" * 60)
print(f"\n  {'测试项':<20} {'结果':<20}")
print("  " + "-" * 40)
for item, result in results:
    status = "✅" if "成功" in result or "开放" in result or "运行" in result or "启用" in result else "❌"
    print(f"  {status} {item:<18} {result:<20}")

# 关闭连接
if ssh:
    ssh.close()

print("\n" + "=" * 60)
print("  测试完成")
print("=" * 60)
