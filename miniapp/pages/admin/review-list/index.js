// pages/admin/review-list/index.js
const reviewService = require('../../../services/review');
const { checkRole } = require('../../../utils/auth');
const { formatTime } = require('../../../utils/date');

Page({
  data: {
    list: [],
    stats: { pending: 0, approved: 0, rejected: 0 },
    filterStatus: 'pending',
    loading: false,
    refreshing: false,
    page: 1,
    noMore: false,
    pageSize: 10,
    searchProject: '',
    searchFiller: '',
    _initialized: false, // 标记是否已初始化
  },

  onLoad() {
    // 权限拦截：只有管理员可以审核
    if (!checkRole('admin')) return;
    this._loadData();
    this.setData({ _initialized: true });
  },

  onShow() {
    // 刷新自定义 tabBar
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
    // 如果已初始化，onShow 时刷新数据
    if (this.data._initialized) {
      this._loadStats();
      this._loadList(true);
    }
  },

  onHide() {
    // 页面隐藏时重置初始化标记，下次 onShow 时重新加载
    this.setData({ _initialized: false });
  },

  /**
   * 统一数据加载入口
   * 优化：合并请求，减少网络开销
   */
  async _loadData() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      // 并行请求统计和列表数据
      const [stats, listResult] = await Promise.all([
        reviewService.getStats(),
        reviewService.getList(this.data.filterStatus, {}, 1, this.data.pageSize),
      ]);

      const { list, total } = listResult || {};
      const formatted = this._formatList(list || []);

      this.setData({
        stats,
        list: formatted,
        page: 2,
        noMore: formatted.length >= total,
        loading: false,
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async _loadStats() {
    try {
      const stats = await reviewService.getStats();
      this.setData({ stats });
    } catch (e) {
      console.error('加载统计失败', e);
    }
  },

  /**
   * 格式化列表数据
   * 优化：提取为独立方法，减少代码重复
   */
  _formatList(list) {
    return (list || []).map((item) => {
      const dailyDate = item.daily_time
        ? String(item.daily_time).substring(0, 10)
        : '';
      const createTimeStr = item.create_time
        ? formatTime(item.create_time)
        : '';
      return {
        ...item,
        dailyDate,
        createTimeStr,
        progressStr: item.current_progress != null ? item.current_progress + '%' : '0%',
      };
    });
  },

  onFilterChange(e) {
    const status = e.currentTarget.dataset.status;
    // 合并 setData 调用
    this.setData({ filterStatus: status, page: 1, noMore: false });
    this._loadList(true);
  },

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

  async _loadList(reset = false) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });

    try {
      const { list, total } = await reviewService.getList(
        this.data.filterStatus,
        {
          projectName: this.data.searchProject,
          fillerName: this.data.searchFiller,
        },
        page,
        this.data.pageSize
      );

      const formatted = this._formatList(list || []);
      const newList = reset ? formatted : [...this.data.list, ...formatted];

      // 合并 setData 调用
      this.setData({
        list: newList,
        page: page + 1,
        noMore: newList.length >= total,
        loading: false,
        refreshing: false,
      });
    } catch (err) {
      this.setData({ loading: false, refreshing: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this._loadStats();
    this._loadList(true);
  },

  onLoadMore() {
    if (this.data.noMore || this.data.loading) return;
    this._loadList(false);
  },

  onItemTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/admin/review-detail/index?id=' + id });
  },

  async onQuickApprove(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认通过',
      content: '确定审核通过此日报？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          wx.showLoading({ title: '处理中...' });
          await reviewService.approve(id, '');
          wx.hideLoading();
          wx.showToast({ title: '已通过', icon: 'success' });
          // 合并刷新操作
          this._loadStats();
          this._loadList(true);
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: '操作失败', icon: 'none' });
        }
      },
    });
  },

  onQuickReject(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/admin/review-detail/index?id=' + id + '&action=reject',
    });
  },

  stopPropagation() {},
});
