# 后端服务规范文档 (Backend Specification)

**文档版本**: v1.0  
**创建日期**: 2026-05-24  
**适用模式**: Solo Mode  
**文档类型**: 机器可读规范

---

## 1. 元数据 (Metadata)

```yaml
specVersion: "1.0"
documentType: "backend_specification"
generator: "solo_mode"
lastUpdated: "2026-05-24T10:00:00Z"
projectName: "daily-report-miniapp"
environment: "production"
```

---

## 2. 服务配置 (Service Configuration)

### 2.1 服务端点

```json
{
  "endpoints": {
    "production": {
      "baseUrl": "https://warblood.online",
      "apiPrefix": "/api",
      "timeout": 15000,
      "retryCount": 3
    },
    "development": {
      "baseUrl": "http://111.229.107.123:3000",
      "apiPrefix": "/api",
      "timeout": 30000,
      "retryCount": 3
    },
    "staging": {
      "baseUrl": "http://111.229.107.123:3000",
      "apiPrefix": "/api",
      "timeout": 20000,
      "retryCount": 2
    }
  }
}
```

### 2.2 服务依赖

```json
{
  "dependencies": {
    "mysql": {
      "host": "MYSQL_HOST",
      "port": 3306,
      "database": "daily_report",
      "required": true
    },
    "redis": {
      "host": "REDIS_HOST",
      "port": 6379,
      "required": false
    },
    "wps": {
      "apiUrl": "https://api.wps.cn",
      "required": false
    }
  }
}
```

---

## 3. API 接口定义 (API Definitions)

### 3.1 接口清单

| 模块 | 方法 | 路径 | 权限 | 说明 |
|-----|------|------|------|------|
| auth | POST | /api/login | public | 用户登录 |
| auth | PUT | /api/user/profile | user | 更新用户资料 |
| report | POST | /api/report/submit | user | 提交日报 |
| report | GET | /api/report/list | user | 日报列表 |
| report | GET | /api/review/detail | user | 日报详情 |
| project | POST | /api/project/submit | user | 提交项目日报 |
| project | GET | /api/project/list | user | 项目日报列表 |
| project | GET | /api/project/detail | user | 项目日报详情 |
| project | GET | /api/project/stats | user | 项目统计 |
| review | GET | /api/review/list | admin | 审核列表 |
| review | POST | /api/review/action | admin | 审核操作 |
| admin | GET | /api/admin/users | admin | 用户列表 |
| admin | POST | /api/admin/set-admin | admin | 设置管理员 |
| health | GET | /health | public | 健康检查 |

### 3.2 接口详细定义

