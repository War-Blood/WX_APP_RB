-- ============================================================
-- 员工日报小程序 - MySQL 数据库初始化脚本
-- 执行方式: mysql -u root -p < init.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS `daily_report`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `daily_report`;

-- --------------------------------------------------
-- 用户表
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `openid`       VARCHAR(64)  NOT NULL COMMENT '微信用户唯一标识',
  `user_name`   VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '用户姓名',
  `department`  VARCHAR(128) NOT NULL DEFAULT '' COMMENT '部门',
  `is_admin`    TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否管理员: 0=否 1=是',
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`openid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- openid 自动注册时先插入记录（其他字段留空）
-- INSERT INTO users (openid) VALUES ('oXXXXX') ON DUPLICATE KEY UPDATE openid = openid;

-- --------------------------------------------------
-- 日报表
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS `daily_reports` (
  `report_id`         BIGINT       NOT NULL AUTO_INCREMENT COMMENT '日报ID（兼容旧系统 _id）',
  `user_id`          VARCHAR(64)  NOT NULL COMMENT '员工 openid',
  `user_name`        VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '员工姓名（冗余存储）',
  `department`       VARCHAR(128) NOT NULL DEFAULT '' COMMENT '部门（冗余存储）',
  `report_date`      DATE         NOT NULL COMMENT '日报日期 YYYY-MM-DD',
  `content`          JSON         NOT NULL COMMENT '日报内容 JSON',

  `status`           ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' COMMENT '审核状态',
  `version`          INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '提交版本号',
  `submit_time`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',

  `reviewer_id`      VARCHAR(64)  DEFAULT NULL COMMENT '审核员 openid',
  `review_time`       DATETIME     DEFAULT NULL COMMENT '审核时间',
  `review_note`      VARCHAR(512) DEFAULT '' COMMENT '审核备注/驳回原因',

  PRIMARY KEY (`report_id`),
  UNIQUE KEY `uk_user_date` (`user_id`, `report_date`),      -- 每人每天最多一条
  KEY `idx_status`    (`status`),                              -- 管理员按状态筛选
  KEY `idx_submit_time` (`submit_time`),                       -- 按时间排序
  KEY `idx_reviewer_date` (`reviewer_id`, `review_time`)       -- 管理员按审核人查
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日报表';

-- content 字段 JSON 结构示例：
-- {
--   "todayDone":     "完成了需求评审",
--   "tomorrowPlan":  "开始开发登录模块",
--   "blockers":      "服务器尚未到位",
--   "remarks":       ""
-- }
