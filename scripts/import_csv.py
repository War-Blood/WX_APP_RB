"""
CSV 数据导入脚本：将公出日志原始记录表导入 daily_project_progress 表
处理：字段映射、去重、数据清洗、生成 SQL
"""
import csv
import re
import os
from collections import OrderedDict

CSV_PATH = r'C:\Users\WarBlood\Desktop\公出日志原始记录表.csv'
OUTPUT_SQL = r'Y:\AI\daily-report-miniapp\sql\import_daily_report.sql'

# CSV 列名 -> DB 字段名映射
COLUMN_MAP = {
    '日报时间': 'daily_time',
    '填写人': 'filler_name',           # CSV中全部为空，用作业人员1填充
    '入场时间': 'entry_time',
    '初始出差时间': 'initial_business_trip_time',
    '项目名称': 'project_name',
    '项目所在区域': 'project_area',
    '相关方单位': 'related_unit',
    '作业人员1': 'worker1_name',
    '作业人员2': 'worker2_name',
    '机型': 'machine_model',
    '人数': 'person_count',
    '从事工作内容': 'work_content',
    '需要完成数量': 'need_complete_count',
    '累计完成数量': 'total_complete_count',
    '当前进度': 'current_progress',
    '当日工作小结': 'today_work_summary',
    '明天工作内容': 'tomorrow_work_content',
    '今日工作类型': 'today_work_type',
    '明日工作类型': 'tomorrow_work_type',
    '备注': 'remark',
    '项目出差天数': 'project_business_trip_days',
    '个人累计出差': 'personal_total_business_trip',
    '引用账号 (部门人员名单)': 'ext1',
}


def clean_date(val):
    """清洗日期：2025/01/05 -> 2025-01-05，空值返回 NULL"""
    if not val or not val.strip():
        return 'NULL'
    val = val.strip().replace('/', '-')
    # 验证日期格式
    if re.match(r'^\d{4}-\d{2}-\d{2}$', val):
        return f"'{val}'"
    return 'NULL'


def clean_int(val):
    """清洗整数字段，空值或非数字返回 0，异常值(负数或>365)返回0"""
    if not val or not val.strip():
        return '0'
    val = val.strip().replace(',', '')
    try:
        v = int(float(val))
        # 出差天数不应为负数或超过365
        if v < 0 or v > 365:
            return '0'
        return str(v)
    except ValueError:
        return '0'


def clean_decimal(val):
    """清洗 decimal 字段（当前进度），#DIV/0! 等异常值返回 NULL"""
    if not val or not val.strip():
        return 'NULL'
    val = val.strip().replace('%', '').replace(',', '')
    if val in ('#DIV/0!', '#VALUE!', '#N/A', '#REF!', ''):
        return 'NULL'
    try:
        return str(float(val))
    except ValueError:
        return 'NULL'


def clean_string(val):
    """清洗字符串，转义单引号，去除换行"""
    if not val or not val.strip():
        return 'NULL'
    val = val.strip()
    # 替换换行符为空格（文本字段中的换行会破坏SQL）
    val = val.replace('\r\n', ' ').replace('\r', ' ').replace('\n', ' ')
    # 转义单引号
    val = val.replace("'", "\\'")
    # 去除控制字符（保留常规空格）
    val = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', val)
    return f"'{val}'"


def parse_csv():
    """解析 CSV 并返回去重后的记录列表"""
    print(f"读取 CSV: {CSV_PATH}")
    with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        rows = list(reader)

    header = rows[0]
    data_rows = rows[1:]
    print(f"总行数: {len(data_rows)}")

    # 按唯一索引 key 去重：同一天同一个人同一项目只保留最后一条
    # key = (daily_time, filler_name, project_name)
    unique_records = OrderedDict()

    skipped = 0
    for row in data_rows:
        if len(row) < 5:
            skipped += 1
            continue

        # 构建 row_dict
        row_dict = {}
        for i, col_name in enumerate(header):
            if i < len(row):
                row_dict[col_name] = row[i]
            else:
                row_dict[col_name] = ''

        # 日期为空的跳过
        daily_time_raw = row_dict.get('日报时间', '').strip()
        if not daily_time_raw:
            skipped += 1
            continue

        # 项目名称为空的跳过
        project_name = row_dict.get('项目名称', '').strip()
        if not project_name:
            skipped += 1
            continue

        # filler_name 用 worker1_name 填充（CSV中填写人全部为空）
        worker1 = row_dict.get('作业人员1', '').strip()
        if not worker1:
            skipped += 1
            continue

        # 日期格式化
        daily_time = daily_time_raw.replace('/', '-')

        # 唯一索引 key
        key = (daily_time, worker1, project_name)
        unique_records[key] = row_dict  # 后面的覆盖前面的（保留最后一条）

    print(f"有效记录: {len(unique_records)}")
    print(f"跳过记录: {skipped}")
    print(f"去重合并: {len(data_rows) - skipped - len(unique_records)} 条")

    return unique_records