```json
{
  "apis": {
    "login": {
      "method": "POST",
      "path": "/api/login",
      "auth": "public",
      "description": "用户登录，获取openid和用户信息",
      "request": {
        "contentType": "application/json",
        "body": {
          "openid": {
            "type": "string",
            "required": true,
            "description": "微信用户openid"
          }
        }
      },
      "response": {
        "success": {
          "code": 0,
          "data": {
            "openid": "string",
            "isAdmin": "boolean",
            "userName": "string",
            "department": "string"
          }
        },
        "error": {
          "code": 400,
          "message": "openid 不能为空"
        }
      }
    },
    "report_submit": {
      "method": "POST",
      "path": "/api/report/submit",
      "auth": "user",
      "description": "提交或修改日报",
      "request": {
        "contentType": "application/json",
        "body": {
          "action": {
            "type": "string",
            "enum": ["create", "update", "resubmit", "getLastReport"],
            "required": true
          },
          "openid": { "type": "string", "required": true },
          "userName": { "type": "string", "required": false },
          "department": { "type": "string", "required": false },
          "reportDate": { "type": "string", "format": "date", "required": true },
          "content": { "type": "object", "required": true },
          "reportId": { "type": "number", "required": false }
        }
      },
      "response": {
        "success": {
          "code": 0,
          "data": {
            "reportId": "number",
            "version": "number"
          }
        }
      }
    },
    "project_submit": {
      "method": "POST",
      "path": "/api/project/submit",
      "auth": "user",
      "description": "提交项目进度日报",
      "request": {
        "contentType": "application/json",
        "body": {
          "action": {
            "type": "string",
            "enum": ["create", "update", "delete", "getDraft"],
            "required": true
          },
          "openid": { "type": "string", "required": true },
          "userName": { "type": "string", "required": true },
          "data": {
            "type": "object",
            "properties": {
              "daily_time": { "type": "string", "format": "date" },
              "project_name": { "type": "string" },
              "project_area": { "type": "string" },
              "related_unit": { "type": "string" },
              "worker1_name": { "type": "string" },
              "worker2_name": { "type": "string" },
              "machine_model": { "type": "string" },
              "person_count": { "type": "number" },
              "work_content": { "type": "string" },
              "need_complete_count": { "type": "number" },
              "total_complete_count": { "type": "number" },
              "current_progress": { "type": "number" },
              "today_work_summary": { "type": "string" },
              "tomorrow_work_content": { "type": "string" },
              "today_work_type": { "type": "string" },
              "tomorrow_work_type": { "type": "string" },
              "remark": { "type": "string" },
              "entry_time": { "type": "string", "format": "date" },
              "initial_business_trip_time": { "type": "string", "format": "date" },
              "project_business_trip_days": { "type": "number" },
              "personal_total_business_trip": { "type": "number" }
            }
          }
        }
      },
      "response": {
        "success": {
          "code": 0,
          "data": { "id": "number" }
        }
      }
    },
    "project_list": {
      "method": "GET",
      "path": "/api/project/list",
      "auth": "user",
      "description": "获取项目日报列表",
      "request": {
        "query": {
          "fillerName": { "type": "string", "required": false },
          "dailyTimeStart": { "type": "string", "format": "date", "required": false },
          "dailyTimeEnd": { "type": "string", "format": "date", "required": false },
          "projectName": { "type": "string", "required": false },
          "page": { "type": "number", "default": 1 },
          "pageSize": { "type": "number", "default": 20 }
        }
      },
      "response": {
        "success": {
          "code": 0,
          "data": {
            "list": "array",
            "total": "number",
            "page": "number",
            "pageSize": "number"
          }
        }
      }
    },
    "review_action": {
      "method": "POST",
      "path": "/api/review/action",
      "auth": "admin",
      "description": "审核日报操作",
      "request": {
        "contentType": "application/json",
        "body": {
          "action": {
            "type": "string",
            "enum": ["approve", "reject"],
            "required": true
          },
          "reportId": { "type": "number", "required": true },
          "reviewerId": { "type": "string", "required": true },
          "reviewNote": { "type": "string", "required": false }
        }
      },
      "response": {
        "success": {
          "code": 0,
          "message": "审核成功"
        }
      }
    },
    "admin_setAdmin": {
      "method": "POST",
      "path": "/api/admin/set-admin",
      "auth": "admin",
      "description": "设置或取消管理员",
      "request": {
        "contentType": "application/json",
        "body": {
          "targetOpenid": { "type": "string", "required": true },
          "isAdmin": { "type": "boolean", "default": true }
        }
      },
      "response": {
        "success": {
          "code": 0,
          "message": "操作成功"
        }
      }
    },
    "health": {
      "method": "GET",
      "path": "/health",
      "auth": "public",
      "description": "服务健康检查",
      "response": {
        "success": {
          "status": "ok",
          "time": "ISO8601 datetime"
        }
      }
    }
  }
}
```

---

## 4. 数据模型 (Data Models)

### 4.1 用户模型

