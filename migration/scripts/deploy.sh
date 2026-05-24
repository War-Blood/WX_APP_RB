#!/bin/bash
# ============================================================
# 部署脚本
# 执行方式: chmod +x deploy.sh && ./deploy.sh
# ============================================================

set -e

APP_DIR="/var/www/daily-report"
SERVER_DIR="$APP_DIR/server"

echo "=========================================="
echo "  部署日报系统"
echo "=========================================="

echo "[1/6] 检查环境..."
if [ ! -d "$SERVER_DIR" ]; then
    echo "错误: 服务器目录不存在: $SERVER_DIR"
    exit 1
fi

echo "[2/6] 安装依赖..."
cd "$SERVER_DIR"
npm install --production

echo "[3/6] 检查环境变量..."
if [ ! -f "$SERVER_DIR/.env" ]; then
    echo "警告: 未找到 .env 文件"
    echo "请复制 env.template 并填写配置"
    exit 1
fi

echo "[4/6] 配置 Nginx..."
if [ -f "./migration/config/nginx.conf" ]; then
    sudo cp ./migration/config/nginx.conf /etc/nginx/sites-available/daily-report
    sudo ln -sf /etc/nginx/sites-available/daily-report /etc/nginx/sites-enabled/
    sudo nginx -t
fi

echo "[5/6] 启动应用..."
if [ -f "./migration/config/ecosystem.config.js" ]; then
    pm2 start ./migration/config/ecosystem.config.js --env production
    pm2 save
    pm2 startup
fi

echo "[6/6] 重启服务..."
sudo systemctl restart nginx

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "检查服务状态:"
echo "  pm2 status"
echo "  sudo systemctl status nginx"
echo "  sudo systemctl status mysql"
echo ""
echo "查看日志:"
echo "  pm2 logs daily-report-api"
echo "  sudo tail -f /var/log/nginx/daily-report.access.log"
