# Ubuntu 24.04 迁移备份文件夹

此文件夹包含从 CentOS 7.6 迁移到 Ubuntu 24.04 所需的所有配置和脚本。

## 文件夹结构

```
migration/
├── README.md                    # 本说明文件
├── CHECKLIST.md                 # 迁移检查清单
├── database/
│   ├── init.sql                 # 数据库初始化脚本（用户表+日报表）
│   ├── init_project_progress.sql # 项目进度表初始化
│   └── backup.sh                # 数据备份脚本
├── config/
│   ├── env.template             # 环境变量模板
│   ├── nginx.conf               # Nginx 配置
│   └── ecosystem.config.js      # PM2 配置
├── scripts/
│   ├── install-ubuntu.sh        # Ubuntu 一键安装脚本
│   ├── deploy.sh                # 部署脚本
│   └── restore.sh               # 数据恢复脚本
└── ssl/
    └── .gitkeep                 # SSL 证书存放目录
```

## 使用步骤

### 1. 在 CentOS 上备份数据
```bash
cd migration/scripts
chmod +x backup.sh
./backup.sh
```

### 2. 在 Ubuntu 上执行安装
```bash
cd migration/scripts
chmod +x install-ubuntu.sh
sudo ./install-ubuntu.sh
```

### 3. 恢复数据
```bash
chmod +x restore.sh
./restore.sh
```

## 重要提示

- 所有敏感信息（密码、密钥）请填写在 `config/env.template` 中
- SSL 证书请放在 `ssl/` 目录
- 迁移前请仔细阅读 `CHECKLIST.md`
