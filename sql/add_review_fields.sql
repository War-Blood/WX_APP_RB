-- 给 daily_project_progress 表添加审核相关字段
USE daily_report;

ALTER TABLE daily_project_progress
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '审核状态: pending/approved/rejected' AFTER personal_total_business_trip,
  ADD COLUMN review_note TEXT COMMENT '审核备注/驳回原因' AFTER status,
  ADD COLUMN reviewer_openid VARCHAR(100) COMMENT '审核人openid' AFTER review_note,
  ADD COLUMN review_time TIMESTAMP NULL COMMENT '审核时间' AFTER reviewer_openid;

-- 为审核状态加索引
CREATE INDEX idx_status ON daily_project_progress (status);
CREATE INDEX idx_filler_status ON daily_project_progress (filler_name, status);

-- 确认结构
DESCRIBE daily_project_progress;
