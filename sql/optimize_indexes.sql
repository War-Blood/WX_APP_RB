-- =============================================
-- 性能优化：添加索引
-- 执行时间：2026-05-24
-- 说明：为 daily_project_progress 表添加 status 索引
-- =============================================

USE daily_report;

-- 1. 为 status 字段添加索引（审核列表查询优化）
-- 场景：管理员审核列表按状态筛选（pending/approved/rejected）
CREATE INDEX idx_status ON daily_project_progress (status);

-- 2. 复合索引：status + create_time（审核列表排序优化）
-- 场景：按状态筛选并按创建时间倒序排列
CREATE INDEX idx_status_createtime ON daily_project_progress (status, create_time DESC);

-- 3. 复合索引：filler_name + status（员工历史查询优化）
-- 场景：员工查看自己的日报历史，按状态筛选
CREATE INDEX idx_filler_status ON daily_project_progress (filler_name, status);

-- 4. 复合索引：daily_time + status（按日期统计优化）
-- 场景：按日期统计各状态日报数量
CREATE INDEX idx_daily_status ON daily_project_progress (daily_time, status);

-- 验证索引创建
SHOW INDEX FROM daily_project_progress;

-- 查看表结构
DESC daily_project_progress;
