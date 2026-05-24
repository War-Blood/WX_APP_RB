# 文档版本索引

**最后更新**: 2026-05-24  
**维护负责人**: 技术团队

---

## 文档清单

| 文档名称 | 文件路径 | 当前版本 | 状态 | 最后更新 |
|---------|---------|---------|------|---------|
| 产品需求文档 | [docs/PRD.md](./PRD.md) | v2.1 | 正式版 | 2026-05-24 |
| 技术架构文档 | [docs/TECH_ARCHITECTURE.md](./TECH_ARCHITECTURE.md) | v1.1 | 已实施 | 2026-05-24 |
| API 接口文档 | [docs/API.md](./API.md) | v1.1 | 正式版 | 2026-05-24 |
| 部署文档 | [docs/DEPLOY.md](./DEPLOY.md) | v1.1 | 正式版 | 2026-05-24 |
| 开发指南 | [docs/DEVELOPMENT.md](./DEVELOPMENT.md) | v1.1 | 正式版 | 2026-05-24 |
| 文件结构说明 | [docs/FILE_STRUCTURE.md](./FILE_STRUCTURE.md) | v1.0 | 正式版 | 2026-05-24 |
| 编码规范 | [docs/coding.md](./coding.md) | v1.0 | 正式版 | 2026-05-24 |
| 项目规则 | [docs/project.md](./project.md) | v1.0 | 正式版 | 2026-05-24 |

---

## 版本更新历史

### 2026-05-24

| 文档 | 版本变更 | 更新内容 |
|-----|---------|---------|
| PRD.md | v2.0 → v2.1 | 根据实际代码实现更新：权限管理为简化实现，项目进度日报标注为规划中 |
| TECH_ARCHITECTURE.md | v1.0 → v1.1 | 技术栈调整为微信云函数架构；数据库表结构更新；接口设计更新为云函数调用方式 |
| API.md | v1.0 → v1.1 | 标注项目进度日报模块为规划中 |
| DEPLOY.md | v1.0 → v1.1 | 补充完整环境变量配置项，优化部署说明 |
| DEVELOPMENT.md | v1.0 → v1.1 | 同步更新文档版本和变更记录 |

---

## 文档维护规范

### 版本号规则

- **主版本号 (Major)**: 重大架构变更或功能重构
- **次版本号 (Minor)**: 功能新增或重要更新
- **修订号 (Patch)**: 错误修正或小范围调整

### 更新流程

1. 修改文档内容
2. 更新文档头部版本号和日期
3. 在文档末尾变更记录中添加条目
4. 更新本文档的版本索引

### 文档状态说明

| 状态 | 说明 |
|-----|------|
| 草稿 | 文档编写中，内容可能不完整 |
| 初稿 | 文档基本完成，待审核 |
| 正式版 | 文档已审核通过，可作为参考 |
| 已实施 | 文档描述内容已实际部署 |
| 已废弃 | 文档已过时，不再维护 |

---

## 文档交叉引用关系

```
PRD.md
  └── 引用: TECH_ARCHITECTURE.md

TECH_ARCHITECTURE.md
  └── 引用: API.md, DEPLOY.md

API.md
  └── 被引用: TECH_ARCHITECTURE.md, DEVELOPMENT.md

DEPLOY.md
  └── 引用: PRD.md, TECH_ARCHITECTURE.md, API.md, DEVELOPMENT.md

DEVELOPMENT.md
  └── 引用: PRD.md, TECH_ARCHITECTURE.md, API.md
```

---

## 联系方式

如有文档相关问题，请联系：
- 产品相关问题：产品团队
- 技术相关问题：技术团队
- 部署相关问题：DevOps团队

---

**文档结束**
