# 部署文档

**文档版本**: v1.1  
**创建日期**: 2026-05-24  
**更新日期**: 2026-05-24  
**服务器系统**: Ubuntu 24.04 LTS

---

## 目录

1. [部署架构](#1-部署架构)
2. [服务器环境准备](#2-服务器环境准备)
3. [数据库配置](#3-数据库配置)
4. [应用部署](#4-应用部署)
5. [Nginx 配置](#5-nginx-配置)
6. [PM2 进程管理](#6-pm2-进程管理)
7. [SSL 证书配置](#7-ssl-证书配置)
8. [云函数部署](#8-云函数部署)
9. [监控与日志](#9-监控与日志)
10. [备份策略](#10-备份策略)
11. [常见问题](#11-常见问题)

---

## 1. 部署架构

### 1.1 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户请求                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Nginx (反向代理)                              │
│                    https://warblood.online                      │
│                    - SSL 终止                                   │
│                    - 负载均衡                                   │
│                    - 静态资源                                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│    Node.js Server         │   │    微信云函数              │
│    (PM2 Cluster)          │   │    (云托管)               │
│    Port: 3000             │   │                           │
└───────────────────────────┘   └───────────────────────────┘
                    │                       │
                    └───────────┬───────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MySQL 8.0                                    │
│                    111.229.107.123:3306                         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 服务器配置

| 组件 | 配置 | 说明 |
|-----|------|------|
| 应用服务器 | 2核4G | Node.js 应用 |
| MySQL 服务器 | 4核8G | 数据库 |
| 域名 | warblood.online | 已备案域名 |
| SSL | Let's Encrypt | 免费证书 |

### 1.3 端口规划

| 端口 | 服务 | 说明 |
|-----|------|------|
| 80 | Nginx | HTTP (重定向到 HTTPS) |
| 443 | Nginx | HTTPS |
| 3000 | Node.js | 应用服务 |
| 3306 | MySQL | 数据库 |

---

## 2. 服务器环境准备

### 2.1 系统更新

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y curl wget git vim ufw
```

### 2.2 防火墙配置

```bash
# 开放必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### 2.3 安装 Node.js

```bash
# 安装 Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node -v   # v18.x.x
npm -v    # 9.x.x

# 配置 npm 镜像（可选）
npm config set registry https://registry.npmmirror.com
```

### 2.4 安装 PM2

```bash
# 全局安装 PM2
sudo npm install -g pm2

# 设置开机自启
pm2 startup systemd
```

### 2.5 安装 Nginx

```bash
# 安装 Nginx
sudo apt install -y nginx

# 启动服务
sudo systemctl start nginx
sudo systemctl enable nginx

# 验证
sudo systemctl status nginx
```

---

## 3. 数据库配置

### 3.1 安装 MySQL

```bash
# 安装 MySQL 8.0
sudo apt install -y mysql-server

# 启动服务
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全配置
sudo mysql_secure_installation
```

### 3.2 创建数据库和用户

```bash
# 登录 MySQL
sudo mysql -u root -p
```

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS `daily_report`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'daily_report_user'@'%' IDENTIFIED BY 'DailyReport@2024';

-- 授权
GRANT ALL PRIVILEGES ON `daily_report`.* TO 'daily_report_user'@'%';
FLUSH PRIVILEGES;

-- 验证
SHOW DATABASES;
SELECT user, host FROM mysql.user;
```

### 3.3 配置远程访问（如需要）

```bash
# 编辑配置文件
sudo vim /etc/mysql/mysql.conf.d/mysqld.cnf

# 修改绑定地址
bind-address = 0.0.0.0

# 重启服务
sudo systemctl restart mysql
```

### 3.4 初始化数据库

```bash
# 上传初始化脚本
scp sql/init.sql user@server:/tmp/

# 执行初始化
mysql -u daily_report_user -p daily_report < /tmp/init.sql
```

---

## 4. 应用部署

### 4.1 创建部署目录

```bash
# 创建应用目录
sudo mkdir -p /var/www/daily-report
sudo chown -R $USER:$USER /var/www/daily-report

# 创建日志目录
sudo mkdir -p /var/log/daily-report
sudo chown -R $USER:$USER /var/log/daily-report
```

### 4.2 上传代码

```bash
# 方式一：Git 克隆
cd /var/www/daily-report
git clone https://github.com/your-repo/WX_APP_RB.git .

# 方式二：SCP 上传
scp -r ./WX_APP_RB/* user@server:/var/www/daily-report/
```

### 4.3 安装依赖

```bash
cd /var/www/daily-report

# 安装项目依赖
npm install

# 安装云函数依赖
cd cloudfunctions/common && npm install && cd ../..
cd cloudfunctions/login && npm install && cd ../..
cd cloudfunctions/submitReport && npm install && cd ../..
cd cloudfunctions/reviewReport && npm install && cd ../..
cd cloudfunctions/manageAdmin && npm install && cd ../..
cd cloudfunctions/initAdmin && npm install && cd ../..
```

### 4.4 配置环境变量

```bash
# 创建环境变量文件
cp migration/config/env.template .env

# 编辑配置
vim .env
```

`.env` 文件内容：

```bash
# --------------------------------------------------
# MySQL 数据库配置
# --------------------------------------------------
MYSQL_HOST=111.229.107.123
MYSQL_PORT=3306
MYSQL_USER=daily_report_user
MYSQL_PASSWORD=DailyReport@2024
MYSQL_DATABASE=daily_report

# --------------------------------------------------
# 微信小程序配置
# --------------------------------------------------
WECHAT_APPID=YOUR_WECHAT_APPID
WECHAT_SECRET=YOUR_WECHAT_SECRET

# --------------------------------------------------
# WPS 开放平台配置（可选）
# --------------------------------------------------
WPS_API_TOKEN=your_wps_token
WPS_FILE_ID=your_file_id
WPS_SHEET_INDEX=0

# --------------------------------------------------
# 订阅消息配置（可选）
# --------------------------------------------------
SUBSCRIBE_TEMPLATE_ID=your_template_id

# --------------------------------------------------
# 服务器配置
# --------------------------------------------------
SERVER_PORT=3000
NODE_ENV=production
```

---

## 5. Nginx 配置

### 5.1 创建配置文件

```bash
# 创建站点配置
sudo vim /etc/nginx/sites-available/daily-report
```

配置内容：

```nginx
upstream nodejs_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name warblood.online www.warblood.online;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name warblood.online www.warblood.online;

    # SSL 证书配置
    ssl_certificate /etc/letsencrypt/live/warblood.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/warblood.online/privkey.pem;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 日志
    access_log /var/log/nginx/daily-report.access.log;
    error_log /var/log/nginx/daily-report.error.log;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # API 代理
    location /api/ {
        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    # 静态资源（管理后台）
    location /admin/ {
        alias /var/www/daily-report/admin-panel/;
        index index.html;
        try_files $uri $uri/ /admin/index.html;
    }

    # 健康检查
    location /health {
        proxy_pass http://nodejs_backend/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # 默认拒绝
    location / {
        return 404;
    }
}
```

### 5.2 启用站点

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/daily-report /etc/nginx/sites-enabled/

# 删除默认站点
sudo rm /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重载配置
sudo systemctl reload nginx
```

---

## 6. PM2 进程管理

### 6.1 PM2 配置文件

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'daily-report-api',
      script: './src/app.js',
      cwd: '/var/www/daily-report/server',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/daily-report/error.log',
      out_file: '/var/log/daily-report/out.log',
      log_file: '/var/log/daily-report/combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
```

### 6.2 启动应用

```bash
# 启动应用
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status

# 查看日志
pm2 logs daily-report-api

# 保存进程列表
pm2 save
```

### 6.3 常用命令

```bash
# 重启应用
pm2 restart daily-report-api

# 停止应用
pm2 stop daily-report-api

# 删除应用
pm2 delete daily-report-api

# 监控
pm2 monit

# 查看详情
pm2 show daily-report-api
```

---

## 7. SSL 证书配置

### 7.1 安装 Certbot

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### 7.2 申请证书

```bash
# 申请证书
sudo certbot --nginx -d warblood.online -d www.warblood.online

# 按提示操作：
# 1. 输入邮箱地址
# 2. 同意服务条款
# 3. 选择是否重定向 HTTP 到 HTTPS
```

### 7.3 自动续期

```bash
# 测试续期
sudo certbot renew --dry-run

# Certbot 会自动添加定时任务
# 查看定时任务
sudo systemctl status certbot.timer
```

---

## 8. 云函数部署

### 8.1 微信开发者工具部署

1. 打开微信开发者工具
2. 右键点击 `cloudfunctions` 目录下的每个云函数
3. 选择「上传并部署：云端安装依赖」
4. 等待部署完成

### 8.2 配置云函数环境变量

在微信云开发控制台配置以下环境变量：

| 变量名 | 值 |
|-------|-----|
| MYSQL_HOST | 111.229.107.123 |
| MYSQL_PORT | 3306 |
| MYSQL_USER | daily_report_user |
| MYSQL_PASSWORD | DailyReport@2024 |
| MYSQL_DATABASE | daily_report |
| WPS_API_TOKEN | (可选) |
| WPS_FILE_ID | (可选) |
| SUBSCRIBE_TEMPLATE_ID | (可选) |

### 8.3 云函数列表

| 云函数 | 说明 |
|-------|------|
| login | 用户登录 |
| submitReport | 日报提交 |
| reviewReport | 日报审核 |
| manageAdmin | 用户管理 |
| initAdmin | 初始化管理员 |
| common | 公共模块（非独立云函数） |

---

## 9. 监控与日志

### 9.1 日志位置

| 日志 | 路径 |
|-----|------|
| Nginx 访问日志 | /var/log/nginx/daily-report.access.log |
| Nginx 错误日志 | /var/log/nginx/daily-report.error.log |
| 应用日志 | /var/log/daily-report/combined.log |
| 应用错误日志 | /var/log/daily-report/error.log |

### 9.2 日志查看

```bash
# 实时查看 Nginx 访问日志
sudo tail -f /var/log/nginx/daily-report.access.log

# 实时查看应用日志
pm2 logs daily-report-api

# 查看最近 100 行
pm2 logs daily-report-api --lines 100
```

### 9.3 PM2 监控

```bash
# 启动监控面板
pm2 monit

# 查看进程状态
pm2 status

# 查看详细信息
pm2 show daily-report-api
```

### 9.4 系统监控

```bash
# 安装 htop
sudo apt install -y htop

# 查看系统资源
htop

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

---

## 10. 备份策略

### 10.1 数据库备份脚本

创建 `/var/www/daily-report/scripts/backup.sh`：

```bash
#!/bin/bash

# 配置
DB_NAME="daily_report"
DB_USER="daily_report_user"
DB_PASS="DailyReport@2024"
BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql.gz"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
mysqldump -u$DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_FILE

# 删除 7 天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

# 输出结果
echo "Backup completed: $BACKUP_FILE"
```

### 10.2 设置定时备份

```bash
# 添加执行权限
chmod +x /var/www/daily-report/scripts/backup.sh

# 添加定时任务
crontab -e

# 每天凌晨 2 点执行备份
0 2 * * * /var/www/daily-report/scripts/backup.sh >> /var/log/daily-report/backup.log 2>&1
```

### 10.3 恢复数据

```bash
# 解压备份文件
gunzip daily_report_20260524_020000.sql.gz

# 恢复数据库
mysql -u daily_report_user -p daily_report < daily_report_20260524_020000.sql
```

---

## 11. 常见问题

### 11.1 502 Bad Gateway

**原因**: Node.js 服务未启动或端口配置错误

**解决方案**:
```bash
# 检查服务状态
pm2 status

# 重启服务
pm2 restart daily-report-api

# 检查端口
netstat -tlnp | grep 3000
```

### 11.2 数据库连接失败

**原因**: MySQL 服务未启动或连接配置错误

**解决方案**:
```bash
# 检查 MySQL 状态
sudo systemctl status mysql

# 重启 MySQL
sudo systemctl restart mysql

# 测试连接
mysql -u daily_report_user -p -h 111.229.107.123 daily_report
```

### 11.3 SSL 证书过期

**原因**: Let's Encrypt 证书有效期 90 天

**解决方案**:
```bash
# 手动续期
sudo certbot renew

# 重载 Nginx
sudo systemctl reload nginx
```

### 11.4 云函数调用超时

**原因**: 数据库连接超时或网络问题

**解决方案**:
1. 检查云函数环境变量配置
2. 检查数据库服务器防火墙设置
3. 检查 MySQL 用户远程访问权限

### 11.5 内存不足

**原因**: 应用内存占用过高

**解决方案**:
```bash
# 查看内存使用
free -h

# 重启应用释放内存
pm2 restart daily-report-api

# 调整 PM2 内存限制
pm2 start ecosystem.config.js --max-memory-restart 512M
```

---

## 附录

### A. 部署检查清单

- [ ] 服务器系统更新
- [ ] 防火墙配置完成
- [ ] Node.js 安装完成
- [ ] PM2 安装并配置自启
- [ ] Nginx 安装并启动
- [ ] MySQL 安装并配置
- [ ] 数据库初始化完成
- [ ] 应用代码部署完成
- [ ] 环境变量配置完成
- [ ] SSL 证书配置完成
- [ ] 云函数部署完成
- [ ] 云函数环境变量配置
- [ ] 备份脚本配置完成
- [ ] 监控配置完成

### B. 相关文档

| 文档 | 路径 |
|-----|------|
| PRD | [docs/PRD.md](./PRD.md) |
| 技术架构 | [docs/TECH_ARCHITECTURE.md](./TECH_ARCHITECTURE.md) |
| API 文档 | [docs/API.md](./API.md) |
| 开发指南 | [docs/DEVELOPMENT.md](./DEVELOPMENT.md) |

### C. 变更记录

| 版本 | 日期 | 修改人 | 修改内容 |
|-----|------|-------|---------|
| v1.0 | 2026-05-24 | 技术团队 | 初稿创建 |
| v1.1 | 2026-05-24 | DevOps团队 | 补充完整环境变量配置项，优化部署说明 |

---

**文档结束**
