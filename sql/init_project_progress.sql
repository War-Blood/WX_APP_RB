-- =============================================
-- 日报项目进度跟踪表 - 建表脚本
-- 数据库: daily_report
-- =============================================

USE daily_report;

-- 创建日报项目进度跟踪表
DROP TABLE IF EXISTS daily_project_progress;
CREATE TABLE daily_project_progress (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT NOT NULL COMMENT '主键ID（自增，无业务含义）',
    daily_time DATE NOT NULL COMMENT '日报时间（必填）',
    filler_name VARCHAR(50) NOT NULL COMMENT '日报填写人姓名（必填）',
    entry_time DATE COMMENT '入场时间',
    initial_business_trip_time DATE COMMENT '初始出差时间',
    project_name VARCHAR(100) NOT NULL COMMENT '项目名称（必填）',
    project_area VARCHAR(100) COMMENT '项目所在区域',
    related_unit VARCHAR(100) COMMENT '相关方单位',
    worker1_name VARCHAR(50) COMMENT '作业人员1姓名',
    worker2_name VARCHAR(50) COMMENT '作业人员2姓名',
    machine_model VARCHAR(50) COMMENT '作业机型',
    person_count INT UNSIGNED DEFAULT 0 COMMENT '作业人数（无符号，默认0）',
    work_content TEXT COMMENT '当日从事工作内容',
    need_complete_count INT UNSIGNED DEFAULT 0 COMMENT '项目需要完成总数量',
    total_complete_count INT UNSIGNED DEFAULT 0 COMMENT '项目累计完成数量',
    current_progress DECIMAL(5,2) DEFAULT 0.00 COMMENT '项目当前进度（百分比，0.00~100.00，默认0.00）',
    today_work_summary TEXT COMMENT '当日工作小结',
    tomorrow_work_content TEXT COMMENT '次日计划工作内容',
    today_work_type VARCHAR(50) COMMENT '当日工作类型',
    tomorrow_work_type VARCHAR(50) COMMENT '次日工作类型',
    remark TEXT COMMENT '其他备注信息',
    project_business_trip_days INT UNSIGNED DEFAULT 0 COMMENT '项目累计出差天数（无符号，默认0）',
    personal_total_business_trip INT UNSIGNED DEFAULT 0 COMMENT '个人累计出差天数（无符号，默认0）',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL COMMENT '记录创建时间（自动生成，不可修改）',
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间（自动刷新）',
    ext1 VARCHAR(255) COMMENT '预留扩展字段1',
    ext2 VARCHAR(255) COMMENT '预留扩展字段2',
    ext3 TEXT COMMENT '预留长文本扩展字段3'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='日报项目进度跟踪主表';

-- 唯一约束：避免同一天同一人同一项目重复提交日报
CREATE UNIQUE INDEX uk_daily_filler_project ON daily_project_progress (daily_time, filler_name, project_name);

-- 高频联合索引：适配小程序「我的日报按日期查询」核心场景
CREATE INDEX idx_filler_daily ON daily_project_progress (filler_name, daily_time);

-- 项目查询索引：适配「项目进度按日期查询」场景
CREATE INDEX idx_project_daily ON daily_project_progress (project_name, daily_time);

-- 区域查询索引：适配按项目区域统计场景
CREATE INDEX idx_project_area ON daily_project_progress (project_area);
