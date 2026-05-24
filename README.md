# 员工日报微信小程序

基于微信云开发构建的员工日报管理小程序，支持员工提交日报、管理员审核、审核通过后自动写入 WPS 文档。

## 功能模块

### 员工端
- 微信一键登录（openid 绑定）
- 日报填写（每日首次打开自动预填上次内容）
- 草稿自动保存（防抖 3 秒，存本地 Storage）
- 提交日报 / 修改重提（被驳回后）
- 查看历史日报及审核状态
- 订阅消息：审核结果实时通知

### 管理员端
- 待审核列表（带未读数统计）
- 日报详情查看
- 一键通过 / 填写原因驳回
- 审核通过后自动触发 WPS 写入
- 今日审核统计（待审/通过/驳回数量）

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | 微信小程序原生（WXML/WXSS/JS） |
| 后端 | 微信云函数 + 自建 MySQL 数据库 |
| 数据库 | MySQL 8.0（自建云服务器） |
| 文档集成 | WPS 开放平台 Open API |
| 消息通知 | 微信订阅消息 |

## 目录结构

```
daily-report-miniapp/
├── app.js / app.json / app.wxss     # 全局配置
├── pages/
│   ├── employee/
│   │   ├── report-edit/             # ★ 日报填写页（核心）
│   │   ├── report-history/          # 历史记录
│   │   └── report-detail/           # 详情查看
│   └── admin/
│       ├── review-list/             # 审核列表
│       └── review-detail/           # 审核操作
├── components/
│   └── status-tag/                  # 状态标签组件
├── services/
│   ├── report.js                    # 日报 API
│   └── review.js                    # 审核 API
├── utils/
│   ├── auth.js                      # 登录认证
│   ├── request.js                   # 统一请求
│   ├── debounce.js                  # 防抖 + 日期工具
│   └── mysql.js                     # MySQL 连接池工具（供云函数复用）
├── sql/
│   └── init.sql                     # MySQL 数据库初始化脚本
└── cloudfunctions/
    ├── login/                       # 登录云函数（MySQL版）
    ├── submitReport/                # 提交日报云函数（MySQL版）
    ├── reviewReport/                # 审核 + WPS写入云函数（MySQL版）
    ├── manageAdmin/                 # 管理员管理云函数（MySQL版）
    └── initAdmin/                   # 首个管理员初始化云函数（MySQL版）
```

## 数据库说明

> 数据存储在自建 MySQL 数据库（云服务器），云函数通过环境变量连接。

### 初始化

```bash
mysql -h <服务器IP> -u root -p < sql/init.sql
```

### users（用户表）

| MySQL 字段 | 类型 | 说明 |
|---|---|---|
| openid | VARCHAR(64) PK | 微信用户唯一标识 |
| user_name | VARCHAR(64) | 用户姓名 |
| department | VARCHAR(128) | 部门 |
| is_admin | TINYINT(1) | 是否管理员（0/1） |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### daily_reports（日报表）

| MySQL 字段 | 类型 | 说明 |
|---|---|---|
| report_id | BIGINT PK AUTO | 日报ID |
| user_id | VARCHAR(64) | 员工 openid |
| user_name | VARCHAR(64) | 员工姓名（冗余） |
| department | VARCHAR(128) | 部门（冗余） |
| report_date | DATE | 日报日期 |
| content | JSON | 日报内容（todayDone/tomorrowPlan/blockers/remarks） |
| status | ENUM | pending / approved / rejected |
| version | INT | 提交版本号 |
| submit_time | DATETIME | 提交时间 |
| reviewer_id | VARCHAR(64) | 审核员 openid |
| review_time | DATETIME | 审核时间 |
| review_note | VARCHAR(512) | 审核备注/驳回原因 |

### 3. MySQL 数据库连接配置

在**每个云函数**的环境变量中配置（右键云函数目录 → 设置 → 添加环境变量）：

| 变量名 | 说明 | 示例 |
|---|---|---|
| MYSQL_HOST | MySQL 服务器地址 | 123.456.789.10 |
| MYSQL_PORT | 端口，默认 3306 | 3306 |
| MYSQL_USER | 数据库用户名 | root |
| MYSQL_PASSWORD | 数据库密码 | your_password |
| MYSQL_DATABASE | 数据库名 | daily_report |

> MySQL 服务器需开启外网访问（绑定云服务器公网IP），并创建对应用户授权。

### 4. 订阅消息配置
- 在微信公众平台申请订阅消息模板
- 在 `report-edit/index.js` 中替换 `your_subscribe_template_id`
- 在 `reviewReport` 云函数环境变量中设置 `SUBSCRIBE_TEMPLATE_ID`

### 5. WPS 开放平台配置
在 `reviewReport` 云函数的**环境变量**中配置：

| 变量名 | 说明 |
|---|---|
| WPS_API_TOKEN | WPS 开放平台 Access Token |
| WPS_FILE_ID | 目标 WPS 文件 ID |
| WPS_SHEET_INDEX | 目标 Sheet 下标（默认 0） |

### 6. 部署云函数
> 所有云函数部署时需**勾选「上传到云端安装依赖」**，确保 mysql2 包安装成功。
```bash
# 在微信开发者工具中右键每个云函数目录 → 上传并部署
# 或使用 CLI:
wx-cloud deploy cloudfunctions/submitReport
wx-cloud deploy cloudfunctions/reviewReport
```

## WPS 写入列格式

审核通过时，自动向 WPS Sheet 追加一行，列顺序为：

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| 日期 | 姓名 | 部门 | 今日完成 | 明日计划 | 问题阻碍 | 其他备注 | 审核时间 |

## 管理后台（网页版）

路径：`admin-panel/index.html`

功能：网页端管理员管理界面，支持查看用户列表、搜索用户、设置/取消管理员身份。

### 部署方式

1. 微信开发者工具 → 云开发控制台 → 「静态网站」→ 开启服务
2. 上传 `admin-panel/` 整个目录到静态托管
3. 访问分配的 HTTPS 域名即可

### 登录方式

首次使用需要在「日报」小程序中通过 `initAdmin` 云函数初始化第一个管理员，或联系已有管理员将自己设为管理员。

### 功能说明

- **用户列表**：分页展示所有已登录用户，显示 openid、姓名、部门、注册时间
- **管理员列表**：仅展示所有管理员
- **搜索用户**：按 openid / 姓名 / 部门关键词搜索
- **设为管理员**：将普通员工提升为管理员
- **移除管理员**：取消管理员身份（不可移除自己）

## 后续扩展建议

- [ ] 日报模板字段动态配置（后台管理配置字段）
- [ ] 部门维度统计和日报汇总
- [ ] 员工漏交提醒（定时云函数每日下班前推送）
- [ ] 管理员批量审核
- [ ] 历史日报导出 Excel
