// utils/form.js - 表单处理工具函数

/**
 * 项目日报表单默认值
 */
const DEFAULT_FORM = {
  daily_time: '',
  project_name: '',
  project_area: '',
  related_unit: '',
  worker1_name: '',
  worker2_name: '',
  machine_model: '',
  person_count: '',
  work_content: '',
  need_complete_count: '',
  total_complete_count: '',
  current_progress: '',
  today_work_summary: '',
  tomorrow_work_content: '',
  today_work_type: '',
  tomorrow_work_type: '',
  remark: '',
  entry_time: '',
  initial_business_trip_time: '',
  project_business_trip_days: '',
  personal_total_business_trip: '',
};

/**
 * 工作类型选项
 */
const WORK_TYPE_OPTIONS = ['工作', '待工'];

/**
 * 从数据库记录填充表单数据
 * @param {Object} row - 数据库记录
 * @param {Object} [defaultForm=DEFAULT_FORM] - 默认表单数据
 * @returns {Object} 填充后的表单数据
 */
function populateProjectForm(row, defaultForm = DEFAULT_FORM) {
  if (!row) return { ...defaultForm };

  const f = { ...defaultForm };

  // 映射数据库字段到表单
  f.daily_time = row.daily_time ? String(row.daily_time).substring(0, 10) : f.daily_time;
  f.project_name = row.project_name || '';
  f.project_area = row.project_area || '';
  f.related_unit = row.related_unit || '';
  f.worker1_name = row.worker1_name || '';
  f.worker2_name = row.worker2_name || '';
  f.machine_model = row.machine_model || '';
  f.person_count = row.person_count != null ? String(row.person_count) : '';
  f.work_content = row.work_content || '';
  f.need_complete_count = row.need_complete_count != null ? String(row.need_complete_count) : '';
  f.total_complete_count = row.total_complete_count != null ? String(row.total_complete_count) : '';
  f.current_progress = row.current_progress != null ? String(row.current_progress) : '';
  f.today_work_summary = row.today_work_summary || '';
  f.tomorrow_work_content = row.tomorrow_work_content || '';
  f.today_work_type = row.today_work_type || '';
  f.tomorrow_work_type = row.tomorrow_work_type || '';
  f.remark = row.remark || '';
  f.entry_time = row.entry_time ? String(row.entry_time).substring(0, 10) : '';
  f.initial_business_trip_time = row.initial_business_trip_time ? String(row.initial_business_trip_time).substring(0, 10) : '';
  f.project_business_trip_days = row.project_business_trip_days != null ? String(row.project_business_trip_days) : '';
  f.personal_total_business_trip = row.personal_total_business_trip != null ? String(row.personal_total_business_trip) : '';

  return f;
}

/**
 * 同步工作类型 picker 的选中索引
 * @param {Object} formData - 表单数据
 * @param {Array} [options=WORK_TYPE_OPTIONS] - 工作类型选项
 * @returns {Object} { todayWorkTypeIndex, tomorrowWorkTypeIndex }
 */
function syncWorkTypePicker(formData, options = WORK_TYPE_OPTIONS) {
  const todayIdx = options.indexOf(formData.today_work_type);
  const tomorrowIdx = options.indexOf(formData.tomorrow_work_type);
  return {
    todayWorkTypeIndex: todayIdx >= 0 ? todayIdx : -1,
    tomorrowWorkTypeIndex: tomorrowIdx >= 0 ? tomorrowIdx : -1,
  };
}

/**
 * 将表单数据转换为提交载荷
 * @param {Object} form - 表单数据
 * @param {number} [editingId] - 编辑时的记录 ID
 * @returns {Object} 提交载荷
 */
function buildSubmitPayload(form, editingId = null) {
  const payload = {
    daily_time: form.daily_time,
    project_name: form.project_name.trim(),
    project_area: form.project_area || '',
    related_unit: form.related_unit || '',
    worker1_name: form.worker1_name || '',
    worker2_name: form.worker2_name || '',
    machine_model: form.machine_model || '',
    person_count: form.person_count ? parseInt(form.person_count) : 0,
    work_content: form.work_content || '',
    need_complete_count: form.need_complete_count ? parseInt(form.need_complete_count) : 0,
    total_complete_count: form.total_complete_count ? parseInt(form.total_complete_count) : 0,
    current_progress: form.current_progress ? parseFloat(form.current_progress) : 0,
    today_work_summary: form.today_work_summary || '',
    tomorrow_work_content: form.tomorrow_work_content || '',
    today_work_type: form.today_work_type || '',
    tomorrow_work_type: form.tomorrow_work_type || '',
    remark: form.remark || '',
    entry_time: form.entry_time || null,
    initial_business_trip_time: form.initial_business_trip_time || null,
    project_business_trip_days: form.project_business_trip_days ? parseInt(form.project_business_trip_days) : 0,
    personal_total_business_trip: form.personal_total_business_trip ? parseInt(form.personal_total_business_trip) : 0,
  };

  if (editingId) {
    payload.id = editingId;
  }

  return payload;
}

/**
 * 验证表单数据
 * @param {Object} form - 表单数据
 * @returns {Object} { valid: boolean, message: string }
 */
function validateProjectForm(form) {
  if (!form.daily_time) {
    return { valid: false, message: '请填写日报日期' };
  }
  if (!form.project_name || !form.project_name.trim()) {
    return { valid: false, message: '请填写项目名称' };
  }
  return { valid: true, message: '' };
}

module.exports = {
  DEFAULT_FORM,
  WORK_TYPE_OPTIONS,
  populateProjectForm,
  syncWorkTypePicker,
  buildSubmitPayload,
  validateProjectForm,
};
