// pages/employee/project-edit/index.js
const projectService = require('../../../services/project');
const { debounce, formatDate } = require('../../../utils/debounce');
const { checkRole } = require('../../../utils/auth');
const {
  DEFAULT_FORM,
  WORK_TYPE_OPTIONS,
  populateProjectForm,
  syncWorkTypePicker,
  buildSubmitPayload,
  validateProjectForm,
} = require('../../../utils/form');

const WEEK_MAP = ['日', '一', '二', '三', '四', '五', '六'];

Page({
    data: {
    // 日期显示
    todayStr: '',
    weekStr: '',

    // 原始记录（编辑时）
    editingId: null,
    editDate: '',

    // 表单数据
    form: { ...DEFAULT_FORM },

    // 状态
    submitting: false,
    loading: true,
    isEditMode: false,
    draftSavedAt: '',

    // 工作类型选项
    workTypeOptions: WORK_TYPE_OPTIONS,
    todayWorkTypeIndex: -1,
    tomorrowWorkTypeIndex: -1,
  },

  onShow() {
    // 权限拦截：只有员工可以写日报
    if (!checkRole('employee')) return;
    // 刷新自定义 tabBar
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }

  },

  onLoad(options) {
    const now = new Date();
    const todayStr = formatDate(now);
    this.setData({
      todayStr: todayStr,
      weekStr: `周${WEEK_MAP[now.getDay()]}`,
      'form.daily_time': todayStr,
    });

    // 绑定防抖保存（3秒后触发）
    this._debounceSaveDraft = debounce(this._saveLocalDraft.bind(this), 3000);

    if (options.id) {
      // 编辑已有日报
      this._loadDetail(parseInt(options.id));
    } else if (options.date) {
      // 指定日期
      this.setData({ 'form.daily_time': options.date, editDate: options.date });
      this._loadByDate(options.date);
    } else {
      // 全新日报
      this._initNew();
    }
  },

  async _initNew() {
    this.setData({ loading: true });
    try {
      // 先检查本地草稿
      const localDraft = projectService.getLocalDraft();
      if (localDraft && localDraft.data) {
        this._populateForm(localDraft.data);
        this._syncWorkTypePicker(localDraft.data);
        this.setData({
          draftSavedAt: localDraft.savedAt,
        });
        wx.showToast({ title: '已恢复草稿', icon: 'none', duration: 2000 });
      } else {
        // 尝试拉取服务器草稿
        try {
          const draft = await projectService.getDraft();
          if (draft && draft.id) {
            this._populateForm(draft);
            this._syncWorkTypePicker(draft);
            this.setData({ isEditMode: true, editingId: draft.id });
            wx.showToast({ title: '已加载上次记录', icon: 'none', duration: 2000 });
          } else {
            // 无草稿，获取上次日报预填充基本信息
            await this._prefillFromLastRecord();
          }
        } catch (e) {
          // 无草稿，获取上次日报预填充基本信息
          await this._prefillFromLastRecord();
        }
      }
    } catch (err) {
      console.error('初始化失败', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 从上次日报预填充基本信息（入场时间、出差时间、作业人员、项目进度）
   */
  async _prefillFromLastRecord() {
    try {
      const userInfo = wx.getStorageSync('user_info') || {};
      const userName = userInfo.userName || userInfo.nickName || '';
      if (!userName) return;

      const lastRecord = await projectService.getLastRecord(userName);
      if (lastRecord && lastRecord.id) {
        const f = { ...this.data.form };
        // 只预填充基本信息，日报日期保持当天
        f.entry_time = lastRecord.entry_time ? String(lastRecord.entry_time).substring(0, 10) : '';
        f.initial_business_trip_time = lastRecord.initial_business_trip_time
          ? String(lastRecord.initial_business_trip_time).substring(0, 10) : '';
        f.worker1_name = lastRecord.worker1_name || '';
        f.worker2_name = lastRecord.worker2_name || '';
        f.person_count = lastRecord.person_count != null ? String(lastRecord.person_count) : '';
        f.machine_model = lastRecord.machine_model || '';
        f.current_progress = lastRecord.current_progress != null ? String(lastRecord.current_progress) : '';
        f.need_complete_count = lastRecord.need_complete_count != null ? String(lastRecord.need_complete_count) : '';
        f.total_complete_count = lastRecord.total_complete_count != null ? String(lastRecord.total_complete_count) : '';
        // 工作类型也预填充
        f.today_work_type = lastRecord.today_work_type || '';
        f.tomorrow_work_type = lastRecord.tomorrow_work_type || '';
        this.setData({ form: f });
        this._syncWorkTypePicker(f);
        wx.showToast({ title: '已预填上次日报信息', icon: 'none', duration: 2000 });
      }
    } catch (e) {
      console.error('获取上次日报失败', e);
      wx.showToast({ title: '预填失败，请手动填写', icon: 'none', duration: 2000 });
    }
  },

  /**
   * 同步工作类型 picker 的选中索引
   */
  _syncWorkTypePicker(formData) {
    const indices = syncWorkTypePicker(formData);
    this.setData(indices);
  },

  // 工作类型选择器
  onTodayWorkTypeChange(e) {
    const idx = parseInt(e.detail.value);
    const type = this.data.workTypeOptions[idx];
    this.setData({
      'form.today_work_type': type,
      todayWorkTypeIndex: idx,
    });
    this._debounceSaveDraft();
  },

  onTomorrowWorkTypeChange(e) {
    const idx = parseInt(e.detail.value);
    const type = this.data.workTypeOptions[idx];
    this.setData({
      'form.tomorrow_work_type': type,
      tomorrowWorkTypeIndex: idx,
    });
    this._debounceSaveDraft();
  },

  async _loadDetail(id) {
    this.setData({ loading: true });
    try {
      const detail = await projectService.getDetail(id);
      this._populateForm(detail);
      this._syncWorkTypePicker(detail);
      this.setData({
        isEditMode: true,
        editingId: id,
        'form.daily_time': detail.daily_time
          ? detail.daily_time.substring(0, 10)
          : this.data.form.daily_time,
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      console.error('加载详情失败', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  async _loadByDate(date) {
    this.setData({ loading: true });
    try {
      const draft = await projectService.getDraft(date);
      if (draft && draft.id) {
        this._populateForm(draft);
        this._syncWorkTypePicker(draft);
        this.setData({ isEditMode: true, editingId: draft.id });
      }
    } catch (e) {
      // 无该日期记录，正常
    } finally {
      this.setData({ loading: false });
    }
  },

  _populateForm(row) {
    if (!row) return;
    const f = populateProjectForm(row, this.data.form);
    this.setData({ form: f });
  },

  // ===== 表单字段输入 =====
  onFieldInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ [`form.${field}`]: value });
    this._debounceSaveDraft();
  },

  // 日期选择
  onDateChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
    this._debounceSaveDraft();
  },

  // ===== 防抖保存草稿到本地 =====
  _saveLocalDraft() {
    const { form } = this.data;
    projectService.saveLocalDraft(form);
    const now = new Date();
    const t = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
    this.setData({ draftSavedAt: t });
  },

  // ===== 提交 =====
  async onSubmit() {
    const { form, submitting, isEditMode, editingId } = this.data;

    // 基本校验
    const validation = validateProjectForm(form);
    if (!validation.valid) {
      wx.showToast({ title: validation.message, icon: 'none' });
      return;
    }

    if (submitting) return;
    this.setData({ submitting: true });

    try {
      const payload = buildSubmitPayload(form, isEditMode && editingId ? editingId : null);

      if (isEditMode && editingId) {
        await projectService.submit('update', payload);
        wx.showToast({ title: '更新成功', icon: 'success', duration: 2000 });
      } else {
        await projectService.submit('create', payload);
        wx.showToast({ title: '提交成功', icon: 'success', duration: 2000 });
      }

      projectService.clearLocalDraft();
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
      console.error('提交失败', err);
    } finally {
      this.setData({ submitting: false });
    }
  },

  // ===== 删除 =====
  async onDelete() {
    const { editingId, isEditMode } = this.data;
    if (!isEditMode || !editingId) return;

    const confirm = await new Promise((resolve) => {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这条项目日报吗？',
        success: (res) => resolve(res.confirm),
      });
    });
    if (!confirm) return;

    try {
      await projectService.submit('delete', { id: editingId });
      wx.showToast({ title: '已删除', icon: 'success', duration: 2000 });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      wx.showToast({ title: err.message || '删除失败', icon: 'none' });
    }
  },

  onPullDownRefresh() {
    if (this.data.editingId) {
      this._loadDetail(this.data.editingId).then(() => wx.stopPullDownRefresh());
    } else {
      this._initNew().then(() => wx.stopPullDownRefresh());
    }
  },
});
