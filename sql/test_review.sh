#!/bin/bash
# 测试项目日报审核接口

echo "=== 测试审核统计 ==="
curl -s http://localhost:3000/api/project/review-stats
echo ""

echo "=== 测试审核列表(待审核) ==="
curl -s "http://localhost:3000/api/project/review-list?status=pending&page=1&pageSize=5"
echo ""

echo "=== 测试提交一条日报 ==="
curl -s -X POST http://localhost:3000/api/project/submit \
  -H "Content-Type: application/json" \
  -d '{"action":"create","openid":"test_admin_001","userName":"张三","data":{"daily_time":"2026-05-21","project_name":"测试风电场","project_area":"西北","person_count":3,"work_content":"设备安装","current_progress":25.5,"total_complete_count":10,"need_complete_count":40}}'
echo ""

echo "=== 再次查审核列表 ==="
curl -s "http://localhost:3000/api/project/review-list?status=pending"
echo ""

echo "=== 测试审核通过 ==="
curl -s -X POST http://localhost:3000/api/project/review-action \
  -H "Content-Type: application/json" \
  -d '{"action":"approve","id":1,"reviewerId":"test_admin_001","reviewNote":"没问题"}'
echo ""

echo "=== 查审核统计 ==="
curl -s http://localhost:3000/api/project/review-stats
echo ""
