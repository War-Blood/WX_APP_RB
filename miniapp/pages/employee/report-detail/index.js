// pages/employee/report-detail/index.js
const reportService = require('../../../services/report');
const { formatDateTime } = require('../../../utils/debounce');

Page({
  data: {
    report: null,
    loading: true,
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this._loadDetail(id);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      wx.navigateBack();
    }
  },

  async _loadDetail(reportId) {
    this.setData({ loading: true });
    try {
      const data = await reportService.getDetail(reportId);
      this.setData({
        report: {
          ...data,
          submitTimeStr: data.submitTime ? formatDateTime(data.submitTime) : '',
          reviewTimeStr: data.reviewTime ? formatDateTime(data.reviewTime) : '',
          content: data.content || {},
        },
        loading: false,
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },
});
