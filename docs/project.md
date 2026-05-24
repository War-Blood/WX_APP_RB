# 项目规则

## 开发前必读文档

开发任何功能前，必须先阅读以下文档了解项目背景和设计：

| 文档 | 路径 | 用途 |
|-----|------|------|
| PRD | `docs/PRD.md` | 产品需求、功能规格、验收标准 |
| 技术架构 | `docs/TECH_ARCHITECTURE.md` | 系统架构、接口设计、数据库设计 |
| 编码规范 | `docs/coding.md` | 命名规范、代码风格、Git规范 |

**开发流程**：
1. 先读取 PRD 了解功能需求
2. 再读取技术架构了解实现方案
3. 遵循编码规范进行开发

## 技术栈
- **前端**: 微信小程序原生开发
- **后端**: Node.js + Express / 微信云函数
- **数据库**: MySQL 8.0
- **服务器**: Ubuntu 24.04, Nginx, PM2

## 环境变量
```
MYSQL_HOST=111.229.107.123
MYSQL_PORT=3306
MYSQL_USER=daily_report_user
MYSQL_PASSWORD=DailyReport@2024
MYSQL_DATABASE=daily_report
```

## 开发命令
```bash
npm install                    # 安装依赖
右键云函数目录 → 上传并部署    # 部署云函数
微信开发者工具 → 编译预览      # 本地调试
```

## 分支管理
- `main` - 生产分支
- `develop` - 开发分支
- `feature/*` - 功能分支

## 提交前检查
1. 代码格式化
2. 移除 console.log
3. 测试核心功能
