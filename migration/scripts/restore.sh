#!/bin/bash
# ============================================================
# 数据恢复脚本
# 执行方式: chmod +x restore.sh && ./restore.sh
# ============================================================

set -e

BACKUP_DIR="./backup_$(ls -d backup_* 2>/dev/null | head -1 | sed 's/backup_//')"
MYSQL_USER="root"
MYSQL_DATABASE="daily_report"

echo "=========================================="
echo "  数据恢复"
echo "=========================================="

if [ ! -d "$BACKUP_DIR" ]; then
    echo "错误: 未找到备份目录"
    echo "请将备份文件夹放在当前目录下"
    exit 1
fi

echo "备份目录: $BACKUP_DIR"
echo ""

read -sp "请输入 MySQL root 密码: " MYSQL_PASSWORD
echo ""

echo ""
echo "[1/4] 恢复数据库..."
if [ -f "$BACKUP_DIR/database/daily_report_full.sql" ]; then
    mysql -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" < "$BACKUP_DIR/database/daily_report_full.sql"
    echo "数据库恢复完成"
else
    echo "警告: 未找到数据库备份文件"
fi

echo ""
echo "[2/4] 恢复 Nginx 配置..."
if [ -d "$BACKUP_DIR/config/nginx" ]; then
    sudo cp -r "$BACKUP_DIR/config/nginx/"* /etc/nginx/ 2>/dev/null || true
    echo "Nginx 配置恢复完成"
else
    echo "警告: 未找到 Nginx 配置备份"
fi

echo ""
echo "[3/4] 恢复 SSL 证书..."
if [ -d "$BACKUP_DIR/ssl" ]; then
    sudo mkdir -p /etc/letsencrypt/live
    sudo cp -r "$BACKUP_DIR/ssl/"* /etc/letsencrypt/live/ 2>/dev/null || true
    echo "SSL 证书恢复完成"
else
    echo "警告: 未找到 SSL 证书备份"
fi

echo ""
echo "[4/4] 恢复环境变量..."
if [ -f "$BACKUP_DIR/config/.env" ]; then
    sudo cp "$BACKUP_DIR/config/.env" /var/www/daily-report/server/
    echo "环境变量恢复完成"
else
    echo "警告: 未找到环境变量备份"
fi

echo ""
echo "=========================================="
echo "  恢复完成！"
echo "=========================================="
echo ""
echo "请执行以下命令重启服务："
echo "  sudo systemctl restart mysql"
echo "  sudo nginx -t && sudo systemctl restart nginx"
echo "  pm2 restart all"
