// pages/employee/rejected-edit/index.js - 驳回编辑专用页面
const projectService = require('../../../services/project');
const reviewService = require('../../../services/review');
const {
  DEFAULT_FORM,
  WORK_TYPE_OPTIONS,
  populateProjectForm,
  syncWorkTypePicker,
  buildSubmitPayload,
  validateProjectForm,
} = require('../../../utils/form');

Page({
  data: {
    // 原始记录
    editingId: null,
    loading: true,

    // 表单数据
    form: { ...DEFAULT_FORM },

    // 状态
    submitting: false,

    // 工作类型选项
    workTypeOptions: WORK_TYPE_OPTIONS,
    todayWorkTypeIndex: -1,
    tomorrowWorkTypeIndex: -1,
  },

  onLoad(options) {
    const id = parseInt(options.id);
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      return;
    }
    this._loadDetail(id);
  },

  async _loadDetail(id) {
    this.setData({ loading: true });
    try {
      const detail = await projectService.getDetail(id);
      this._populateForm(detail);
      this._syncWorkTypePicker(detail);
      this.setData({
        editingId: id,
        'form.daily_time': detail.daily_time
          ? detail.daily_time.substring(0, 10)
          : '',
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      console.error('加载驳回日报详情失败', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  _syncWorkTypePicker(formData) {
    const indices = syncWorkTypePicker(formData);
    this.setData(indices);
  },

  onTodayWorkTypeChange(e) {
    const idx = parseInt(e.detail.value);
    const type = this.data.workTypeOptions[idx];
    this.setData({
      'form.today_work_type': type,
      todayWorkTypeIndex: idx,
    });
  },

  onTomorrowWorkTypeChange(e) {
    const idx = parseInt(e.detail.value);
    const type = this.data.workTypeOptions[idx];
    this.setData({
      'form.tomorrow_work_type': type,
      tomorrowWorkTypeIndex: idx,
    });
  },

  _populateForm(row) {
    if (!row) return;
    const f = populateProjectForm(row);
    this.setData({ form: f });
  },

  onFieldInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ [`form.${field}`]: value });
  },

  onDateChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  async onSubmit() {
    const { form, submitting, editingId } = this.data;

    // 基本校验
    const validation = validateProjectForm(form);
    if (!validation.valid) {
      wx.showToast({ title: validation.message, icon: 'none' });
      return;
    }

    if (submitting) return;
    this.setData({ submitting: true });

    try {
      const payload = buildSubmitPayload(form);

      // 先删除旧的驳回记录
      await reviewService.deleteReport(editingId);

      // 再重新创建，状态自动为待审核
      await projectService.submit('create', payload);

      wx.showToast({ title: '已重新提交，等待审核', icon: 'success', duration: 2000 });

      // 提交成功后返回上一页（历史记录页）
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
      console.error('驳回编辑提交失败', err);
    } finally {
      this.setData({ submitting: false });
    }
  },

  // 返回上一页
  onBack() {
    wx.navigateBack();
  },
});
