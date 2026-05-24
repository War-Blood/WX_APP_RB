# 开发指南

**文档版本**: v1.1  
**创建日期**: 2026-05-24  
**更新日期**: 2026-05-24  
**适用人群**: 前端开发、后端开发、全栈开发

---

## 目录

1. [项目概述](#1-项目概述)
2. [开发环境搭建](#2-开发环境搭建)
3. [项目结构](#3-项目结构)
4. [技术栈说明](#4-技术栈说明)
5. [代码规范](#5-代码规范)
6. [开发流程](#6-开发流程)
7. [测试指南](#7-测试指南)
8. [调试技巧](#8-调试技巧)
9. [常见问题](#9-常见问题)

---

## 1. 项目概述

### 1.1 项目简介

本项目是一个**模块化办公OA平台**，以微信小程序为载体，实现日报提交与审核、用户管理、权限控制等功能。

### 1.2 核心功能

| 功能模块 | 说明 |
|---------|------|
| 用户登录 | 微信一键登录，自动注册 |
| 日报提交 | 员工填写并提交日报 |
| 日报审核 | 管理员审核通过/驳回 |
| 用户管理 | 管理员管理用户和权限 |
| WPS 集成 | 审核通过自动写入 WPS 表格 |

### 1.3 技术架构

```
前端: 微信小程序原生框架
后端: 微信云函数 + Node.js
数据库: MySQL 8.0
部署: Nginx + PM2
```

---

## 2. 开发环境搭建

### 2.1 必备工具

| 工具 | 版本要求 | 下载地址 |
|-----|---------|---------|
| 微信开发者工具 | 最新稳定版 | https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html |
| Node.js | 18.x LTS | https://nodejs.org/ |
| Git | 最新版 | https://git-scm.com/ |
| VS Code | 最新版 | https://code.visualstudio.com/ |

### 2.2 VS Code 插件推荐

| 插件 | 用途 |
|-----|------|
| minapp | 小程序开发辅助 |
| wxml-language-server | WXML 语法高亮 |
| wxmp-developer | 小程序代码片段 |
| ESLint | 代码规范检查 |
| Prettier | 代码格式化 |
| GitLens | Git 增强 |

### 2.3 克隆项目

```bash
# 克隆仓库
git clone https://github.com/your-repo/WX_APP_RB.git

# 进入项目目录
cd WX_APP_RB

# 安装依赖
npm install
```

### 2.4 配置微信开发者工具

1. 打开微信开发者工具
2. 导入项目，选择项目根目录
3. 填写 AppID（在微信公众平台获取）
4. 开启「云开发」功能

### 2.5 配置云开发环境

1. 在微信开发者工具中点击「云开发」
2. 创建云开发环境
3. 记录环境 ID
4. 在 `project.config.json` 中配置：

```json
{
  "cloudfunctionRoot": "cloudfunctions/",
  "cloudbaseRoot": "cloudbase://your-env-id/"
}
```

### 2.6 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```bash
# MySQL 配置
MYSQL_HOST=111.229.107.123
MYSQL_PORT=3306
MYSQL_USER=daily_report_user
MYSQL_PASSWORD=DailyReport@2024
MYSQL_DATABASE=daily_report
```

---

## 3. 项目结构

### 3.1 目录结构

```
WX_APP_RB/
├── cloudfunctions/           # 云函数目录
│   ├── common/               # 公共模块
│   │   ├── mysql.js          # MySQL 连接池
│   │   └── auth.js           # 权限验证
│   ├── login/                # 登录云函数
│   ├── submitReport/         # 日报提交云函数
│   ├── reviewReport/         # 日报审核云函数
│   ├── manageAdmin/          # 用户管理云函数
│   └── initAdmin/            # 初始化管理员云函数
│
├── pages/                    # 页面目录
│   ├── home/                 # 首页
│   ├── login/                # 登录页
│   ├── features/             # 功能列表
│   ├── profile/              # 个人中心
│   ├── employee/             # 员工页面
│   │   ├── project-edit/     # 日报编辑
│   │   ├── project-history/  # 历史记录
│   │   └── report-detail/    # 日报详情
│   └── admin/                # 管理员页面
│       ├── review-list/      # 审核列表
│       ├── review-detail/    # 审核详情
│       ├── project-list/     # 日报记录
│       └── user-manage/      # 用户管理
│
├── components/               # 公共组件
│   └── status-tag/           # 状态标签组件
│
├── services/                 # 业务服务层
│   ├── project.js            # 项目日报服务
│   ├── report.js             # 日报服务
│   └── review.js             # 审核服务
│
├── utils/                    # 工具函数
│   ├── request.js            # 请求封装
│   ├── auth.js               # 权限工具
│   ├── cache.js              # 缓存工具
│   ├── date.js               # 日期工具
│   ├── debounce.js           # 防抖节流
│   └── form.js               # 表单工具
│
├── config/                   # 配置文件
│   └── index.js              # 配置入口
│
├── custom-tab-bar/           # 自定义 TabBar
│
├── sql/                      # 数据库脚本
│   ├── init.sql              # 初始化脚本
│   └── *.sql                 # 其他脚本
│
├── tests/                    # 测试文件
│   ├── cloudfunctions/       # 云函数测试
│   └── utils/                # 工具函数测试
│
├── docs/                     # 文档目录
│   ├── PRD.md                # 产品需求文档
│   ├── TECH_ARCHITECTURE.md  # 技术架构文档
│   ├── API.md                # API 接口文档
│   ├── DEPLOY.md             # 部署文档
│   └── DEVELOPMENT.md        # 开发指南
│
├── app.js                    # 小程序入口
├── app.json                  # 小程序配置
├── app.wxss                  # 全局样式
├── project.config.json       # 项目配置
└── package.json              # 依赖配置
```

### 3.2 文件命名规范

| 类型 | 规范 | 示例 |
|-----|------|------|
| 页面目录 | 小写连字符 | `project-edit` |
| 组件目录 | 小写连字符 | `status-tag` |
| JS 文件 | 小驼峰 | `project.js` |
| WXML 文件 | index.wxml | `index.wxml` |
| WXSS 文件 | index.wxss | `index.wxss` |
| JSON 文件 | index.json | `index.json` |

---

## 4. 技术栈说明

### 4.1 前端技术栈

| 技术 | 说明 |
|-----|------|
| 微信小程序原生框架 | 基础框架 |
| WXML | 模板语言 |
| WXSS | 样式语言 |
| JavaScript ES6+ | 逻辑层语言 |

### 4.2 后端技术栈

| 技术 | 说明 |
|-----|------|
| 微信云函数 | Serverless 函数服务 |
| Node.js 18.x | 运行环境 |
| MySQL 8.0 | 数据库 |
| mysql2 | MySQL 驱动 |

### 4.3 关键依赖

```json
{
  "dependencies": {
    "mysql2": "^3.x",        // MySQL 驱动
    "wx-server-sdk": "latest", // 云开发 SDK
    "axios": "^1.x"          // HTTP 请求（WPS 集成）
  },
  "devDependencies": {
    "jest": "^29.x",         // 测试框架
    "eslint": "^8.x"         // 代码检查
  }
}
```

---

## 5. 代码规范

### 5.1 JavaScript 规范

#### 变量声明

```javascript
// 推荐：使用 const/let
const MAX_COUNT = 100;
let userList = [];

// 禁止：使用 var
// var name = 'test';  // 不推荐
```

#### 函数定义

```javascript
// 推荐：箭头函数
const getUserInfo = (openid) => {
  return db.query('SELECT * FROM users WHERE openid = ?', [openid]);
};

// 推荐：async/await
async function submitReport(data) {
  try {
    const result = await db.insert(data);
    return { code: 0, data: result };
  } catch (err) {
    console.error('提交失败:', err);
    return { code: -1, message: err.message };
  }
}
```

#### 注释规范

```javascript
/**
 * 获取用户信息
 * @param {string} openid - 用户唯一标识
 * @returns {Promise<Object>} 用户信息对象
 * @throws {Error} 当用户不存在时抛出异常
 */
async function getUserInfo(openid) {
  // 实现代码...
}
```

### 5.2 命名规范

| 类型 | 规范 | 示例 |
|-----|------|------|
| 变量 | 小驼峰 | `userName`, `isAdmin` |
| 常量 | 全大写下划线 | `MAX_COUNT`, `BASE_URL` |
| 函数 | 小驼峰+动词 | `getUserInfo`, `submitReport` |
| 私有方法 | 下划线前缀 | `_loadData`, `_validateForm` |
| 组件 | 大驼峰 | `StatusTag`, `EmptyState` |
| 数据库表 | 小写下划线 | `daily_reports`, `users` |
| 数据库字段 | 小写下划线 | `user_name`, `created_at` |

### 5.3 Git 提交规范

```
<type>(<scope>): <subject>

type 类型:
- feat: 新功能
- fix: 修复 Bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 重构
- test: 测试相关
- chore: 构建/工具相关

示例:
feat(report): 添加日报导出功能
fix(auth): 修复登录状态判断问题
docs(api): 更新 API 接口文档
```

### 5.4 文件头注释

```javascript
/**
 * @file 项目进度日报服务
 * @author 开发者姓名
 * @date 2026-05-24
 * @description 提供项目日报的增删改查功能
 */
```

---

## 6. 开发流程

### 6.1 页面开发流程

```
1. 在 app.json 中注册页面路径
2. 创建页面目录和文件
3. 编写 WXML 模板
4. 编写 WXSS 样式
5. 编写 JS 逻辑
6. 编写 JSON 配置
7. 测试页面功能
```

### 6.2 云函数开发流程

```
1. 在 cloudfunctions 目录创建云函数目录
2. 编写 index.js 主文件
3. 编写 package.json 依赖配置
4. 本地测试
5. 上传部署到云端
6. 配置环境变量
7. 测试云函数调用
```

### 6.3 组件开发流程

```
1. 在 components 目录创建组件目录
2. 编写组件文件 (js/wxml/wxss/json)
3. 在页面 JSON 中引入组件
4. 在页面 WXML 中使用组件
5. 测试组件功能
```

### 6.4 生命周期

#### 页面生命周期

```javascript
Page({
  onLoad(options) {
    // 页面加载时触发，获取参数
  },
  
  onShow() {
    // 页面显示时触发
  },
  
  onReady() {
    // 页面初次渲染完成
  },
  
  onHide() {
    // 页面隐藏
  },
  
  onUnload() {
    // 页面卸载
  },
  
  onPullDownRefresh() {
    // 下拉刷新
  },
  
  onReachBottom() {
    // 上拉加载更多
  }
});
```

#### 组件生命周期

```javascript
Component({
  lifetimes: {
    attached() {
      // 组件实例进入页面节点树
    },
    detached() {
      // 组件实例从页面节点树移除
    }
  },
  
  pageLifetimes: {
    show() {
      // 所在页面显示
    },
    hide() {
      // 所在页面隐藏
    }
  }
});
```

---

## 7. 测试指南

### 7.1 测试环境配置

```bash
# 安装测试依赖
npm install --save-dev jest

# 配置 package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### 7.2 单元测试示例

```javascript
// tests/utils/date.test.js
const { formatDate, getToday } = require('../../utils/date');

describe('Date Utils', () => {
  test('formatDate should format date correctly', () => {
    const date = new Date('2026-05-24');
    expect(formatDate(date, 'YYYY-MM-DD')).toBe('2026-05-24');
  });

  test('getToday should return today string', () => {
    const today = getToday();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

### 7.3 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- tests/utils/date.test.js

# 生成覆盖率报告
npm run test:coverage
```

### 7.4 测试覆盖率目标

| 类型 | 目标覆盖率 |
|-----|-----------|
| 工具函数 | 80%+ |
| 服务层 | 70%+ |
| 云函数 | 60%+ |

---

## 8. 调试技巧

### 8.1 微信开发者工具调试

#### 控制台调试

```javascript
// 在代码中打印日志
console.log('调试信息:', data);

// 使用 console.table 打印表格
console.table(userList);
```

#### 断点调试

1. 在「Sources」面板找到对应文件
2. 点击行号设置断点
3. 触发对应操作，程序会在断点处暂停
4. 使用调试面板查看变量、调用栈

#### 网络请求调试

1. 打开「Network」面板
2. 查看请求列表
3. 点击请求查看详情（请求头、响应体）

### 8.2 云函数调试

#### 本地调试

```javascript
// 在云函数目录下创建 test.js
const cloud = require('wx-server-sdk');
cloud.init();

const main = require('./index');

// 模拟调用
main.main({
  action: 'getList',
  page: 1
}, {}).then(res => {
  console.log('结果:', res);
});
```

#### 云端日志

1. 打开微信开发者工具
2. 点击「云开发」控制台
3. 选择「云函数」->「日志」
4. 查看云函数执行日志

### 8.3 数据库调试

```javascript
// 打印 SQL 查询
console.log('SQL:', sql, 'Params:', params);

// 打印查询结果
const [rows] = await pool.execute(sql, params);
console.log('查询结果:', rows);
```

---

## 9. 常见问题

### 9.1 云函数部署失败

**问题**: 上传云函数时报错

**解决方案**:
1. 检查 `package.json` 依赖是否正确
2. 检查云函数目录结构是否正确
3. 尝试删除 `node_modules` 后重新上传
4. 检查云开发环境是否正常

### 9.2 数据库连接失败

**问题**: 云函数调用时报数据库连接错误

**解决方案**:
1. 检查云函数环境变量配置
2. 检查 MySQL 服务器防火墙设置
3. 检查 MySQL 用户远程访问权限
4. 检查数据库连接参数是否正确

### 9.3 页面样式异常

**问题**: 样式显示与预期不符

**解决方案**:
1. 检查 WXSS 选择器优先级
2. 检查是否有全局样式覆盖
3. 使用微信开发者工具的「样式」面板调试
4. 检查 rpx 单位换算

### 9.4 请求超时

**问题**: 接口请求超时

**解决方案**:
1. 检查网络连接
2. 检查云函数执行时间（默认 5 秒）
3. 优化数据库查询
4. 添加请求超时处理

### 9.5 真机调试问题

**问题**: 真机预览与开发工具表现不一致

**解决方案**:
1. 检查基础库版本
2. 检查 API 兼容性
3. 使用真机调试功能排查
4. 查看真机控制台日志

---

## 附录

### A. 开发命令速查

| 命令 | 说明 |
|-----|------|
| `npm install` | 安装依赖 |
| `npm test` | 运行测试 |
| `npm run lint` | 代码检查 |
| `npm run format` | 代码格式化 |

### B. 常用 API 速查

#### 页面跳转

```javascript
// 保留当前页面，跳转到应用内的某个页面
wx.navigateTo({ url: '/pages/detail/index?id=1' });

// 关闭当前页面，跳转到应用内的某个页面
wx.redirectTo({ url: '/pages/login/index' });

// 跳转到 tabBar 页面
wx.switchTab({ url: '/pages/home/index' });

// 返回上一页
wx.navigateBack({ delta: 1 });
```

#### 数据缓存

```javascript
// 设置缓存
wx.setStorageSync('key', 'value');

// 获取缓存
const value = wx.getStorageSync('key');

// 删除缓存
wx.removeStorageSync('key');

// 清空缓存
wx.clearStorageSync();
```

#### 网络请求

```javascript
wx.request({
  url: 'https://api.example.com/data',
  method: 'GET',
  success(res) {
    console.log(res.data);
  },
  fail(err) {
    console.error(err);
  }
});
```

### C. 相关文档链接

| 文档 | 链接 |
|-----|------|
| 微信小程序开发文档 | https://developers.weixin.qq.com/miniprogram/dev/framework/ |
| 云开发文档 | https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html |
| Node.js 文档 | https://nodejs.org/docs/latest-v18.x/api/ |
| MySQL 文档 | https://dev.mysql.com/doc/refman/8.0/en/ |

### D. 变更记录

| 版本 | 日期 | 修改人 | 修改内容 |
|-----|------|-------|---------|
| v1.0 | 2026-05-24 | 技术团队 | 初稿创建 |
| v1.1 | 2026-05-24 | 技术团队 | 同步更新文档版本和变更记录 |

---

**文档结束**
