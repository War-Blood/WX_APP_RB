# 模块化办公OA平台技术架构设计文档

**文档版本**: v1.1  
**创建日期**: 2026-05-24  
**更新日期**: 2026-05-24  
**文档状态**: 已实施  
**技术负责人**: 技术团队  

---

## 目录

1. [技术架构概述](#1-技术架构概述)
2. [系统架构设计](#2-系统架构设计)
3. [前端架构设计](#3-前端架构设计)
4. [后端架构设计](#4-后端架构设计)
5. [数据库设计](#5-数据库设计)
6. [接口设计](#6-接口设计)
7. [权限架构设计](#7-权限架构设计)
8. [技术选型说明](#8-技术选型说明)
9. [开发规范](#9-开发规范)
10. [开发路线图](#10-开发路线图)
11. [部署架构](#11-部署架构)
12. [风险与应对](#12-风险与应对)

---

## 1. 技术架构概述

### 1.1 架构设计原则

| 原则 | 说明 |
|-----|------|
| **模块化** | 功能模块独立开发、独立部署、按需加载 |
| **可扩展** | 支持新模块快速接入，权限系统灵活配置 |
| **高可用** | 服务冗余、故障转移、数据备份 |
| **安全性** | 前后端双重权限校验，敏感数据加密 |
| **性能优先** | 缓存策略、懒加载、请求优化 |

### 1.2 架构总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           客户端层 (Client Layer)                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    微信小程序 (WeChat Mini Program)               │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │  首页    │ │  功能    │ │  我的    │ │ 自定义   │           │   │
│  │  │ 工作台   │ │  列表    │ │  中心    │ │ TabBar   │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │  模块化页面: 日报管理 | 用户管理 | 权限管理 | ...          │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS / WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           网关层 (Gateway Layer)                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        Nginx 反向代理                            │   │
│  │  • SSL 终止  • 负载均衡  • 请求路由  • 静态资源                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           服务层 (Service Layer)                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Node.js API Server                          │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │  中间件: 认证 | 权限校验 | 日志 | 限流 | 错误处理          │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │ 用户    │ │ 权限    │ │ 日报    │ │ 模块    │ │ 审批    │   │   │
│  │  │ 服务    │ │ 服务    │ │ 服务    │ │ 服务    │ │ 服务    │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    微信云函数 (可选/备用)                         │   │
│  │  • 登录认证  • 敏感操作  • 定时任务                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           数据层 (Data Layer)                            │
│  ┌───────────────────────┐  ┌───────────────────────┐                  │
│  │      MySQL 8.0        │  │      Redis 6.x        │                  │
│  │  • 业务数据存储        │  │  • 会话缓存           │                  │
│  │  • 事务支持            │  │  • 权限缓存           │                  │
│  │  • 主从复制            │  │  • 热点数据           │                  │
│  └───────────────────────┘  └───────────────────────┘                  │
│  ┌───────────────────────┐  ┌───────────────────────┐                  │
│  │      OSS 存储         │  │      WPS API          │                  │
│  │  • 文件上传            │  │  • 表格写入           │                  │
│  │  • 图片存储            │  │  • 数据同步           │                  │
│  └───────────────────────┘  └───────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 系统架构设计

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              系统架构全景图                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                 │
│   │   微信      │     │   管理后台   │     │   第三方    │                 │
│   │   小程序    │     │   (Web)     │     │   服务      │                 │
│   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                 │
│          │                   │                   │                         │
│          └───────────────────┼───────────────────┘                         │
│                              │                                             │
│                              ▼                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐ │
│   │                         API Gateway (Nginx)                          │ │
│   │   • HTTPS 终止  • 负载均衡  • 限流熔断  • 请求路由                   │ │
│   └─────────────────────────────────────────────────────────────────────┘ │
│                              │                                             │
│                              ▼                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐ │
│   │                        业务服务层 (Node.js)                          │ │
│   │                                                                      │ │
│   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │ │
│   │   │  核心模块    │  │  业务模块    │  │  扩展模块    │             │ │
│   │   │              │  │              │  │              │             │ │
│   │   │ • 用户服务   │  │ • 日报服务   │  │ • 请假服务   │             │ │
│   │   │ • 权限服务   │  │ • 审核服务   │  │ • 公告服务   │             │ │
│   │   │ • 模块服务   │  │ • 统计服务   │  │ • 考勤服务   │             │ │
│   │   └──────────────┘  └──────────────┘  └──────────────┘             │ │
│   └─────────────────────────────────────────────────────────────────────┘ │
│                              │                                             │
│                              ▼                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐ │
│   │                           数据存储层                                 │ │
│   │                                                                      │ │
│   │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │ │
│   │   │  MySQL   │  │  Redis   │  │   OSS    │  │   日志   │          │ │
│   │   │  主从    │  │  集群    │  │  存储    │  │  系统    │          │ │
│   │   └──────────┘  └──────────┘  └──────────┘  └──────────┘          │ │
│   └─────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 模块化架构设计

系统采用**模块化架构**，每个功能模块独立定义、独立配置：

```
modules/
├── core/                      # 核心模块（必须）
│   ├── user/                  # 用户管理
│   │   ├── module.json        # 模块配置
│   │   ├── pages/             # 页面文件
│   │   ├── services/          # 服务层
│   │   └── permissions.json   # 权限定义
│   ├── permission/            # 权限管理
│   │   ├── module.json
│   │   └── ...
│   └── workbench/             # 工作台
│       ├── module.json
│       └── ...
│
├── business/                  # 业务模块
│   ├── daily-report/          # 日报管理
│   │   ├── module.json
│   │   ├── pages/
│   │   │   ├── edit/          # 日报编辑
│   │   │   ├── history/       # 历史记录
│   │   │   ├── review/        # 审核管理
│   │   │   └── stats/         # 统计分析
│   │   ├── services/
│   │   │   ├── report.js      # 日报服务
│   │   │   └── stats.js       # 统计服务
│   │   └── permissions.json
│   └── ...
│
└── extensions/                # 扩展模块（可选）
    ├── leave/                 # 请假管理
    ├── announcement/          # 公告通知
    └── attendance/            # 考勤打卡
```

### 2.3 模块注册机制

每个模块通过 `module.json` 进行注册：

```json
{
  "moduleId": "daily-report",
  "moduleName": "日报管理",
  "moduleIcon": "📝",
  "version": "1.0.0",
  "description": "员工日报提交与审核管理",
  "entryPage": "/modules/business/daily-report/pages/edit/index",
  "permissions": [
    "report:create",
    "report:read",
    "report:update",
    "report:delete",
    "report:review",
    "report:export"
  ],
  "menus": [
    {
      "id": "report-submit",
      "name": "提交日报",
      "page": "/modules/business/daily-report/pages/edit/index",
      "permission": "report:create",
      "icon": "📝",
      "sort": 1
    },
    {
      "id": "report-history",
      "name": "我的日报",
      "page": "/modules/business/daily-report/pages/history/index",
      "permission": "report:read",
      "icon": "📋",
      "sort": 2
    }
  ],
  "enabled": true
}
```

---

## 3. 前端架构设计

### 3.1 前端技术栈

| 技术 | 版本 | 用途 |
|-----|------|------|
| 微信小程序原生框架 | - | 基础框架 |
| JavaScript | ES6+ | 开发语言 |
| WXSS | - | 样式系统 |
| 自定义 TabBar | - | 动态菜单 |

### 3.2 前端目录结构

```
miniprogram/
├── app.js                      # 应用入口
├── app.json                    # 应用配置
├── app.wxss                    # 全局样式
├── project.config.json         # 项目配置
│
├── components/                 # 公共组件
│   ├── status-tag/             # 状态标签
│   ├── empty-state/            # 空状态
│   ├── loading/                # 加载组件
│   └── permission-guard/       # 权限守卫组件
│
├── custom-tab-bar/             # 自定义 TabBar
│   ├── index.js
│   ├── index.json
│   ├── index.wxml
│   └── index.wxss
│
├── modules/                    # 模块化页面
│   ├── core/
│   │   ├── user/               # 用户模块
│   │   ├── permission/         # 权限模块
│   │   └── workbench/          # 工作台模块
│   └── business/
│       └── daily-report/       # 日报模块
│
├── pages/                      # 页面（按模块组织）
│   ├── home/                   # 首页
│   ├── login/                  # 登录
│   ├── features/               # 功能列表
│   ├── profile/                # 个人中心
│   ├── employee/               # 员工页面
│   │   ├── project-edit/       # 日报编辑
│   │   ├── project-history/    # 历史记录
│   │   └── project-detail/     # 日报详情
│   └── admin/                  # 管理员页面
│       ├── review-list/        # 审核列表
│       ├── review-detail/      # 审核详情
│       ├── project-list/       # 日报记录
│       └── user-manage/        # 用户管理
│
├── services/                   # 服务层
│   ├── user.js                 # 用户服务
│   ├── auth.js                 # 认证服务
│   ├── permission.js           # 权限服务
│   ├── project.js              # 项目日报服务
│   └── report.js               # 日报服务
│
├── utils/                      # 工具函数
│   ├── request.js              # 请求封装
│   ├── auth.js                 # 权限工具
│   ├── storage.js              # 存储工具
│   ├── debounce.js             # 防抖节流
│   ├── format.js               # 格式化工具
│   └── validate.js             # 校验工具
│
├── config/                     # 配置文件
│   ├── index.js                # 配置入口
│   ├── api.js                  # API 配置
│   └── constants.js            # 常量定义
│
├── models/                     # 数据模型
│   ├── user.js                 # 用户模型
│   ├── report.js               # 日报模型
│   └── permission.js           # 权限模型
│
└── assets/                     # 静态资源
    ├── images/
    └── icons/
```

### 3.3 前端分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         视图层 (View Layer)                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │   WXML    │  │   WXSS    │  │  Components│  │  Pages    │   │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        逻辑层 (Logic Layer)                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │   Page    │  │  Service  │  │   Model   │  │   Store   │   │
│  │   .js     │  │   .js     │  │   .js     │  │ (global)  │   │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        数据层 (Data Layer)                       │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │  Storage  │  │  Request  │  │   Cache   │  │  WebSocket│   │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 权限控制设计

#### 3.4.1 前端权限控制流程

```
┌─────────────┐
│  用户登录   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 获取用户角色│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 查询角色权限│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 加载模块配置│
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│             权限缓存 (Storage + Redis)        │
│  ┌─────────────────────────────────────────┐│
│  │  user_permissions: {                     ││
│  │    openid: "xxx",                        ││
│  │    roles: ["employee"],                  ││
│  │    permissions: ["report:create", ...],  ││
│  │    menus: [...],                         ││
│  │    expireAt: timestamp                   ││
│  │  }                                       ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│ 过滤有权限的 │
│ 菜单和功能   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 渲染工作台  │
└─────────────┘
```

#### 3.4.2 权限守卫组件

```javascript
// components/permission-guard/index.js
Component({
  properties: {
    permission: {
      type: String,
      value: ''
    },
    fallback: {
      type: String,
      value: 'hide' // hide | disable | custom
    }
  },

  data: {
    hasPermission: false
  },

  lifetimes: {
    attached() {
      this.checkPermission();
    }
  },

  methods: {
    checkPermission() {
      const { permission } = this.properties;
      if (!permission) {
        this.setData({ hasPermission: true });
        return;
      }
      
      const permissions = wx.getStorageSync('user_permissions') || [];
      const hasPermission = permissions.includes(permission) || permissions.includes('*');
      
      this.setData({ hasPermission });
    }
  }
});
```

#### 3.4.3 页面级权限控制

```javascript
// utils/auth.js - 增强版权限工具

/**
 * 检查用户是否拥有指定权限
 * @param {string} permission - 权限标识
 * @returns {boolean}
 */
function hasPermission(permission) {
  const userInfo = wx.getStorageSync('user_info') || {};
  
  // 超级管理员拥有所有权限
  if (userInfo.isSuperAdmin) {
    return true;
  }
  
  const permissions = wx.getStorageSync('user_permissions') || [];
  return permissions.includes(permission) || permissions.includes('*');
}

/**
 * 检查多个权限（满足任一即可）
 * @param {string[]} permissionList - 权限列表
 * @returns {boolean}
 */
function hasAnyPermission(permissionList) {
  return permissionList.some(p => hasPermission(p));
}

/**
 * 检查多个权限（需全部满足）
 * @param {string[]} permissionList - 权限列表
 * @returns {boolean}
 */
function hasAllPermissions(permissionList) {
  return permissionList.every(p => hasPermission(p));
}

/**
 * 页面权限守卫
 * @param {Object} options - 配置选项
 * @param {string[]} options.permissions - 需要的权限列表
 * @param {string} options.redirectUrl - 无权限时的跳转地址
 */
function pageGuard(options) {
  const { permissions = [], redirectUrl = '/pages/home/index' } = options;
  
  if (!hasAnyPermission(permissions)) {
    wx.showToast({
      title: '无访问权限',
      icon: 'none'
    });
    wx.redirectTo({ url: redirectUrl });
    return false;
  }
  return true;
}

module.exports = {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  pageGuard
};
```

### 3.5 动态菜单生成

```javascript
// services/menu.js - 动态菜单服务

const BASE_URL = 'https://warblood.online';

/**
 * 获取用户菜单
 */
async function getUserMenus() {
  const userInfo = wx.getStorageSync('user_info') || {};
  
  try {
    const res = await wx.request({
      url: `${BASE_URL}/api/menu/user`,
      method: 'GET',
      data: { openid: userInfo.openid }
    });
    
    if (res.data.code === 0) {
      // 缓存菜单
      wx.setStorageSync('user_menus', res.data.data);
      return res.data.data;
    }
    return [];
  } catch (err) {
    console.error('获取菜单失败:', err);
    return [];
  }
}

/**
 * 根据权限过滤菜单
 * @param {Array} menus - 菜单列表
 * @param {Array} permissions - 用户权限列表
 */
function filterMenusByPermission(menus, permissions) {
  return menus.filter(menu => {
    if (!menu.permission) return true;
    return permissions.includes(menu.permission) || permissions.includes('*');
  });
}

module.exports = {
  getUserMenus,
  filterMenusByPermission
};
```

---

## 4. 后端架构设计

### 4.1 后端技术栈

| 技术 | 版本 | 用途 |
|-----|------|------|
| Node.js | 18.x LTS | 运行环境 |
| 微信云函数 | - | Serverless 后端 |
| MySQL | 8.0 | 主数据库 |
| mysql2 | 3.x | MySQL 驱动 |
| axios | - | HTTP 请求（WPS API） |

### 4.2 后端目录结构

```
server/
├── src/
│   ├── app.js                  # 应用入口
│   ├── config/                 # 配置文件
│   │   ├── index.js            # 配置入口
│   │   ├── database.js         # 数据库配置
│   │   ├── redis.js            # Redis 配置
│   │   └── wechat.js           # 微信配置
│   │
│   ├── middleware/             # 中间件
│   │   ├── auth.js             # 认证中间件
│   │   ├── permission.js       # 权限中间件
│   │   ├── validator.js        # 参数校验中间件
│   │   ├── errorHandler.js     # 错误处理中间件
│   │   ├── rateLimiter.js      # 限流中间件
│   │   └── logger.js           # 日志中间件
│   │
│   ├── routes/                 # 路由定义
│   │   ├── index.js            # 路由入口
│   │   ├── auth.js             # 认证路由
│   │   ├── user.js             # 用户路由
│   │   ├── role.js             # 角色路由
│   │   ├── permission.js       # 权限路由
│   │   ├── report.js           # 日报路由
│   │   └── module.js           # 模块路由
│   │
│   ├── controllers/            # 控制器
│   │   ├── authController.js   # 认证控制器
│   │   ├── userController.js   # 用户控制器
│   │   ├── roleController.js   # 角色控制器
│   │   ├── reportController.js # 日报控制器
│   │   └── moduleController.js # 模块控制器
│   │
│   ├── services/               # 业务服务
│   │   ├── authService.js      # 认证服务
│   │   ├── userService.js      # 用户服务
│   │   ├── roleService.js      # 角色服务
│   │   ├── permissionService.js# 权限服务
│   │   ├── reportService.js    # 日报服务
│   │   └── moduleService.js    # 模块服务
│   │
│   ├── models/                 # 数据模型
│   │   ├── User.js             # 用户模型
│   │   ├── Role.js             # 角色模型
│   │   ├── Permission.js       # 权限模型
│   │   ├── Report.js           # 日报模型
│   │   └── Module.js           # 模块模型
│   │
│   ├── repositories/           # 数据访问层
│   │   ├── userRepository.js
│   │   ├── roleRepository.js
│   │   ├── permissionRepository.js
│   │   └── reportRepository.js
│   │
│   ├── utils/                  # 工具函数
│   │   ├── response.js         # 响应格式化
│   │   ├── jwt.js              # JWT 工具
│   │   ├── crypto.js           # 加密工具
│   │   └── logger.js           # 日志工具
│   │
│   └── constants/              # 常量定义
│       ├── errors.js           # 错误码
│       ├── permissions.js      # 权限常量
│       └── status.js           # 状态常量
│
├── tests/                      # 测试文件
│   ├── unit/                   # 单元测试
│   └── integration/            # 集成测试
│
├── scripts/                    # 脚本文件
│   ├── init-db.js              # 数据库初始化
│   └── seed-data.js            # 种子数据
│
├── package.json
└── ecosystem.config.js         # PM2 配置
```

### 4.3 后端分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         路由层 (Routes)                          │
│  定义 API 端点，映射到控制器                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       控制器层 (Controllers)                     │
│  处理请求参数，调用服务，返回响应                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        服务层 (Services)                         │
│  业务逻辑处理，事务管理，调用 Repository                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     数据访问层 (Repositories)                    │
│  数据库操作封装，SQL 查询                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       数据库层 (MySQL/Redis)                     │
│  数据存储                                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 中间件设计

#### 4.4.1 认证中间件

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

/**
 * JWT 认证中间件
 */
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      code: 401,
      message: '未登录'
    });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      code: 401,
      message: '登录已过期'
    });
  }
}

/**
 * 可选认证中间件（不强制登录）
 */
function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // 忽略错误，继续执行
    }
  }
  next();
}

module.exports = { authMiddleware, optionalAuth };
```

#### 4.4.2 权限中间件

```javascript
// middleware/permission.js
const permissionService = require('../services/permissionService');

/**
 * 权限检查中间件
 * @param {string|string[]} permissions - 需要的权限
 * @param {string} mode - 'any' | 'all'
 */
function checkPermission(permissions, mode = 'any') {
  return async (req, res, next) => {
    const { openid } = req.user;
    
    try {
      // 超级管理员跳过权限检查
      if (req.user.isSuperAdmin) {
        return next();
      }
      
      // 获取用户权限列表
      const userPermissions = await permissionService.getUserPermissions(openid);
      
      // 检查权限
      const permList = Array.isArray(permissions) ? permissions : [permissions];
      const hasPermission = mode === 'all'
        ? permList.every(p => userPermissions.includes(p))
        : permList.some(p => userPermissions.includes(p));
      
      if (!hasPermission) {
        return res.status(403).json({
          code: 403,
          message: '无操作权限'
        });
      }
      
      next();
    } catch (err) {
      console.error('权限检查失败:', err);
      return res.status(500).json({
        code: 500,
        message: '权限检查失败'
      });
    }
  };
}

module.exports = { checkPermission };
```

### 4.5 服务层示例

```javascript
// services/permissionService.js
const redis = require('../config/redis');
const permissionRepository = require('../repositories/permissionRepository');

const CACHE_PREFIX = 'perm:';
const CACHE_TTL = 3600; // 1小时

class PermissionService {
  /**
   * 获取用户所有权限
   * @param {string} openid
   * @returns {Promise<string[]>}
   */
  async getUserPermissions(openid) {
    // 先查缓存
    const cacheKey = `${CACHE_PREFIX}${openid}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    // 查数据库
    const permissions = await permissionRepository.findPermissionsByUserOpenid(openid);
    const permCodes = permissions.map(p => p.perm_code);
    
    // 写入缓存
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(permCodes));
    
    return permCodes;
  }
  
  /**
   * 清除用户权限缓存
   * @param {string} openid
   */
  async clearUserPermissionCache(openid) {
    const cacheKey = `${CACHE_PREFIX}${openid}`;
    await redis.del(cacheKey);
  }
  
  /**
   * 检查用户是否有指定权限
   * @param {string} openid
   * @param {string} permission
   * @returns {Promise<boolean>}
   */
  async hasPermission(openid, permission) {
    const permissions = await this.getUserPermissions(openid);
    return permissions.includes(permission) || permissions.includes('*');
  }
}

module.exports = new PermissionService();
```

---

## 5. 数据库设计

### 5.1 数据库架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        MySQL 主从架构                            │
│                                                                 │
│   ┌─────────────┐         ┌─────────────┐                      │
│   │   Master    │ ──────▶ │   Slave     │                      │
│   │  (写入)     │  同步    │  (读取)     │                      │
│   └─────────────┘         └─────────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        Redis 缓存架构                            │
│                                                                 │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│   │   Session   │  │ Permission  │  │   Hot Data  │           │
│   │   Cache     │  │   Cache     │  │   Cache     │           │
│   └─────────────┘  └─────────────┘  └─────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 核心数据表设计

#### 5.2.1 用户表 (users)

```sql
CREATE TABLE `users` (
  `openid`         VARCHAR(64)   NOT NULL COMMENT '微信用户唯一标识',
  `user_name`      VARCHAR(64)   NOT NULL DEFAULT '' COMMENT '用户姓名',
  `department`     VARCHAR(128)  NOT NULL DEFAULT '' COMMENT '部门',
  `avatar_url`     VARCHAR(512)  DEFAULT '' COMMENT '头像URL',
  `phone`          VARCHAR(20)   DEFAULT '' COMMENT '手机号',
  `status`         TINYINT       DEFAULT 1 COMMENT '状态：1正常 0禁用',
  `is_super_admin` TINYINT       DEFAULT 0 COMMENT '是否超级管理员',
  `created_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`openid`),
  INDEX `idx_department` (`department`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
```

#### 5.2.2 角色表 (roles)

```sql
CREATE TABLE `roles` (
  `role_id`      INT           NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  `role_code`    VARCHAR(50)   NOT NULL COMMENT '角色编码',
  `role_name`    VARCHAR(50)   NOT NULL COMMENT '角色名称',
  `description`  VARCHAR(255)  DEFAULT '' COMMENT '角色描述',
  `is_system`    TINYINT       DEFAULT 0 COMMENT '是否系统内置',
  `sort_order`   INT           DEFAULT 0 COMMENT '排序',
  `created_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uk_role_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 初始化系统角色
INSERT INTO `roles` (`role_code`, `role_name`, `description`, `is_system`, `sort_order`) VALUES
('super_admin', '超级管理员', '系统最高权限', 1, 1),
('admin', '管理员', '日常管理和审核', 1, 2),
('dept_manager', '部门经理', '管理本部门', 1, 3),
('employee', '普通员工', '日常办公用户', 1, 4);
```

#### 5.2.3 用户角色关联表 (user_roles)

```sql
CREATE TABLE `user_roles` (
  `id`          INT           NOT NULL AUTO_INCREMENT,
  `user_id`     VARCHAR(64)   NOT NULL COMMENT '用户openid',
  `role_id`     INT           NOT NULL COMMENT '角色ID',
  `assigned_by` VARCHAR(64)   DEFAULT '' COMMENT '分配人openid',
  `assigned_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
  KEY `idx_role_id` (`role_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`openid`) ON DELETE CASCADE,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';
```

#### 5.2.4 权限表 (permissions)

```sql
CREATE TABLE `permissions` (
  `perm_id`     INT           NOT NULL AUTO_INCREMENT COMMENT '权限ID',
  `perm_code`   VARCHAR(100)  NOT NULL COMMENT '权限编码',
  `perm_name`   VARCHAR(100)  NOT NULL COMMENT '权限名称',
  `module_id`   VARCHAR(50)   DEFAULT '' COMMENT '所属模块',
  `description` VARCHAR(255)  DEFAULT '' COMMENT '权限描述',
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`perm_id`),
  UNIQUE KEY `uk_perm_code` (`perm_code`),
  KEY `idx_module_id` (`module_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- 初始化权限数据
INSERT INTO `permissions` (`perm_code`, `perm_name`, `module_id`, `description`) VALUES
-- 日报模块权限
('report:create', '创建日报', 'daily-report', '提交新的日报'),
('report:read', '查看日报', 'daily-report', '查看日报详情'),
('report:update', '修改日报', 'daily-report', '编辑已提交的日报'),
('report:delete', '删除日报', 'daily-report', '删除日报记录'),
('report:review', '审核日报', 'daily-report', '审核通过/驳回日报'),
('report:export', '导出日报', 'daily-report', '导出日报数据'),
-- 用户管理权限
('user:create', '创建用户', 'user-management', '新增系统用户'),
('user:read', '查看用户', 'user-management', '查看用户信息'),
('user:update', '修改用户', 'user-management', '编辑用户信息'),
('user:delete', '删除用户', 'user-management', '删除用户账号'),
('user:assign_role', '分配角色', 'user-management', '为用户分配角色'),
-- 系统管理权限
('role:manage', '角色管理', 'permission-center', '创建、编辑、删除角色'),
('permission:manage', '权限管理', 'permission-center', '配置角色权限'),
('module:manage', '模块管理', 'permission-center', '启用、禁用功能模块'),
('system:config', '系统配置', 'permission-center', '修改系统参数');
```

#### 5.2.5 角色权限关联表 (role_permissions)

```sql
CREATE TABLE `role_permissions` (
  `id`           INT      NOT NULL AUTO_INCREMENT,
  `role_id`      INT      NOT NULL COMMENT '角色ID',
  `permission_id` INT     NOT NULL COMMENT '权限ID',
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_perm` (`role_id`, `permission_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE CASCADE,
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`permission_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- 初始化角色权限（超级管理员拥有所有权限，此处省略）
-- 管理员权限
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 2, `perm_id` FROM `permissions` WHERE `perm_code` IN 
  ('report:read', 'report:review', 'report:export', 'user:read', 'user:update', 'user:assign_role');

-- 部门经理权限
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 3, `perm_id` FROM `permissions` WHERE `perm_code` IN 
  ('report:read', 'report:review', 'report:export');

-- 普通员工权限
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 4, `perm_id` FROM `permissions` WHERE `perm_code` IN 
  ('report:create', 'report:read', 'report:update');
```

#### 5.2.6 日报表 (daily_project_progress)

```sql
CREATE TABLE `daily_project_progress` (
  `id`                              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `daily_time`                      DATE          NOT NULL COMMENT '日报日期',
  `filler_openid`                   VARCHAR(64)   NOT NULL COMMENT '填写人openid',
  `filler_name`                     VARCHAR(50)   NOT NULL COMMENT '填写人姓名',
  `project_name`                    VARCHAR(100)  NOT NULL COMMENT '项目名称',
  `project_area`                    VARCHAR(100)  DEFAULT '' COMMENT '项目区域',
  `related_unit`                    VARCHAR(100)  DEFAULT '' COMMENT '相关单位',
  `worker1_name`                    VARCHAR(50)   DEFAULT '' COMMENT '作业人员1',
  `worker2_name`                    VARCHAR(50)   DEFAULT '' COMMENT '作业人员2',
  `machine_model`                   VARCHAR(50)   DEFAULT '' COMMENT '作业机型',
  `person_count`                    INT UNSIGNED  DEFAULT 0 COMMENT '作业人数',
  `work_content`                    TEXT          COMMENT '今日工作内容',
  `need_complete_count`             INT UNSIGNED  DEFAULT 0 COMMENT '需完成总量',
  `total_complete_count`            INT UNSIGNED  DEFAULT 0 COMMENT '累计完成量',
  `current_progress`                DECIMAL(5,2)  DEFAULT 0.00 COMMENT '当前进度(%)',
  `today_work_summary`              TEXT          COMMENT '今日工作小结',
  `tomorrow_work_content`           TEXT          COMMENT '明日工作计划',
  `today_work_type`                 VARCHAR(50)   DEFAULT '' COMMENT '今日工作类型',
  `tomorrow_work_type`              VARCHAR(50)   DEFAULT '' COMMENT '明日工作类型',
  `remark`                          TEXT          COMMENT '备注',
  `entry_time`                      DATE          COMMENT '入场时间',
  `initial_business_trip_time`      DATE          COMMENT '初始出差时间',
  `project_business_trip_days`      INT UNSIGNED  DEFAULT 0 COMMENT '项目累计出差天数',
  `personal_total_business_trip`    INT UNSIGNED  DEFAULT 0 COMMENT '个人累计出差天数',
  `status`                          VARCHAR(20)   DEFAULT 'pending' COMMENT '审核状态',
  `review_note`                     TEXT          COMMENT '审核备注/驳回原因',
  `reviewer_openid`                 VARCHAR(64)   COMMENT '审核人openid',
  `review_time`                     TIMESTAMP     COMMENT '审核时间',
  `create_time`                     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`                     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_daily_filler_project` (`daily_time`, `filler_name`, `project_name`),
  INDEX `idx_filler_daily` (`filler_openid`, `daily_time`),
  INDEX `idx_project_daily` (`project_name`, `daily_time`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目进度日报表';
```

#### 5.2.7 模块配置表 (modules)

```sql
CREATE TABLE `modules` (
  `module_id`    VARCHAR(50)   NOT NULL COMMENT '模块ID',
  `module_name`  VARCHAR(100)  NOT NULL COMMENT '模块名称',
  `module_icon`  VARCHAR(50)   DEFAULT '' COMMENT '模块图标',
  `description`  TEXT          COMMENT '模块描述',
  `entry_page`   VARCHAR(255)  DEFAULT '' COMMENT '入口页面',
  `config`       JSON          COMMENT '模块配置JSON',
  `is_enabled`   TINYINT       DEFAULT 1 COMMENT '是否启用',
  `sort_order`   INT           DEFAULT 0 COMMENT '排序',
  `created_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`module_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块配置表';
```

### 5.3 ER 图

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │  user_roles  │       │    roles     │
│──────────────│       │──────────────│       │──────────────│
│ openid (PK)  │───────│ user_id (FK) │───────│ role_id (PK) │
│ user_name    │       │ role_id (FK) │       │ role_code    │
│ department   │       │ assigned_at  │       │ role_name    │
│ is_super_    │       └──────────────┘       │ is_system    │
│   admin      │                              └──────────────┘
└──────────────┘                                     │
       │                                             │
       │                                             │
       ▼                                             ▼
┌──────────────────────────────────────────────────────────────┐
│                     role_permissions                          │
│──────────────────────────────────────────────────────────────│
│ role_id (FK)                                                 │
│ permission_id (FK)                                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                      permissions                              │
│──────────────────────────────────────────────────────────────│
│ perm_id (PK)                                                 │
│ perm_code                                                    │
│ perm_name                                                    │
│ module_id                                                    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              daily_project_progress                           │
│──────────────────────────────────────────────────────────────│
│ id (PK)                                                      │
│ daily_time                                                   │
│ filler_openid (FK → users.openid)                            │
│ filler_name                                                  │
│ project_name                                                 │
│ ... (其他字段)                                                │
│ status                                                       │
│ reviewer_openid (FK → users.openid)                          │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. 接口设计

### 6.1 接口规范

#### 6.1.1 基础 URL

```
生产环境: https://warblood.online/api
测试环境: http://111.229.107.123:3000/api
```

#### 6.1.2 请求格式

```
Content-Type: application/json
Authorization: Bearer <token>
```

#### 6.1.3 响应格式

```json
// 成功响应
{
  "code": 0,
  "message": "success",
  "data": { ... }
}

// 错误响应
{
  "code": 1001,
  "message": "参数错误",
  "data": null
}
```

#### 6.1.4 错误码定义

| 错误码 | 说明 |
|-------|------|
| 0 | 成功 |
| 401 | 未登录 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |
| 1001 | 参数错误 |
| 1002 | 数据已存在 |
| 1003 | 操作失败 |

### 6.2 核心 API 列表

#### 6.2.1 认证模块

| 接口 | 方法 | 路径 | 说明 |
|-----|------|------|------|
| 微信登录 | POST | /api/auth/login | 通过 code 换取 openid |
| 刷新 Token | POST | /api/auth/refresh | 刷新访问令牌 |
| 获取用户信息 | GET | /api/auth/userinfo | 获取当前登录用户信息 |

#### 6.2.2 用户模块

| 接口 | 方法 | 路径 | 权限 | 说明 |
|-----|------|------|------|------|
| 获取用户列表 | GET | /api/users | user:read | 分页获取用户列表 |
| 获取用户详情 | GET | /api/users/:openid | user:read | 获取用户详细信息 |
| 更新用户信息 | PUT | /api/users/:openid | user:update | 更新用户信息 |
| 分配角色 | POST | /api/users/:openid/roles | user:assign_role | 为用户分配角色 |
| 移除角色 | DELETE | /api/users/:openid/roles/:roleId | user:assign_role | 移除用户角色 |

#### 6.2.3 角色模块

| 接口 | 方法 | 路径 | 权限 | 说明 |
|-----|------|------|------|------|
| 获取角色列表 | GET | /api/roles | role:manage | 获取所有角色 |
| 创建角色 | POST | /api/roles | role:manage | 创建新角色 |
| 更新角色 | PUT | /api/roles/:id | role:manage | 更新角色信息 |
| 删除角色 | DELETE | /api/roles/:id | role:manage | 删除角色 |
| 获取角色权限 | GET | /api/roles/:id/permissions | permission:manage | 获取角色权限列表 |
| 设置角色权限 | PUT | /api/roles/:id/permissions | permission:manage | 设置角色权限 |

#### 6.2.4 日报模块

| 接口 | 方法 | 路径 | 权限 | 说明 |
|-----|------|------|------|------|
| 提交日报 | POST | /api/reports | report:create | 提交新日报 |
| 获取日报列表 | GET | /api/reports | report:read | 获取日报列表 |
| 获取日报详情 | GET | /api/reports/:id | report:read | 获取日报详情 |
| 更新日报 | PUT | /api/reports/:id | report:update | 更新日报 |
| 删除日报 | DELETE | /api/reports/:id | report:delete | 删除日报 |
| 审核日报 | POST | /api/reports/:id/review | report:review | 审核日报 |
| 导出日报 | GET | /api/reports/export | report:export | 导出日报数据 |
| 获取我的日报 | GET | /api/reports/my | report:read | 获取当前用户的日报 |

### 6.3 接口详细设计

#### 6.3.1 微信登录

**请求**

```http
POST /api/auth/login
Content-Type: application/json

{
  "code": "wx.login返回的code"
}
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "userInfo": {
      "openid": "oXXXXX",
      "userName": "张三",
      "department": "技术部",
      "roles": ["employee"],
      "permissions": ["report:create", "report:read", "report:update"]
    }
  }
}
```

#### 6.3.2 提交日报

**请求**

```http
POST /api/reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "dailyTime": "2026-05-24",
  "projectName": "XX项目",
  "projectArea": "北京",
  "workContent": "完成需求分析",
  "currentProgress": 50,
  ...
}
```

**响应**

```json
{
  "code": 0,
  "message": "提交成功",
  "data": {
    "id": 123,
    "status": "pending"
  }
}
```

#### 6.3.3 审核日报

**请求**

```http
POST /api/reports/123/review
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "approve",  // approve | reject
  "reviewNote": "审核通过"  // 驳回时必填驳回原因
}
```

**响应**

```json
{
  "code": 0,
  "message": "审核成功",
  "data": {
    "id": 123,
    "status": "approved",
    "reviewTime": "2026-05-24T10:30:00Z"
  }
}
```

---

## 7. 权限架构设计

### 7.1 RBAC 权限模型

```
┌─────────────────────────────────────────────────────────────────┐
│                        RBAC 权限模型                             │
│                                                                 │
│   ┌─────────┐      ┌─────────┐      ┌─────────┐               │
│   │  用户   │      │  角色   │      │  权限   │               │
│   │ (User)  │─────▶│ (Role)  │─────▶│(Perm)   │               │
│   └─────────┘      └─────────┘      └─────────┘               │
│        │                │                │                     │
│        │                │                │                     │
│        ▼                ▼                ▼                     │
│   ┌─────────┐      ┌─────────┐      ┌─────────┐               │
│   │ openid  │      │role_code│      │perm_code│               │
│   │userName │      │role_name│      │perm_name│               │
│   │  ...    │      │  ...    │      │module_id│               │
│   └─────────┘      └─────────┘      └─────────┘               │
│                                                                 │
│   特点:                                                         │
│   • 用户可拥有多个角色，权限取并集                               │
│   • 角色可包含多个权限                                           │
│   • 支持权限继承（未来扩展）                                     │
│   • 超级管理员拥有所有权限                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 权限校验流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        权限校验流程                              │
│                                                                 │
│   ┌─────────────┐                                              │
│   │  用户请求   │                                              │
│   └──────┬──────┘                                              │
│          │                                                      │
│          ▼                                                      │
│   ┌─────────────┐     否      ┌─────────────┐                  │
│   │ 是否登录？  │────────────▶│ 返回 401    │                  │
│   └──────┬──────┘             └─────────────┘                  │
│          │ 是                                                   │
│          ▼                                                      │
│   ┌─────────────┐     是      ┌─────────────┐                  │
│   │ 超级管理员？│────────────▶│ 允许访问    │                  │
│   └──────┬──────┘             └─────────────┘                  │
│          │ 否                                                   │
│          ▼                                                      │
│   ┌─────────────┐                                              │
│   │ 获取用户权限│                                              │
│   │ (从缓存/DB) │                                              │
│   └──────┬──────┘                                              │
│          │                                                      │
│          ▼                                                      │
│   ┌─────────────┐     否      ┌─────────────┐                  │
│   │ 有所需权限？│────────────▶│ 返回 403    │                  │
│   └──────┬──────┘             └─────────────┘                  │
│          │ 是                                                   │
│          ▼                                                      │
│   ┌─────────────┐                                              │
│   │ 执行业务逻辑│                                              │
│   └─────────────┘                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 权限缓存策略

```javascript
// 权限缓存策略
const PermissionCacheStrategy = {
  // 缓存键格式
  keyFormat: 'perm:user:{openid}',
  
  // 缓存时间（秒）
  ttl: 3600, // 1小时
  
  // 缓存更新时机
  updateTriggers: [
    'user.role.assigned',    // 用户被分配角色
    'user.role.removed',     // 用户角色被移除
    'role.permission.changed' // 角色权限变更
  ]
};

// 缓存更新示例
async function onRolePermissionChanged(roleId) {
  // 获取拥有该角色的所有用户
  const users = await userRepository.findUsersByRoleId(roleId);
  
  // 清除这些用户的权限缓存
  for (const user of users) {
    await redis.del(`perm:user:${user.openid}`);
  }
}
```

---

## 8. 技术选型说明

### 8.1 前端技术选型

| 技术 | 选型理由 |
|-----|---------|
| **微信小程序原生框架** | 无需跨端框架，性能最优，生态完善 |
| **TypeScript** | 类型安全，提升代码质量和可维护性 |
| **Vant Weapp** | 成熟的 UI 组件库，减少开发成本 |
| **自定义 TabBar** | 支持动态菜单，根据权限显示不同入口 |

### 8.2 后端技术选型

| 技术 | 选型理由 |
|-----|---------|
| **Node.js** | 与前端技术栈统一，开发效率高 |
| **Express/Koa** | 轻量级框架，中间件生态丰富 |
| **MySQL 8.0** | 成熟的关系型数据库，支持事务和复杂查询 |
| **Redis** | 高性能缓存，支持会话管理和权限缓存 |
| **JWT** | 无状态认证，适合小程序场景 |

### 8.3 技术选型对比

#### 8.3.1 后端框架对比

| 框架 | 优点 | 缺点 | 推荐度 |
|-----|------|------|-------|
| Express | 生态丰富，文档完善，社区活跃 | 回调嵌套，需要手动处理异步 | ★★★★☆ |
| Koa | async/await 支持，中间件优雅 | 生态相对较小，需要更多配置 | ★★★★☆ |
| NestJS | 企业级架构，TypeScript 原生支持 | 学习曲线陡峭，适合大型项目 | ★★★☆☆ |

**推荐方案**: 使用 **Express** 或 **Koa**，本项目规模适中，Express 更为合适。

#### 8.3.2 数据库对比

| 数据库 | 优点 | 缺点 | 推荐度 |
|-------|------|------|-------|
| MySQL | 成熟稳定，事务支持，生态完善 | 水平扩展复杂 | ★★★★★ |
| PostgreSQL | 功能强大，JSON 支持好 | 运维成本较高 | ★★★★☆ |
| MongoDB | 灵活，适合快速迭代 | 无事务，数据一致性弱 | ★★★☆☆ |

**推荐方案**: 使用 **MySQL 8.0**，满足业务需求，运维成本低。

---

## 9. 开发规范

### 9.1 代码规范

#### 9.1.1 命名规范

| 类型 | 规范 | 示例 |
|-----|------|------|
| 文件名 | 小写 + 连字符 | `user-service.js` |
| 变量名 | 小驼峰 | `userName` |
| 常量名 | 大写 + 下划线 | `MAX_RETRY_COUNT` |
| 函数名 | 小驼峰 + 动词开头 | `getUserInfo` |
| 类名 | 大驼峰 | `UserService` |
| 数据库表名 | 小写 + 下划线 | `user_roles` |
| 数据库字段名 | 小写 + 下划线 | `created_at` |

#### 9.1.2 注释规范

```javascript
/**
 * 获取用户权限列表
 * @param {string} openid - 用户唯一标识
 * @returns {Promise<string[]>} 权限编码列表
 * @throws {Error} 当用户不存在时抛出异常
 */
async function getUserPermissions(openid) {
  // 实现...
}
```

#### 9.1.3 Git 提交规范

```
<type>(<scope>): <subject>

type:
- feat: 新功能
- fix: 修复 bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 重构
- test: 测试相关
- chore: 构建/工具相关

示例:
feat(report): 添加日报导出功能
fix(auth): 修复 token 过期判断逻辑
docs(api): 更新用户接口文档
```

### 9.2 目录规范

```
项目根目录/
├── docs/           # 文档
├── scripts/        # 脚本
├── src/            # 源代码
│   ├── modules/    # 模块
│   ├── components/ # 组件
│   ├── services/   # 服务
│   └── utils/      # 工具
├── tests/          # 测试
└── config/         # 配置
```

### 9.3 API 设计规范

#### 9.3.1 RESTful 规范

| 操作 | 方法 | 路径 | 说明 |
|-----|------|------|------|
| 列表 | GET | /api/users | 获取用户列表 |
| 详情 | GET | /api/users/:id | 获取用户详情 |
| 创建 | POST | /api/users | 创建用户 |
| 更新 | PUT | /api/users/:id | 更新用户 |
| 删除 | DELETE | /api/users/:id | 删除用户 |

#### 9.3.2 分页规范

```
GET /api/users?page=1&pageSize=20

Response:
{
  "code": 0,
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### 9.4 安全规范

| 规范项 | 要求 |
|-------|------|
| 密码存储 | bcrypt 加密，salt rounds >= 10 |
| 敏感数据 | 传输使用 HTTPS，存储加密 |
| SQL 注入 | 使用参数化查询 |
| XSS 攻击 | 输入输出转义 |
| CSRF | 使用 Token 验证 |
| 接口限流 | 同一 IP 每分钟最多 100 次请求 |

---

## 10. 开发路线图

### 10.1 整体规划

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           开发路线图 (2026)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Q1 (1-3月)           Q2 (4-6月)           Q3 (7-9月)           Q4 (10-12月)│
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐│
│  │   Phase 1   │     │   Phase 2   │     │   Phase 3   │     │   Phase 4   ││
│  │   基础架构   │     │   核心功能   │     │   功能扩展   │     │   优化迭代   ││
│  │             │     │             │     │             │     │             ││
│  │ • 项目初始化 │     │ • 日报模块   │     │ • 请假管理   │     │ • 性能优化   ││
│  │ • 数据库设计 │     │ • 审核流程   │     │ • 公告通知   │     │ • 数据报表   ││
│  │ • 权限系统   │     │ • 用户管理   │     │ • 考勤打卡   │     │ • BI分析    ││
│  │ • 基础组件   │     │ • WPS集成    │     │ • 消息中心   │     │ • 运维工具   ││
│  └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Phase 1: 基础架构 (Week 1-4)

#### 10.2.1 任务分解

| 任务 | 优先级 | 预估工时 | 负责人 | 里程碑 |
|-----|-------|---------|-------|-------|
| **P1-1 项目初始化** | P0 | 2d | 前端 | M1 |
| 创建小程序项目 | P0 | 0.5d | 前端 | |
| 配置 TypeScript | P0 | 0.5d | 前端 | |
| 引入 Vant Weapp | P0 | 0.5d | 前端 | |
| 配置 ESLint/Prettier | P0 | 0.5d | 前端 | |
| **P1-2 数据库设计与初始化** | P0 | 3d | 后端 | M1 |
| 设计 ER 模型 | P0 | 1d | 后端 | |
| 编写建表 SQL | P0 | 1d | 后端 | |
| 初始化种子数据 | P0 | 0.5d | 后端 | |
| 数据库连接测试 | P0 | 0.5d | 后端 | |
| **P1-3 权限系统开发** | P0 | 5d | 后端 | M2 |
| 用户表/角色表/权限表 | P0 | 1d | 后端 | |
| 权限服务开发 | P0 | 2d | 后端 | |
| 权限中间件开发 | P0 | 1d | 后端 | |
| 权限缓存实现 | P0 | 1d | 后端 | |
| **P1-4 基础组件开发** | P0 | 4d | 前端 | M2 |
| 权限守卫组件 | P0 | 1d | 前端 | |
| 状态标签组件 | P0 | 0.5d | 前端 | |
| 空状态组件 | P0 | 0.5d | 前端 | |
| 加载组件 | P0 | 0.5d | 前端 | |
| 自定义 TabBar | P0 | 1.5d | 前端 | |

#### 10.2.2 里程碑

| 里程碑 | 时间 | 交付物 |
|-------|------|-------|
| M1: 项目初始化完成 | Week 2 | 项目骨架、数据库表结构 |
| M2: 权限系统完成 | Week 4 | RBAC 权限系统、基础组件库 |

### 10.3 Phase 2: 核心功能 (Week 5-10)

#### 10.3.1 任务分解

| 任务 | 优先级 | 预估工时 | 负责人 | 里程碑 |
|-----|-------|---------|-------|-------|
| **P2-1 登录模块** | P0 | 3d | 全栈 | M3 |
| 微信登录接口 | P0 | 1d | 后端 | |
| 登录页面开发 | P0 | 1d | 前端 | |
| Token 管理 | P0 | 0.5d | 前端 | |
| 用户信息完善 | P0 | 0.5d | 前端 | |
| **P2-2 日报模块** | P0 | 8d | 全栈 | M3 |
| 日报数据模型 | P0 | 1d | 后端 | |
| 日报 CRUD 接口 | P0 | 2d | 后端 | |
| 日报编辑页面 | P0 | 2d | 前端 | |
| 历史记录页面 | P0 | 1d | 前端 | |
| 草稿自动保存 | P0 | 1d | 前端 | |
| 表单校验 | P0 | 1d | 前端 | |
| **P2-3 审核模块** | P0 | 5d | 全栈 | M4 |
| 审核接口开发 | P0 | 1d | 后端 | |
| 审核列表页面 | P0 | 1.5d | 前端 | |
| 审核详情页面 | P0 | 1d | 前端 | |
| 审核操作（通过/驳回） | P0 | 1d | 前端 | |
| 驳回修改重提 | P0 | 0.5d | 前端 | |
| **P2-4 用户管理模块** | P0 | 4d | 全栈 | M4 |
| 用户列表接口 | P0 | 1d | 后端 | |
| 用户列表页面 | P0 | 1d | 前端 | |
| 角色分配功能 | P0 | 1d | 前端 | |
| 管理员设置 | P0 | 1d | 前端 | |
| **P2-5 WPS 集成** | P1 | 3d | 后端 | M4 |
| WPS API 对接 | P1 | 1.5d | 后端 | |
| 数据同步逻辑 | P1 | 1d | 后端 | |
| 错误处理 | P1 | 0.5d | 后端 | |

#### 10.3.2 里程碑

| 里程碑 | 时间 | 交付物 |
|-------|------|-------|
| M3: 登录+日报完成 | Week 7 | 登录功能、日报提交功能 |
| M4: 核心功能完成 | Week 10 | 审核功能、用户管理、WPS集成 |

### 10.4 Phase 3: 功能扩展 (Week 11-16)

#### 10.4.1 任务分解

| 任务 | 优先级 | 预估工时 | 负责人 | 里程碑 |
|-----|-------|---------|-------|-------|
| **P3-1 请假管理模块** | P1 | 6d | 全栈 | M5 |
| 请假数据模型 | P1 | 1d | 后端 | |
| 请假申请接口 | P1 | 1d | 后端 | |
| 请假申请页面 | P1 | 1.5d | 前端 | |
| 请假审批流程 | P1 | 1.5d | 后端 | |
| 请假记录页面 | P1 | 1d | 前端 | |
| **P3-2 公告通知模块** | P1 | 4d | 全栈 | M5 |
| 公告数据模型 | P1 | 0.5d | 后端 | |
| 公告 CRUD 接口 | P1 | 1d | 后端 | |
| 公告列表页面 | P1 | 1d | 前端 | |
| 公告详情页面 | P1 | 0.5d | 前端 | |
| 消息推送 | P1 | 1d | 后端 | |
| **P3-3 考勤打卡模块** | P2 | 5d | 全栈 | M6 |
| 考勤数据模型 | P2 | 0.5d | 后端 | |
| 打卡接口（定位） | P2 | 1.5d | 后端 | |
| 打卡页面 | P2 | 1.5d | 前端 | |
| 考勤记录页面 | P2 | 1d | 前端 | |
| 考勤统计 | P2 | 0.5d | 后端 | |
| **P3-4 消息中心** | P2 | 4d | 全栈 | M6 |
| 消息数据模型 | P2 | 0.5d | 后端 | |
| 消息列表接口 | P2 | 1d | 后端 | |
| 消息中心页面 | P2 | 1.5d | 前端 | |
| 消息已读/删除 | P2 | 1d | 前端 | |

#### 10.4.2 里程碑

| 里程碑 | 时间 | 交付物 |
|-------|------|-------|
| M5: 请假+公告完成 | Week 13 | 请假管理、公告通知功能 |
| M6: 考勤+消息完成 | Week 16 | 考勤打卡、消息中心功能 |

### 10.5 Phase 4: 优化迭代 (Week 17-20)

#### 10.5.1 任务分解

| 任务 | 优先级 | 预估工时 | 负责人 | 里程碑 |
|-----|-------|---------|-------|-------|
| **P4-1 性能优化** | P1 | 4d | 全栈 | M7 |
| 接口响应优化 | P1 | 1d | 后端 | |
| 数据库查询优化 | P1 | 1d | 后端 | |
| 前端加载优化 | P1 | 1d | 前端 | |
| 缓存策略优化 | P1 | 1d | 后端 | |
| **P4-2 数据报表** | P1 | 5d | 全栈 | M7 |
| 统计数据模型 | P1 | 1d | 后端 | |
| 统计接口开发 | P1 | 2d | 后端 | |
| 报表页面开发 | P1 | 2d | 前端 | |
| **P4-3 运维工具** | P2 | 3d | 后端 | M8 |
| 日志系统 | P2 | 1d | 后端 | |
| 监控告警 | P2 | 1d | 后端 | |
| 数据备份脚本 | P2 | 0.5d | 后端 | |
| 部署脚本优化 | P2 | 0.5d | 后端 | |
| **P4-4 测试与文档** | P1 | 4d | 全栈 | M8 |
| 单元测试 | P1 | 1.5d | 全栈 | |
| 集成测试 | P1 | 1d | 全栈 | |
| API 文档完善 | P1 | 1d | 后端 | |
| 用户手册 | P1 | 0.5d | 前端 | |

#### 10.5.2 里程碑

| 里程碑 | 时间 | 交付物 |
|-------|------|-------|
| M7: 性能+报表完成 | Week 18 | 性能优化、数据报表功能 |
| M8: 项目交付 | Week 20 | 测试完成、文档完善、正式上线 |

### 10.6 开发进度甘特图

```
Week:   1   2   3   4   5   6   7   8   9   10  11  12  13  14  15  16  17  18  19  20
        |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
Phase 1: 基础架构
P1-1 项目初始化      [==]
P1-2 数据库设计          [===]
P1-3 权限系统                [=====]
P1-4 基础组件                [====]

Phase 2: 核心功能
P2-1 登录模块                        [===]
P2-2 日报模块                        [========]
P2-3 审核模块                                [=====]
P2-4 用户管理                                    [====]
P2-5 WPS集成                                        [===]

Phase 3: 功能扩展
P3-1 请假管理                                            [======]
P3-2 公告通知                                            [====]
P3-3 考勤打卡                                                    [=====]
P3-4 消息中心                                                    [====]

Phase 4: 优化迭代
P4-1 性能优化                                                            [====]
P4-2 数据报表                                                            [=====]
P4-3 运维工具                                                                    [===]
P4-4 测试文档                                                                    [====]

里程碑:
M1: 项目初始化完成 ──────────────────────┘
M2: 权限系统完成 ──────────────────────────────┘
M3: 登录+日报完成 ──────────────────────────────────────┘
M4: 核心功能完成 ──────────────────────────────────────────────────┘
M5: 请假+公告完成 ──────────────────────────────────────────────────────────────┘
M6: 考勤+消息完成 ──────────────────────────────────────────────────────────────────────────┘
M7: 性能+报表完成 ──────────────────────────────────────────────────────────────────────────────────────┘
M8: 项目交付 ──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. 部署架构

### 11.1 生产环境部署

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           生产环境部署架构                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         负载均衡 (Nginx)                             │  │
│   │                    https://warblood.online                          │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                    ┌───────────────┼───────────────┐                       │
│                    │               │               │                       │
│                    ▼               ▼               ▼                       │
│   ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ │
│   │   Node.js Server    │ │   Node.js Server    │ │   Node.js Server    │ │
│   │   (PM2 Cluster)     │ │   (PM2 Cluster)     │ │   (PM2 Cluster)     │ │
│   │   Port: 3000        │ │   Port: 3001        │ │   Port: 3002        │ │
│   └─────────────────────┘ └─────────────────────┘ └─────────────────────┘ │
│                    │               │               │                       │
│                    └───────────────┼───────────────┘                       │
│                                    │                                        │
│                    ┌───────────────┴───────────────┐                       │
│                    │                               │                       │
│                    ▼                               ▼                       │
│   ┌─────────────────────────────┐   ┌─────────────────────────────┐       │
│   │        MySQL 8.0            │   │        Redis 6.x            │       │
│   │   ┌─────────┐ ┌─────────┐   │   │   ┌─────────────────────┐   │       │
│   │   │ Master  │ │  Slave  │   │   │   │  Cache / Session    │   │       │
│   │   └─────────┘ └─────────┘   │   │   └─────────────────────┘   │       │
│   └─────────────────────────────┘   └─────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 服务器配置建议

| 组件 | 配置 | 数量 | 说明 |
|-----|------|------|------|
| 应用服务器 | 2核4G | 2+ | Node.js 应用 |
| MySQL 主库 | 4核8G | 1 | 数据写入 |
| MySQL 从库 | 2核4G | 1 | 数据读取 |
| Redis | 2核4G | 1 | 缓存服务 |
| Nginx | 1核2G | 1 | 负载均衡 |

### 11.3 CI/CD 流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  代码提交   │────▶│  自动构建   │────▶│  自动测试   │────▶│  自动部署   │
│  (Git Push) │     │  (CI)       │     │  (Test)     │     │  (CD)       │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
   GitHub/GitLab       Jenkins/           Unit Test          Staging/
                       GitHub Actions     Integration        Production
                                          Test
```

---

## 12. 风险与应对

### 12.1 技术风险

| 风险 | 影响 | 概率 | 应对措施 |
|-----|------|------|---------|
| 微信 API 变更 | 高 | 中 | 封装微信 API 调用层，便于适配 |
| 数据库性能瓶颈 | 高 | 中 | 读写分离、索引优化、缓存策略 |
| 并发压力 | 中 | 中 | 负载均衡、限流熔断、队列削峰 |
| 第三方服务不可用 | 中 | 低 | 降级策略、重试机制、备用方案 |

### 12.2 业务风险

| 风险 | 影响 | 概率 | 应对措施 |
|-----|------|------|---------|
| 需求变更频繁 | 高 | 高 | 敏捷开发、模块化设计、快速迭代 |
| 用户接受度低 | 高 | 中 | 用户调研、灰度发布、快速反馈 |
| 数据安全问题 | 高 | 低 | 权限校验、数据加密、审计日志 |

### 12.3 项目风险

| 风险 | 影响 | 概率 | 应对措施 |
|-----|------|------|---------|
| 人员变动 | 高 | 中 | 文档完善、代码规范、知识共享 |
| 进度延期 | 中 | 中 | 合理排期、风险预留、及时调整 |
| 技术债务 | 中 | 高 | 代码审查、重构计划、技术分享 |

---

## 附录

### A. 参考文档

1. 微信小程序开发文档: https://developers.weixin.qq.com/miniprogram/dev/framework/
2. MySQL 8.0 参考手册: https://dev.mysql.com/doc/refman/8.0/en/
3. Node.js 最佳实践: https://github.com/goldbergyoni/nodebestpractices
4. RESTful API 设计指南: https://restfulapi.net/

### B. 变更记录

| 版本 | 日期 | 修改人 | 修改内容 |
|-----|------|-------|---------|
| v1.0 | 2026-05-24 | 技术团队 | 初稿创建 |
| v1.1 | 2026-05-24 | 技术团队 | 根据实际实现更新：技术栈调整为微信云函数架构；数据库表结构更新；接口设计更新为云函数调用方式 |

---

**文档结束**
