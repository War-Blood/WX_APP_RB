// pages/employee/project-detail/index.js
const projectService = require('../../../services/project');
const { checkRole, getStatusText, getStatusClass } = require('../../../utils/auth');

Page({
  data: {
    detail: null,
    loading: true,
    getStatusText: getStatusText,
    getStatusClass: getStatusClass,
  },

  onLoad(options) {
    if (!options.id) {
      wx.showToast({ title: '缺少日报ID', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this._loadDetail(parseInt(options.id));
  },

  async _loadDetail(id) {
    this.setData({ loading: true });
    try {
      const detail = await projectService.getDetail(id);
      if (!detail) {
        wx.showToast({ title: '日报不存在', icon: 'none' });
        return;
      }
      // 添加状态文字
      detail.statusText = getStatusText(detail.status);
      detail.statusClass = getStatusClass(detail.status);
      this.setData({ detail });
      wx.setNavigationBarTitle({ title: detail.project_name || '项目日报详情' });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      console.error('加载详情失败', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 编辑（只有待审核或已驳回状态可以编辑）
  onEdit() {
    const { detail } = this.data;
    if (!detail) return;
    // 已通过的日报不允许编辑
    if (detail.status === 'approved') {
      wx.showToast({ title: '已通过的日报不可修改', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/employee/project-edit/index?id=${detail.id}` });
  },

  onPullDownRefresh() {
    const { detail } = this.data;
    if (detail && detail.id) {
      this._loadDetail(detail.id).then(() => wx.stopPullDownRefresh());
    } else {
      wx.stopPullDownRefresh();
    }
  },
});