```json
{
  "User": {
    "tableName": "users",
    "primaryKey": "openid",
    "fields": {
      "openid": {
        "type": "string",
        "maxLength": 64,
        "description": "微信用户唯一标识"
      },
      "user_name": {
        "type": "string",
        "maxLength": 64,
        "default": ""
      },
      "department": {
        "type": "string",
        "maxLength": 128,
        "default": ""
      },
      "avatar_url": {
        "type": "string",
        "maxLength": 512,
        "optional": true
      },
      "phone": {
        "type": "string",
        "maxLength": 20,
        "optional": true
      },
      "status": {
        "type": "number",
        "default": 1,
        "enum": [0, 1],
        "description": "0:禁用 1:正常"
      },
      "is_admin": {
        "type": "number",
        "default": 0,
        "enum": [0, 1]
      },
      "created_at": { "type": "datetime" },
      "updated_at": { "type": "datetime" }
    }
  }
}
```

### 4.2 项目日报模型

```json
{
  "ProjectReport": {
    "tableName": "daily_project_progress",
    "primaryKey": "id",
    "fields": {
      "id": { "type": "number", "autoIncrement": true },
      "daily_time": { "type": "date", "required": true },
      "filler_openid": { "type": "string", "required": true },
      "filler_name": { "type": "string", "required": true },
      "project_name": { "type": "string", "required": true },
      "project_area": { "type": "string", "default": "" },
      "related_unit": { "type": "string", "default": "" },
      "worker1_name": { "type": "string", "default": "" },
      "worker2_name": { "type": "string", "default": "" },
      "machine_model": { "type": "string", "default": "" },
      "person_count": { "type": "number", "default": 0 },
      "work_content": { "type": "text" },
      "need_complete_count": { "type": "number", "default": 0 },
      "total_complete_count": { "type": "number", "default": 0 },
      "current_progress": { "type": "decimal", "precision": [5,2], "default": 0 },
      "today_work_summary": { "type": "text" },
      "tomorrow_work_content": { "type": "text" },
      "today_work_type": { "type": "string", "default": "" },
      "tomorrow_work_type": { "type": "string", "default": "" },
      "remark": { "type": "text" },
      "entry_time": { "type": "date" },
      "initial_business_trip_time": { "type": "date" },
      "project_business_trip_days": { "type": "number", "default": 0 },
      "personal_total_business_trip": { "type": "number", "default": 0 },
      "status": {
        "type": "string",
        "default": "pending",
        "enum": ["pending", "approved", "rejected"]
      },
      "review_note": { "type": "text" },
      "reviewer_openid": { "type": "string" },
      "review_time": { "type": "datetime" },
      "create_time": { "type": "datetime", "auto": true },
      "update_time": { "type": "datetime", "auto": true }
    },
    "indexes": [
      { "name": "idx_filler_daily", "fields": ["filler_openid", "daily_time"] },
      { "name": "idx_project_daily", "fields": ["project_name", "daily_time"] },
      { "name": "idx_status", "fields": ["status"] }
    ],
    "uniqueKeys": [
      { "name": "uk_daily_filler_project", "fields": ["daily_time", "filler_name", "project_name"] }
    ]
  }
}
```

---

## 5. 认证授权 (Authentication & Authorization)

### 5.1 认证机制

```json
{
  "authentication": {
    "type": "wechat_openid",
    "description": "基于微信小程序openid的用户认证",
    "flow": [
      "1. 前端调用 wx.login() 获取 code",
      "2. 前端将 code 发送到后端 /api/login",
      "3. 后端通过 code 换取 openid",
      "4. 后端返回用户信息，前端存储到本地"
    ],
    "storage": {
      "key": "user_info",
      "fields": ["openid", "isAdmin", "userName", "department"]
    }
  }
}
```

### 5.2 权限级别

```json
{
  "authorization": {
    "levels": [
      {
        "name": "public",
        "description": "公开接口，无需认证",
        "apis": ["/api/login", "/health"]
      },
      {
        "name": "user",
        "description": "普通用户，已登录",
        "apis": ["/api/report/*", "/api/project/*", "/api/user/*"]
      },
      {
        "name": "admin",
        "description": "管理员用户，is_admin=1",
        "apis": ["/api/review/*", "/api/admin/*"]
      }
    ],
    "check": {
      "method": "database_query",
      "field": "is_admin",
      "table": "users"
    }
  }
}
```

