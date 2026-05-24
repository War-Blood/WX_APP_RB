// pages/employee/report-edit/index.js
const reportService = require('../../../services/report');
const { debounce, formatDate, formatDateTime } = require('../../../utils/debounce');

const WEEK_MAP = ['日', '一', '二', '三', '四', '五', '六'];

Page({
  data: {
    todayStr: '',
    weekStr: '',
    content: {
      todayDone: '',
      tomorrowPlan: '',
      blockers: '',
      remarks: '',
    },
    existingReport: null,   // 今日已有日报
    isPrefilled: false,   // 是否预填自上次
    isContentValid: false, // 表单是否有效
    submitting: false,
    loading: true,
    draftSavedAt: '',
    _initialized: false, // 标记是否已初始化
  },

  onLoad() {
    const now = new Date();
    this.setData({
      todayStr: formatDate(now),
      weekStr: `周${WEEK_MAP[now.getDay()]}`,
    });

    // 绑定防抖保存草稿（3秒后自动触发）
    this._debounceSaveDraft = debounce(this._saveDraftLocal.bind(this), 3000);

    this._loadReport();
    this.setData({ _initialized: true });
  },

  onShow() {
    // 如果已初始化，onShow 时不再重复加载
    // 只有从其他页面返回时才刷新
    if (!this.data._initialized) {
      this._loadReport();
    }
  },

  onHide() {
    this.setData({ _initialized: false });
  },

  async _loadReport() {
    this.setData({ loading: true });
    try {
      const todayStr = formatDate(new Date());

      // 1. 从历史列表中查找今日日报
      let todayReport = null;
      try {
        const listData = await reportService.getList('', 1, 50);
        const list = listData && listData.list ? listData.list : [];
        todayReport = list.find(r => r.report_date === todayStr) || null;
      } catch (e) {
        console.warn('获取列表失败', e);
      }

      if (todayReport) {
        // 今日有日报（待审核 / 通过 / 驳回）
        // 合并 setData 调用
        this.setData({
          existingReport: {
            ...todayReport,
            reviewTimeStr: todayReport.review_time
              ? formatDateTime(todayReport.review_time)
              : '',
          },
          content: todayReport.content || {},
          isPrefilled: false,
          loading: false,
        });
      } else {
        // 2. 今日无日报 → 尝试获取上次日报预填
        let prefillContent = {};
        let isPrefilled = false;

        // 先检查本地草稿
        const localDraft = reportService.getDraft();
        if (localDraft && localDraft.content) {
          prefillContent = localDraft.content;
          isPrefilled = true;
          this.setData({ draftSavedAt: formatDateTime(localDraft.savedAt) });
        } else {
          // 无本地草稿 → 拉取上次日报
          try {
            const lastReport = await reportService.getLatest();
            if (lastReport && lastReport.content) {
              prefillContent = { ...lastReport.content };
              isPrefilled = true;
            }
          } catch (e) {
            // 无历史日报，正常
          }
        }

        // 合并 setData 调用
        this.setData({
          existingReport: null,
          content: prefillContent,
          isPrefilled,
          loading: false,
        });

        if (isPrefilled) {
          wx.showToast({ title: '已预填上次内容', icon: 'none', duration: 2000 });
        }
      }
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败，请下拉刷新', icon: 'none' });
      console.error('加载日报失败', err);
    } finally {
      this._validateContent();
    }
  },

  // 表单字段输入事件
  onFieldInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;

    // 合并 setData 调用
    const content = { ...this.data.content, [field]: value };
    const isContentValid = !!(content.todayDone && content.todayDone.trim() && content.tomorrowPlan && content.tomorrowPlan.trim());
    
    this.setData({ content, isContentValid });
    this._debounceSaveDraft();
  },

  // 表单有效性校验（至少填写今日完成和明日计划）
  _validateContent() {
    const { todayDone, tomorrowPlan } = this.data.content;
    const isContentValid = !!(todayDone && todayDone.trim() && tomorrowPlan && tomorrowPlan.trim());
    this.setData({ isContentValid });
  },

  // 保存本地草稿
  _saveDraftLocal() {
    const { content } = this.data;
    reportService.saveDraft(content);
    const now = formatDateTime(new Date().toISOString());
    this.setData({ draftSavedAt: now });
  },

  // 点击提交
  async onSubmit() {
    if (this.data.submitting || !this.data.isContentValid) return;

    const { existingReport } = this.data;

    // 已驳回的日报 → 重新提交
    if (existingReport && existingReport.status === 'rejected') {
      const confirm = await new Promise((resolve) => {
        wx.showModal({
          title: '重新提交',
          content: '日报被驳回，重新提交将覆盖原内容，是否继续？',
          success: (res) => resolve(res.confirm),
        });
      });
      if (!confirm) return;

      this.setData({ submitting: true });
      try {
        await reportService.resubmit(existingReport.report_id, this.data.content);
        reportService.clearDraft();
        wx.showToast({ title: '重新提交成功', icon: 'success', duration: 2000 });
        setTimeout(() => this._loadReport(), 1500);
        return;
      } catch (err) {
        wx.showToast({ title: err.message || '提交失败', icon: 'none' });
      } finally {
        this.setData({ submitting: false });
      }
      return;
    }

    // 待审核状态 → 更新草稿
    if (existingReport && existingReport.status === 'pending') {
      wx.showToast({ title: '日报正在审核中，无需重复提交', icon: 'none' });
      return;
    }

    // 已通过状态
    if (existingReport && existingReport.status === 'approved') {
      wx.showToast({ title: '日报已通过审核，无需重复提交', icon: 'none' });
      return;
    }

    // 首次提交
    this.setData({ submitting: true });
    try {
      this._requestSubscription();
      await reportService.submit(this.data.content);
      reportService.clearDraft();
      wx.showToast({ title: '提交成功，等待审核', icon: 'success', duration: 2000 });
      setTimeout(() => this._loadReport(), 1500);
    } catch (err) {
      wx.showToast({ title: err.message || '提交失败，请重试', icon: 'none' });
      console.error('提交失败', err);
    } finally {
      this.setData({ submitting: false });
    }
  },

  // 请求订阅消息授权（审核结果通知）
  _requestSubscription() {
    wx.requestSubscribeMessage({
      tmplIds: ['your_subscribe_template_id'], // 替换为实际模板 ID
      success(res) {
        console.log('订阅消息授权结果', res);
      },
      fail(err) {
        console.log('订阅消息授权失败', err);
      },
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this._loadReport().then(() => {
      wx.stopPullDownRefresh();
    });
  },
});
