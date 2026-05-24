#!/bin/bash
curl -s -X POST http://localhost:3000/api/project/submit \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "openid": "test_openid_001",
    "userName": "张三",
    "data": {
      "daily_time": "2026-05-21",
      "project_name": "XX风电场项目",
      "project_area": "西北区",
      "related_unit": "国家电网",
      "worker1_name": "李四",
      "worker2_name": "王五",
      "machine_model": "型号A",
      "person_count": 5,
      "work_content": "完成了基础施工",
      "need_complete_count": 100,
      "total_complete_count": 30,
      "current_progress": 30.00,
      "today_work_summary": "进展顺利",
      "tomorrow_work_content": "继续安装设备",
      "today_work_type": "施工作业",
      "tomorrow_work_type": "施工作业",
      "project_business_trip_days": 3,
      "personal_total_business_trip": 10
    }
  }'