def generate_sql(records):
    """生成 INSERT SQL 语句"""
    os.makedirs(os.path.dirname(OUTPUT_SQL), exist_ok=True)

    lines = []
    lines.append("-- ========================================")
    lines.append("-- 公出日志原始记录表导入SQL")
    lines.append(f"-- 生成时间: 自动生成")
    lines.append(f"-- 记录数: {len(records)}")
    lines.append("-- 状态: 全部设为 approved (已审核)")
    lines.append("-- ========================================")
    lines.append("")
    lines.append("USE daily_report;")
    lines.append("")
    lines.append("-- 临时禁用唯一索引检查以提高插入性能")
    lines.append("SET UNIQUE_CHECKS=0;")
    lines.append("SET FOREIGN_KEY_CHECKS=0;")
    lines.append("")

    batch_size = 50
    batch = []

    for idx, (key, row_dict) in enumerate(records.items()):
        daily_time, filler_name, project_name = key

        # 清洗各字段
        entry_time = clean_date(row_dict.get('入场时间', ''))
        initial_trip = clean_date(row_dict.get('初始出差时间', ''))
        project_area = clean_string(row_dict.get('项目所在区域', ''))
        related_unit = clean_string(row_dict.get('相关方单位', ''))
        worker1_name = clean_string(filler_name)  # 已经用 worker1 填充了
        worker2_name = clean_string(row_dict.get('作业人员2', ''))
        machine_model = clean_string(row_dict.get('机型', ''))
        person_count = clean_int(row_dict.get('人数', ''))
        work_content = clean_string(row_dict.get('从事工作内容', ''))
        need_complete = clean_int(row_dict.get('需要完成数量', ''))
        total_complete = clean_decimal(row_dict.get('累计完成数量', ''))
        current_progress = clean_decimal(row_dict.get('当前进度', ''))
        today_summary = clean_string(row_dict.get('当日工作小结', ''))
        tomorrow_content = clean_string(row_dict.get('明天工作内容', ''))
        today_type = clean_string(row_dict.get('今日工作类型', ''))
        tomorrow_type = clean_string(row_dict.get('明日工作类型', ''))
        remark_text = clean_string(row_dict.get('备注', ''))
        trip_days = clean_int(row_dict.get('项目出差天数', ''))
        personal_trip = clean_int(row_dict.get('个人累计出差', ''))
        ext1_val = clean_string(row_dict.get('引用账号 (部门人员名单)', ''))

        # 备注字段：如果原始 remark 为空但备注列有内容，合并
        # CSV中备注可能在两个位置（remark 和后面的项目出差天数后面的文本）

        sql = (
            f"('{daily_time}', {clean_string(filler_name)}, {entry_time}, {initial_trip}, "
            f"{clean_string(project_name)}, {project_area}, {related_unit}, "
            f"{worker1_name}, {worker2_name}, {machine_model}, {person_count}, "
            f"{work_content}, {need_complete}, {total_complete}, {current_progress}, "
            f"{today_summary}, {tomorrow_content}, {today_type}, {tomorrow_type}, "
            f"{remark_text}, {trip_days}, {personal_trip}, "
            f"'approved', 'CSV批量导入', 'system_import', NOW(), NOW(), NOW(), "
            f"{ext1_val}, NULL, NULL)"
        )
        batch.append(sql)

        if len(batch) >= batch_size:
            lines.append(
                "INSERT INTO daily_project_progress "
                "(daily_time, filler_name, entry_time, initial_business_trip_time, "
                "project_name, project_area, related_unit, worker1_name, worker2_name, "
                "machine_model, person_count, work_content, need_complete_count, "
                "total_complete_count, current_progress, today_work_summary, "
                "tomorrow_work_content, today_work_type, tomorrow_work_type, "
                "remark, project_business_trip_days, personal_total_business_trip, "
                "status, review_note, reviewer_openid, review_time, create_time, update_time, "
                "ext1, ext2, ext3) VALUES "
            )
            lines.append(",\n".join(batch) + ";")
            lines.append("")
            batch = []

    # 写入剩余的
    if batch:
        lines.append(
            "INSERT INTO daily_project_progress "
            "(daily_time, filler_name, entry_time, initial_business_trip_time, "
            "project_name, project_area, related_unit, worker1_name, worker2_name, "
            "machine_model, person_count, work_content, need_complete_count, "
            "total_complete_count, current_progress, today_work_summary, "
            "tomorrow_work_content, today_work_type, tomorrow_work_type, "
            "remark, project_business_trip_days, personal_total_business_trip, "
            "status, review_note, reviewer_openid, review_time, create_time, update_time, "
            "ext1, ext2, ext3) VALUES "
        )
        lines.append(",\n".join(batch) + ";")
        lines.append("")

    lines.append("SET UNIQUE_CHECKS=1;")
    lines.append("SET FOREIGN_KEY_CHECKS=1;")
    lines.append("")
    lines.append(f"-- 导入完成，共 {len(records)} 条记录")

    with open(OUTPUT_SQL, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f"\nSQL 文件已生成: {OUTPUT_SQL}")
    print(f"文件大小: {os.path.getsize(OUTPUT_SQL) / 1024 / 1024:.1f} MB")
    return OUTPUT_SQL


if __name__ == '__main__':
    records = parse_csv()

    # 打印一些统计
    print("\n--- 数据统计 ---")
    date_set = set()
    person_set = set()
    project_set = set()
    for (dt, person, project), _ in records.items():
        date_set.add(dt)
        person_set.add(person)
        project_set.add(project)
    print(f"日期范围: {min(date_set)} ~ {max(date_set)}")
    print(f"涉及人数: {len(person_set)}")
    print(f"涉及项目: {len(project_set)}")
    print(f"人员名单: {sorted(person_set)}")

    sql_file = generate_sql(records)
