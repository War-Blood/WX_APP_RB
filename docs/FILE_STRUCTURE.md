# 项目目录结构说明

## 目录概览

```
d:\AI\WX_APP_RB\
├── miniapp/                 # 微信小程序源码
│   ├── pages/               # 页面
│   ├── components/          # 组件
│   ├── services/            # 业务服务
│   ├── utils/               # 工具函数
│   ├── custom-tab-bar/      # 自定义 TabBar
│   ├── app.js               # 小程序入口
│   ├── app.json             # 小程序配置
│   └── app.wxss             # 全局样式
├── webapp/                  # Web 应用
│   └── admin-panel/         # 管理后台
├── cloudfunctions/          # 微信云函数
├── sql/                     # 数据库脚本
├── tests/                   # 测试文件
├── reports/                 # 测试报告
├── docs/                    # 项目文档
├── config/                  # 配置文件
├── migration/               # 迁移脚本
├── scripts/                 # 工具脚本
└── SSH/                     # SSH 配置
```

## 目录说明

| 目录 | 用途 |
|-----|------|
| `miniapp/` | 微信小程序源码，包含页面、组件、服务、工具 |
| `webapp/` | Web 应用，包含管理后台等 |
| `cloudfunctions/` | 微信云函数，后端逻辑 |
| `sql/` | 数据库脚本和 API 服务 |
| `tests/` | 单元测试文件 |
| `reports/` | 测试覆盖率报告 |
| `docs/` | 项目文档 |
| `config/` | 统一配置管理 |

## 开发入口

- **小程序开发**: 用微信开发者工具打开项目根目录
- **云函数开发**: `cloudfunctions/` 目录
- **后端 API**: `sql/server_v2.js`
- **管理后台**: `webapp/admin-panel/`