---

## 6. 错误码定义 (Error Codes)

```json
{
  "errorCodes": {
    "success": { "code": 0, "message": "成功" },
    "general_error": { "code": -1, "message": "通用错误" },
    "bad_request": { "code": 400, "message": "参数错误" },
    "unauthorized": { "code": 401, "message": "未登录" },
    "forbidden": { "code": 403, "message": "无权限" },
    "not_found": { "code": 404, "message": "资源不存在" },
    "server_error": { "code": 500, "message": "服务器错误" },
    "param_invalid": { "code": 1001, "message": "参数校验失败" },
    "data_exists": { "code": 1002, "message": "数据已存在" },
    "operation_failed": { "code": 1003, "message": "操作失败" },
    "status_invalid": { "code": 1004, "message": "状态不允许此操作" }
  }
}
```

---

## 7. 响应格式 (Response Format)

### 7.1 统一响应结构

```json
{
  "responseFormat": {
    "success": {
      "code": 0,
      "message": "success",
      "data": {}
    },
    "error": {
      "code": "number",
      "message": "string",
      "data": null
    },
    "paginated": {
      "code": 0,
      "data": {
        "list": [],
        "total": "number",
        "page": "number",
        "pageSize": "number"
      }
    }
  }
}
```

---

## 8. 环境变量 (Environment Variables)

```json
{
  "environmentVariables": {
    "required": [
      { "name": "MYSQL_HOST", "description": "MySQL服务器地址" },
      { "name": "MYSQL_PORT", "description": "MySQL端口", "default": "3306" },
      { "name": "MYSQL_USER", "description": "MySQL用户名" },
      { "name": "MYSQL_PASSWORD", "description": "MySQL密码" },
      { "name": "MYSQL_DATABASE", "description": "数据库名" }
    ],
    "optional": [
      { "name": "PORT", "description": "服务端口", "default": "3000" },
      { "name": "NODE_ENV", "description": "运行环境", "default": "production" },
      { "name": "WPS_API_TOKEN", "description": "WPS API Token" },
      { "name": "WPS_FILE_ID", "description": "WPS文件ID" },
      { "name": "SUBSCRIBE_TEMPLATE_ID", "description": "订阅消息模板ID" }
    ]
  }
}
```

---

## 9. 服务状态检查 (Health Check)

```json
{
  "healthCheck": {
    "endpoint": "/health",
    "method": "GET",
    "response": {
      "status": "ok",
      "time": "2026-05-24T10:00:00.000Z"
    },
    "checks": [
      { "name": "mysql", "required": true },
      { "name": "redis", "required": false }
    ]
  }
}
```

---

## 10. 前端配置映射 (Frontend Config Mapping)

```json
{
  "frontendConfig": {
    "baseUrl": "${endpoints.production.baseUrl}",
    "apiPaths": {
      "auth": {
        "login": "${apis.login.path}"
      },
      "report": {
        "submit": "${apis.report_submit.path}",
        "list": "${apis.report_list.path}"
      },
      "project": {
        "submit": "${apis.project_submit.path}",
        "list": "${apis.project_list.path}",
        "detail": "${apis.project_detail.path}",
        "stats": "${apis.project_stats.path}"
      },
      "review": {
        "list": "${apis.review_list.path}",
        "action": "${apis.review_action.path}"
      },
      "admin": {
        "users": "${apis.admin_users.path}",
        "setAdmin": "${apis.admin_setAdmin.path}"
      }
    },
    "storageKeys": {
      "userInfo": "user_info",
      "accessToken": "access_token",
      "reportDraft": "report_draft",
      "projectDraft": "project_draft"
    }
  }
}
```

---

## 附录 A: 变更记录

| 版本 | 日期 | 修改内容 |
|-----|------|---------|
| v1.0 | 2026-05-24 | 初始版本，定义完整的后端服务规范 |

---

**文档结束**
