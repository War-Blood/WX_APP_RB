#!/bin/bash
# ============================================================
# Ubuntu 24.04 一键安装脚本
# 执行方式: chmod +x install-ubuntu.sh && sudo ./install-ubuntu.sh
# ============================================================

set -e

echo "=========================================="
echo "  Ubuntu 24.04 服务器环境安装"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    print_error "请使用 sudo 运行此脚本"
    exit 1
fi

# 更新系统
echo ""
echo "[1/8] 更新系统包..."
apt update && apt upgrade -y
print_status "系统包更新完成"

# 安装基础工具
echo ""
echo "[2/8] 安装基础工具..."
apt install -y curl wget git vim unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
print_status "基础工具安装完成"

# 安装 MySQL 8.0
echo ""
echo "[3/8] 安装 MySQL 8.0..."
apt install -y mysql-server
systemctl start mysql
systemctl enable mysql
print_status "MySQL 8.0 安装完成"

# MySQL 安全配置提示
print_warning "请手动执行: mysql_secure_installation"

# 安装 Node.js 18.x LTS
echo ""
echo "[4/8] 安装 Node.js 18.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
node --version
npm --version
print_status "Node.js 安装完成"

# 安装 PM2
echo ""
echo "[5/8] 安装 PM2..."
npm install -g pm2
pm2 --version
print_status "PM2 安装完成"

# 安装 Nginx
echo ""
echo "[6/8] 安装 Nginx..."
apt install -y nginx
systemctl start nginx
systemctl enable nginx
print_status "Nginx 安装完成"

# 安装 Redis（可选）
echo ""
echo "[7/8] 安装 Redis..."
read -p "是否安装 Redis? (y/n): " install_redis
if [ "$install_redis" = "y" ]; then
    apt install -y redis-server
    systemctl start redis-server
    systemctl enable redis-server
    print_status "Redis 安装完成"
else
    print_warning "跳过 Redis 安装"
fi

# 配置防火墙
echo ""
echo "[8/8] 配置防火墙 (UFW)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3306/tcp
read -p "是否启用防火墙? (y/n): " enable_ufw
if [ "$enable_ufw" = "y" ]; then
    ufw --force enable
    print_status "防火墙已启用"
else
    print_warning "防火墙未启用"
fi

# 创建项目目录
echo ""
echo "创建项目目录..."
mkdir -p /var/www/daily-report/server
mkdir -p /var/www/daily-report/admin-panel
mkdir -p /var/log/daily-report
print_status "项目目录创建完成"

# 设置时区
echo ""
echo "设置时区..."
timedatectl set-timezone Asia/Shanghai
print_status "时区设置完成"

# 完成提示
echo ""
echo "=========================================="
echo -e "${GREEN}  安装完成！${NC}"
echo "=========================================="
echo ""
echo "下一步操作："
echo "  1. 配置 MySQL: mysql_secure_installation"
echo "  2. 创建数据库: mysql -u root -p < migration/database/init.sql"
echo "  3. 配置环境变量: cp migration/config/env.template /var/www/daily-report/server/.env"
echo "  4. 部署应用代码到 /var/www/daily-report/server"
echo "  5. 配置 Nginx: cp migration/config/nginx.conf /etc/nginx/sites-available/daily-report"
echo "  6. 启用站点: ln -s /etc/nginx/sites-available/daily-report /etc/nginx/sites-enabled/"
echo "  7. 启动应用: pm2 start migration/config/ecosystem.config.js"
echo ""
