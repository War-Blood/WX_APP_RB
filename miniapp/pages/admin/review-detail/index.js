// pages/admin/review-detail/index.js
const reviewService = require('../../../services/review');
const { checkRole } = require('../../../utils/auth');
const { formatTime } = require('../../../utils/date');

Page({
  data: {
    report: {},
    reviewNote: '',
    approving: false,
    rejecting: false,
  },

  onShow() {
    // 权限拦截：只有管理员可以看审核详情
    if (!checkRole('admin')) return;
  },

  async onLoad(options) {
    const { id, action } = options;
    this.reportId = id;
    await this._loadDetail(id);
    if (action === 'reject') {
      this._triggerReject();
    }
  },

  async _loadDetail(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const report = await reviewService.getDetail(id);
      const dailyDate = report.daily_time
        ? String(report.daily_time).substring(0, 10)
        : '';
      const entryDate = report.entry_time
        ? String(report.entry_time).substring(0, 10)
        : '';
      const tripDate = report.initial_business_trip_time
        ? String(report.initial_business_trip_time).substring(0, 10)
        : '';
      const createTimeStr = report.create_time
        ? formatTime(report.create_time)
        : '';
      const reviewTimeStr = report.review_time
        ? formatTime(report.review_time)
        : '';

      this.setData({
        report: {
          ...report,
          dailyDate,
          entryDate,
          tripDate,
          createTimeStr,
          reviewTimeStr,
          progressStr: report.current_progress != null ? report.current_progress + '%' : '0%',
        },
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onNoteInput(e) {
    this.setData({ reviewNote: e.detail.value });
  },

  async onApprove() {
    const confirm = await new Promise((resolve) => {
      wx.showModal({
        title: '确认审核通过',
        content: '通过后该日报将标记为已审核。',
        success: (res) => resolve(res.confirm),
      });
    });
    if (!confirm) return;

    this.setData({ approving: true });
    try {
      await reviewService.approve(this.reportId, this.data.reviewNote);
      wx.showToast({ title: '审核通过', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    } finally {
      this.setData({ approving: false });
    }
  },

  onReject() {
    this._triggerReject();
  },

  async _triggerReject() {
    if (!this.data.reviewNote || !this.data.reviewNote.trim()) {
      wx.showToast({ title: '请填写驳回原因', icon: 'none' });
      return;
    }

    const confirm = await new Promise((resolve) => {
      wx.showModal({
        title: '确认驳回',
        content: '驳回原因：' + this.data.reviewNote,
        confirmText: '确认驳回',
        confirmColor: '#ff4d4f',
        success: (res) => resolve(res.confirm),
      });
    });
    if (!confirm) return;

    this.setData({ rejecting: true });
    try {
      await reviewService.reject(this.reportId, this.data.reviewNote);
      wx.showToast({ title: '已驳回', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    } finally {
      this.setData({ rejecting: false });
    }
  },
});
