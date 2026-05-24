#!/bin/bash
# ============================================================
# CentOS 7.6 数据备份脚本
# 执行方式: chmod +x backup.sh && ./backup.sh
# ============================================================

set -e

BACKUP_DIR="./backup_$(date +%Y%m%d_%H%M%S)"
MYSQL_USER="root"
MYSQL_DATABASE="daily_report"

echo "=========================================="
echo "  开始备份数据"
echo "=========================================="

mkdir -p "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR/database"
mkdir -p "$BACKUP_DIR/config"
mkdir -p "$BACKUP_DIR/ssl"

echo "[1/5] 备份 MySQL 数据库..."
read -sp "请输入 MySQL root 密码: " MYSQL_PASSWORD
echo ""

mysqldump -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" --databases "$MYSQL_DATABASE" > "$BACKUP_DIR/database/daily_report_full.sql"
mysqldump -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" users > "$BACKUP_DIR/database/users.sql"
mysqldump -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" daily_reports > "$BACKUP_DIR/database/daily_reports.sql"
mysqldump -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" daily_project_progress > "$BACKUP_DIR/database/daily_project_progress.sql"

echo "[2/5] 备份 Nginx 配置..."
if [ -d "/etc/nginx" ]; then
    cp -r /etc/nginx/* "$BACKUP_DIR/config/nginx/" 2>/dev/null || true
fi

echo "[3/5] 备份 SSL 证书..."
if [ -d "/etc/letsencrypt" ]; then
    cp -r /etc/letsencrypt/live "$BACKUP_DIR/ssl/" 2>/dev/null || true
fi
if [ -d "/etc/ssl/certs" ]; then
    cp /etc/ssl/certs/*.pem "$BACKUP_DIR/ssl/" 2>/dev/null || true
fi

echo "[4/5] 备份 PM2 配置..."
if [ -f "/var/www/server/ecosystem.config.js" ]; then
    cp /var/www/server/ecosystem.config.js "$BACKUP_DIR/config/"
fi

echo "[5/5] 备份环境变量..."
if [ -f "/var/www/server/.env" ]; then
    cp /var/www/server/.env "$BACKUP_DIR/config/"
fi

echo "=========================================="
echo "  备份完成！"
echo "  备份目录: $BACKUP_DIR"
echo "=========================================="
echo ""
echo "请将以下文件传输到 Ubuntu 服务器："
echo "  - $BACKUP_DIR/database/daily_report_full.sql"
echo "  - $BACKUP_DIR/config/"
echo "  - $BACKUP_DIR/ssl/"
