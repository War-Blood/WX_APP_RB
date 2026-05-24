// pages/admin/project-list/index.js
// 管理员查看全部日报记录
const projectService = require('../../../services/project');
const reviewService = require('../../../services/review');
const { formatDateTime } = require('../../../utils/debounce');
const { checkRole, getStatusText, getStatusClass } = require('../../../utils/auth');

Page({
  data: {
    list: [],
    loading: false,
    refreshing: false,
    page: 1,
    noMore: false,
    pageSize: 10,
    completedCount: 0,
    ongoingCount: 0,
    // 搜索
    searchProject: '',
    searchFiller: '',
    // 日期筛选
    filterDateStart: '',
    filterDateEnd: '',
    // 状态筛选
    filterStatus: '',
    // 状态文字映射
    getStatusText: getStatusText,
    getStatusClass: getStatusClass,
  },

  onShow() {
    if (!checkRole('admin')) return;
    // 刷新自定义 tabBar
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
    this._loadList(true);
  },

  onLoad() {},

  // 搜索
  onSearchProjectInput(e) {
    this.setData({ searchProject: e.detail.value });
  },
  onSearchFillerInput(e) {
    this.setData({ searchFiller: e.detail.value });
  },
  onDoSearch() {
    this.setData({ page: 1, noMore: false });
    this._loadList(true);
  },

  // 日期筛选
  onDateStartChange(e) {
    this.setData({ filterDateStart: e.detail.value, page: 1, noMore: false });
    this._loadList(true);
  },
  onDateEndChange(e) {
    this.setData({ filterDateEnd: e.detail.value, page: 1, noMore: false });
    this._loadList(true);
  },

  // 状态筛选
  onFilterStatus(e) {
    const status = e.currentTarget.dataset.status || '';
    this.setData({ filterStatus: status, page: 1, noMore: false });
    this._loadList(true);
  },

  // 清除筛选
  onClearFilter() {
    this.setData({
      searchProject: '',
      searchFiller: '',
      filterDateStart: '',
      filterDateEnd: '',
      filterStatus: '',
      page: 1,
      noMore: false,
    });
    this._loadList(true);
  },

  async _loadList(reset = false) {
    if (this.data.loading) return;
    if (!reset && this.data.noMore) return;

    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });

    try {
      // 用 review-list 接口，它查全量数据且支持 status/projectName/fillerName 筛选
      // 管理员日报记录页默认查全部（不传status），审核页默认查待审核
      const statusParam = this.data.filterStatus || '';
      const result = await reviewService.getList(
        statusParam,
        {
          projectName: this.data.searchProject,
          fillerName: this.data.searchFiller,
        },
        page,
        this.data.pageSize
      );

      let list = result.list || [];
      const total = result.total || 0;

      // 前端日期筛选（review-list 接口暂不支持日期筛选）
      if (this.data.filterDateStart) {
        list = list.filter((i) => i.daily_time >= this.data.filterDateStart);
      }
      if (this.data.filterDateEnd) {
        list = list.filter((i) => i.daily_time <= this.data.filterDateEnd);
      }

      const formatted = list.map((item) => {
        const dailyDate = item.daily_time ? String(item.daily_time).substring(0, 10) : '';
        return {
          ...item,
          dailyDate,
          submitTimeStr: formatDateTime(item.create_time),
          statusText: getStatusText(item.status),
          statusClass: getStatusClass(item.status),
          progressStr: item.current_progress != null ? item.current_progress + '%' : '0%',
        };
      });

      // 统计
      const completedCount = formatted.filter((i) => (i.current_progress || 0) >= 100).length;
      const ongoingCount = formatted.length - completedCount;

      const newList = reset ? formatted : [...this.data.list, ...formatted];
      this.setData({
        list: newList,
        page: page + 1,
        noMore: newList.length >= total,
        completedCount,
        ongoingCount,
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      console.error('加载列表失败', err);
    } finally {
      this.setData({ loading: false, refreshing: false });
    }
  },

  onRefresh() {
    this.setData({ refreshing: true, page: 1, noMore: false });
    this._loadList(true);
  },

  onLoadMore() {
    this._loadList(false);
  },

  // 点击条目进入详情
  onItemTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/admin/review-detail/index?id=' + id });
  },

  // 删除日报
  onDeleteTap(e) {
    const { id, project } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: `确定删除「${project || '该项目'}」的日报吗？此操作不可恢复。`,
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          this._doDelete(id);
        }
      },
    });
  },

  async _doDelete(id) {
    wx.showLoading({ title: '删除中...' });
    try {
      await reviewService.deleteReport(id);
      wx.hideLoading();
      wx.showToast({ title: '已删除', icon: 'success' });
      // 刷新列表
      this.setData({ page: 1, noMore: false });
      this._loadList(true);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '删除失败', icon: 'none' });
    }
  },
});
