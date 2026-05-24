# CentOS 7.6 → Ubuntu 24.04 迁移检查清单

## 📋 迁移前准备

### 1. 数据备份
- [ ] 导出 MySQL 数据库
  ```bash
  mysqldump -u root -p daily_report > daily_report_backup.sql
  ```
- [ ] 备份 Nginx 配置文件
- [ ] 备份 SSL 证书
- [ ] 备份环境变量文件 (.env)
- [ ] 备份 PM2 配置文件

### 2. 记录当前配置
- [ ] 记录当前服务器 IP 地址
- [ ] 记录域名 DNS 配置
- [ ] 记录微信小程序 AppID 和 Secret
- [ ] 记录 WPS API Token 和 File ID
- [ ] 记录订阅消息模板 ID

---

## 🖥️ Ubuntu 服务器配置

### 1. 系统初始化
- [ ] 更新系统包: `apt update && apt upgrade -y`
- [ ] 设置时区: `timedatectl set-timezone Asia/Shanghai`
- [ ] 配置主机名: `hostnamectl set-hostname your-hostname`

### 2. 安装依赖
- [ ] 安装 MySQL 8.0: `apt install mysql-server`
- [ ] 安装 Node.js 18.x LTS
- [ ] 安装 PM2: `npm install -g pm2`
- [ ] 安装 Nginx: `apt install nginx`
- [ ] 安装 Redis (可选): `apt install redis-server`

### 3. MySQL 配置
- [ ] 运行安全脚本: `mysql_secure_installation`
- [ ] 创建数据库: `mysql -u root -p < migration/database/init.sql`
- [ ] 创建远程访问用户 (如需要)
- [ ] 配置 MySQL 远程访问 (如需要)

### 4. 防火墙配置
- [ ] 开放 SSH 端口: `ufw allow ssh`
- [ ] 开放 HTTP 端口: `ufw allow 80/tcp`
- [ ] 开放 HTTPS 端口: `ufw allow 443/tcp`
- [ ] 开放 MySQL 端口: `ufw allow 3306/tcp`
- [ ] 启用防火墙: `ufw enable`

---

## 📁 数据恢复

### 1. 数据库恢复
- [ ] 上传 SQL 备份文件
- [ ] 导入数据: `mysql -u root -p daily_report < daily_report_backup.sql`
- [ ] 验证数据完整性

### 2. 配置恢复
- [ ] 复制 .env 文件到 `/var/www/daily-report/server/`
- [ ] 配置 Nginx 站点
- [ ] 恢复 SSL 证书

### 3. SSL 证书
- [ ] 上传 SSL 证书文件
- [ ] 或使用 Let's Encrypt 申请新证书:
  ```bash
  apt install certbot python3-certbot-nginx
  certbot --nginx -d warblood.online -d www.warblood.online
  ```

---

## 🚀 应用部署

### 1. 部署后端代码
- [ ] 上传服务器代码到 `/var/www/daily-report/server`
- [ ] 安装依赖: `npm install --production`
- [ ] 配置环境变量

### 2. 启动服务
- [ ] 启动 PM2: `pm2 start ecosystem.config.js`
- [ ] 设置开机自启: `pm2 startup && pm2 save`
- [ ] 启动 Nginx: `systemctl restart nginx`

### 3. 部署管理后台
- [ ] 上传 admin-panel 到 `/var/www/daily-report/admin-panel`

---

## ✅ 验证测试

### 1. 服务状态检查
- [ ] MySQL 运行正常: `systemctl status mysql`
- [ ] Nginx 运行正常: `systemctl status nginx`
- [ ] Node.js 应用运行正常: `pm2 status`

### 2. 功能测试
- [ ] 小程序登录正常
- [ ] 日报提交正常
- [ ] 审核功能正常
- [ ] WPS 写入正常
- [ ] 订阅消息推送正常

### 3. 性能测试
- [ ] 接口响应时间正常
- [ ] 数据库连接正常
- [ ] 无内存泄漏

---

## 🔄 DNS 切换

### 1. 切换前
- [ ] 确认新服务器所有功能正常
- [ ] 降低原服务器 TTL 值

### 2. 切换
- [ ] 修改 DNS A 记录指向新服务器 IP
- [ ] 等待 DNS 生效

### 3. 切换后
- [ ] 验证域名解析正确
- [ ] 验证 HTTPS 证书有效
- [ ] 监控服务运行状态

---

## 🔧 云函数配置更新

### 1. 更新环境变量
在每个云函数中更新以下环境变量:
- [ ] `MYSQL_HOST` - 新服务器 IP
- [ ] `MYSQL_PORT` - MySQL 端口 (默认 3306)
- [ ] `MYSQL_USER` - 数据库用户名
- [ ] `MYSQL_PASSWORD` - 数据库密码
- [ ] `MYSQL_DATABASE` - 数据库名

### 2. 重新部署云函数
- [ ] login
- [ ] submitReport
- [ ] reviewReport
- [ ] manageAdmin
- [ ] initAdmin

---

## 📝 常见问题排查

### MySQL 连接失败
```bash
# 检查 MySQL 状态
systemctl status mysql

# 检查端口
netstat -tlnp | grep 3306

# 检查用户权限
mysql -u root -p -e "SELECT user, host FROM mysql.user;"
```

### Nginx 配置错误
```bash
# 测试配置
nginx -t

# 查看错误日志
tail -f /var/log/nginx/error.log
```

### Node.js 应用错误
```bash
# 查看日志
pm2 logs daily-report-api

# 重启应用
pm2 restart daily-report-api
```

---

## 📞 回滚方案

如果迁移失败，执行以下步骤回滚:

1. 恢复 DNS 指向原服务器
2. 重启原服务器服务
3. 检查数据一致性
4. 重新规划迁移时间

---

**迁移完成日期:** ________________

**负责人签名:** ________________
