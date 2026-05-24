# API 接口文档

**文档版本**: v1.1  
**创建日期**: 2026-05-24  
**更新日期**: 2026-05-24  
**基础 URL**: `https://warblood.online/api` (生产环境)

---

## 目录

1. [接口规范](#1-接口规范)
2. [认证说明](#2-认证说明)
3. [错误码定义](#3-错误码定义)
4. [登录模块](#4-登录模块)
5. [日报模块](#5-日报模块)
6. [项目进度日报模块](#6-项目进度日报模块)
7. [审核模块](#7-审核模块)
8. [用户管理模块](#8-用户管理模块)
9. [初始化模块](#9-初始化模块)

---

## 1. 接口规范

### 1.1 请求格式

| 项目 | 说明 |
|-----|------|
| 协议 | HTTPS |
| 数据格式 | JSON |
| 字符编码 | UTF-8 |
| Content-Type | application/json |

### 1.2 响应格式

所有接口统一返回以下格式：

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

| 字段 | 类型 | 说明 |
|-----|------|------|
| code | number | 状态码，0 表示成功 |
| message | string | 状态描述 |
| data | object | 返回数据，失败时可能为 null |

### 1.3 分页参数

| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| page | number | 1 | 当前页码 |
| pageSize | number | 10/20 | 每页数量 |

### 1.4 分页响应

```json
{
  "code": 0,
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "pageSize": 10
  }
}
```

---

## 2. 认证说明

### 2.1 微信登录认证

本系统基于微信小程序 openid 进行用户认证。用户通过 `wx.login()` 获取 code，后端通过 code 换取 openid。

### 2.2 云函数调用

云函数自动获取用户 openid，无需手动传递认证信息：

```javascript
const { OPENID } = cloud.getWXContext();
```

### 2.3 权限级别

| 权限级别 | 说明 | 可访问接口 |
|---------|------|-----------|
| 游客 | 未登录用户 | login |
| 普通用户 | 已登录用户 | 日报提交、查看自己的日报 |
| 管理员 | is_admin = 1 | 审核日报、用户管理 |

---

## 3. 错误码定义

### 3.1 通用错误码

| 错误码 | 说明 |
|-------|------|
| 0 | 成功 |
| -1 | 通用错误/服务器错误 |
| 400 | 参数错误 |
| 403 | 无权限 |
| 404 | 资源不存在 |

### 3.2 业务错误码

| 错误码 | 说明 |
|-------|------|
| 1001 | 参数校验失败 |
| 1002 | 数据已存在 |
| 1003 | 操作失败 |
| 1004 | 状态不允许此操作 |

### 3.3 错误响应示例

```json
{
  "code": 403,
  "message": "无管理员权限",
  "data": null
}
```

---

## 4. 登录模块

### 4.1 微信登录

**云函数**: `login`  
**说明**: 获取用户 openid 和基本信息，不存在则自动注册

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| - | - | - | 云函数自动获取 openid |

**响应示例**:

```json
{
  "code": 0,
  "data": {
    "openid": "oXXXXX",
    "isAdmin": false,
    "userName": "张三",
    "department": "技术部"
  }
}
```

**响应字段说明**:

| 字段 | 类型 | 说明 |
|-----|------|------|
| openid | string | 微信用户唯一标识 |
| isAdmin | boolean | 是否为管理员 |
| userName | string | 用户姓名（首次登录为空） |
| department | string | 用户部门 |

---

## 5. 日报模块

### 5.1 提交日报

**云函数**: `submitReport`  
**Action**: `submit`  
**权限**: 普通用户

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| action | string | 是 | 固定值 "submit" |
| content | object | 是 | 日报内容 |
| userName | string | 否 | 用户姓名 |
| department | string | 否 | 部门 |

**content 字段结构**:

```json
{
  "todayDone": "完成了需求评审",
  "tomorrowPlan": "开始开发登录模块",
  "blockers": "服务器尚未到位",
  "remarks": ""
}
```

**响应示例**:

```json
{
  "code": 0,
  "data": {
    "reportId": 123,
    "action": "created"
  }
}
```

**业务规则**:
- 每人每天只能提交一条日报
- 已审核通过的日报不能修改
- 已提交的日报可以重新提交（状态变为 pending）

### 5.2 获取指定日期日报

**云函数**: `submitReport`  
**Action**: `getByDate`

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| action | string | 是 | 固定值 "getByDate" |
| date | string | 是 | 日期，格式 YYYY-MM-DD |

**响应示例**:

```json
{
  "code": 0,
  "data": {
    "report_id": 123,
    "user_id": "oXXXXX",
    "user_name": "张三",
    "report_date": "2026-05-24",
    "content": {
      "todayDone": "...",
      "tomorrowPlan": "...",
      "blockers": "",
      "remarks": ""
    },
    "status": "pending",
    "version": 1,
    "submit_time": "2026-05-24T10:30:00.000Z"
  }
}
```

### 5.3 获取最新日报

**云函数**: `submitReport`  
**Action**: `getLatest`  
**说明**: 用于新建日报时预填充

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| action | string | 是 | 固定值 "getLatest" |

**响应示例**: 同 5.2

### 5.4 获取历史列表

**云函数**: `submitReport`  
**Action**: `getList`

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| action | string | 是 | 固定值 "getList" |
| status | string | 否 | 筛选状态: pending/approved/rejected |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 10 |

**响应示例**:

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "report_id": 123,
        "report_date": "2026-05-24",
        "status": "pending",
        "submit_time": "2026-05-24T10:30:00.000Z"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 10
  }
}
```

### 5.5 获取日报详情

**云函数**: `submitReport`  
**Action**: `getDetail`

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| action | string | 是 | 固定值 "getDetail" |
| reportId | number | 是 | 日报 ID |

**响应示例**: 同 5.2

---

## 6. 项目进度日报模块

> **注意**: 本节描述的接口为规划功能，当前版本尚未实现。实际日报功能请参考第5节"日报模块"。

### 6.1 提交项目日报（规划中）

**云函数**: `submitReport` (项目进度版)  
**Action**: `submit`  
**权限**: 普通用户

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| action | string | 是 | "create" / "update" / "delete" |
| openid | string | 是 | 用户 openid |
| userName | string | 是 | 用户姓名 |
| data | object | 是 | 项目日报数据 |

**data 字段结构**:

```json
{
  "id": 0,
  "daily_time": "2026-05-24",
  "project_name": "XX项目",
  "project_area": "北京",
  "related_unit": "XX公司",
  "worker1_name": "张三",
  "worker2_name": "李四",
  "machine_model": "挖掘机",
  "person_count": 5,
  "work_content": "今日工作内容",
  "need_complete_count": 1000,
  "total_complete_count": 500,
  "current_progress": 50,
  "today_work_summary": "今日小结",
  "tomorrow_work_content": "明日计划",
  "today_work_type": "施工",
  "tomorrow_work_type": "验收",
  "remark": "备注",
  "entry_time": "2026-05-01",
  "initial_business_trip_time": "2026-05-01",
  "project_business_trip_days": 10,
  "personal_total_business_trip": 20
}
```

**响应示例**:

```json
{
  "code": 0,
  "data": {
    "id": 123,
    "action": "created"
  }
}
```

### 6.2 获取项目日报列表

**云函数**: `submitReport`  
**Action**: `list`

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| fillerName | string | 否 | 填报人姓名 |
| dailyTimeStart | string | 否 | 开始日期 |
| dailyTimeEnd | string | 否 | 结束日期 |
| projectName | string | 否 | 项目名称 |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |

### 6.3 获取项目日报详情

**云函数**: `submitReport`  
**Action**: `detail`

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| id | number | 是 | 项目日报 ID |

### 6.4 获取最近一条记录

**云函数**: `submitReport`  
**Action**: `lastRecord`

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userName | string | 是 | 用户姓名 |

---

## 7. 审核模块

### 7.1 审核通过

**云函数**: `reviewReport`  
**Action**: `approve`  
**权限**: 管理员

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| action | string | 是 | 固定值 "approve" |
| reportId | number | 是 | 日报 ID |
| note | string | 否 | 审核备注 |

**响应示例**:

```json
{
  "code": 0,
  "data": {
    "status": "approved"
  }
}
```

**后置操作**:
- 写入 WPS 表格
- 发送订阅消息通知用户

### 7.2 审核驳回

**云函数**: `reviewReport`  
**Action**: `reject`  
**权限**: 管理员

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| action | string | 是 | 固定值 "reject" |
| reportId | number | 是 | 日报 ID |
| reason | string | 是 | 驳回原因 |

**响应示例**:

```json
{
  "code": 0,
  "data": {
    "status": "rejected"
  }
}
```

**后置操作**:
- 发送订阅消息通知用户

### 7.3 获取今日统计

**云函数**: `reviewReport`  
**Action**: `getStats`  
**权限**: 管理员

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| action | string | 是 | 固定值 "getStats" |

**响应示例**:

```json
{
  "code": 0,
  "data": {
    "pending": 5,
    "approved": 10,
    "rejected": 2
  }
}
```

### 7.4 获取审核列表

**云函数**: `reviewReport`  
**Action**: `getList`  
**权限**: 管理员

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| action | string | 是 | 固定值 "getList" |
| status | string | 否 | 筛选状态，默认 pending |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |

**响应示例**:

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "report_id": 123,
        "user_name": "张三",
        "department": "技术部",
        "report_date": "2026-05-24",
        "status": "pending",
        "submit_time": "2026-05-24T10:30:00.000Z"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 10
  }
}
```

### 7.5 获取日报详情（管理员）

**云函数**: `reviewReport`  
**Action**: `getDetail`  
**权限**: 管理员

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| action | string | 是 | 固定值 "getDetail" |
| reportId | number | 是 | 日报 ID |

---

## 8. 用户管理模块

### 8.1 获取用户列表

**云函数**: `manageAdmin`  
**Action**: `getUserList`  
**权限**: 管理员

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| action | string | 是 | 固定值 "getUserList" |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20 |

**响应示例**:

```json
{
  "code": 0,
  "data": [
    {
      "openid": "oXXXXX",
      "userName": "张三",
      "department": "技术部",
      "isAdmin": false,
      "createdAt": "2026-05-01T00:00:00.000Z"
    }
  ],
  "total": 100
}
```

### 8.2 获取管理员列表

**云函数**: `manageAdmin`  
**Action**: `getAdminList`  
**权限**: 管理员

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| action | string | 是 | 固定值 "getAdminList" |

### 8.3 设置管理员

**云函数**: `manageAdmin`  
**Action**: `addAdmin`  
**权限**: 管理员

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| action | string | 是 | 固定值 "addAdmin" |
| targetOpenid | string | 是 | 目标用户 openid |

**响应示例**:

```json
{
  "code": 0,
  "message": "已设为管理员"
}
```

### 8.4 取消管理员

**云函数**: `manageAdmin`  
**Action**: `removeAdmin`  
**权限**: 管理员

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| action | string | 是 | 固定值 "removeAdmin" |
| targetOpenid | string | 是 | 目标用户 openid |

**业务规则**:
- 不能取消自己的管理员身份

**响应示例**:

```json
{
  "code": 0,
  "message": "已取消管理员"
}
```

### 8.5 搜索用户

**云函数**: `manageAdmin`  
**Action**: `searchUser`  
**权限**: 管理员

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| action | string | 是 | 固定值 "searchUser" |
| keyword | string | 是 | 搜索关键词（至少2个字符） |

**响应示例**:

```json
{
  "code": 0,
  "data": [
    {
      "openid": "oXXXXX",
      "userName": "张三",
      "department": "技术部",
      "isAdmin": false
    }
  ]
}
```

---

## 9. 初始化模块

### 9.1 初始化管理员

**云函数**: `initAdmin`  
**说明**: 系统首次部署时，第一个登录的用户可将自己设为管理员

**请求参数**: 无（云函数自动获取 openid）

**前置条件**: 系统中无任何管理员

**响应示例**:

```json
{
  "code": 0,
  "message": "已设为你为管理员，请刷新管理后台",
  "data": {
    "openid": "oXXXXX"
  }
}
```

**错误响应**:

```json
{
  "code": 403,
  "message": "已有管理员，请联系现有管理员添加你"
}
```

---

## 附录

### A. 云函数列表

| 云函数 | 说明 | 主要 Action |
|-------|------|------------|
| login | 用户登录 | - |
| submitReport | 日报提交 | submit, getByDate, getLatest, getList, getDetail |
| reviewReport | 日报审核 | approve, reject, getStats, getList, getDetail |
| manageAdmin | 用户管理 | getUserList, getAdminList, addAdmin, removeAdmin, searchUser |
| initAdmin | 初始化管理员 | - |

### B. 状态流转图

```
┌─────────────┐
│   新建      │
│  (新建)     │
└──────┬──────┘
       │ submit
       ▼
┌─────────────┐     approve    ┌─────────────┐
│   待审核    │───────────────▶│   已通过    │
│  (pending)  │                │ (approved)  │
└──────┬──────┘                └─────────────┘
       │ reject
       ▼
┌─────────────┐     resubmit   ┌─────────────┐
│   已驳回    │───────────────▶│   待审核    │
│ (rejected)  │                │  (pending)  │
└─────────────┘                └─────────────┘
```

### C. 环境变量配置

云函数需要配置以下环境变量：

| 变量名 | 说明 | 示例 |
|-------|------|------|
| MYSQL_HOST | MySQL 服务器地址 | 111.229.107.123 |
| MYSQL_PORT | MySQL 端口 | 3306 |
| MYSQL_USER | MySQL 用户名 | daily_report_user |
| MYSQL_PASSWORD | MySQL 密码 | DailyReport@2024 |
| MYSQL_DATABASE | 数据库名 | daily_report |
| WPS_API_TOKEN | WPS API Token | (可选) |
| WPS_FILE_ID | WPS 文件 ID | (可选) |
| SUBSCRIBE_TEMPLATE_ID | 订阅消息模板 ID | (可选) |

### D. 变更记录

| 版本 | 日期 | 修改人 | 修改内容 |
|-----|------|-------|---------|
| v1.0 | 2026-05-24 | 技术团队 | 初稿创建 |
| v1.1 | 2026-05-24 | 后端架构师 | 审查并同步实际实现：标注项目进度日报模块为规划中 |

---

**文档结束**
