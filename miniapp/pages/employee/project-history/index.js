// pages/employee/project-history/index.js
const projectService = require('../../../services/project');
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
    // 筛选
    filterProjectName: '',
    filterDateStart: '',
    filterDateEnd: '',
    filterStatus: '', // '' = 全部
    // 搜索关键字（项目名）
    searchKeyword: '',
    // 状态文字
    getStatusText: getStatusText,
    getStatusClass: getStatusClass,
    _initialized: false, // 标记是否已初始化
  },

  onLoad() {
    // 权限拦截：只有员工可以看自己的历史
    if (!checkRole('employee')) return;
    this._loadList(true);
    this.setData({ _initialized: true });
  },

  onShow() {
    // 刷新自定义 tabBar
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
    // 如果已初始化，onShow 时刷新数据
    if (this.data._initialized) {
      this._loadList(true);
    }
  },

  onHide() {
    // 页面隐藏时重置初始化标记
    this.setData({ _initialized: false });
  },

  // 搜索项目名
  onSearchChange(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  onSearchConfirm() {
    const { searchKeyword } = this.data;
    this.setData({ filterProjectName: searchKeyword, page: 1, noMore: false });
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
      searchKeyword: '',
      filterProjectName: '',
      filterDateStart: '',
      filterDateEnd: '',
      filterStatus: '',
      page: 1,
      noMore: false,
    });
    this._loadList(true);
  },

  /**
   * 格式化列表数据
   * 优化：提取为独立方法
   */
  _formatList(list) {
    return (list || []).map((item) => {
      const dailyDate = item.daily_time
        ? String(item.daily_time).substring(0, 10)
        : '';
      return {
        ...item,
        dailyDate,
        submitTimeStr: formatDateTime(item.create_time),
        statusText: getStatusText(item.status),
        statusClass: getStatusClass(item.status),
      };
    });
  },

  async _loadList(reset = false) {
    if (this.data.loading) return;
    if (!reset && this.data.noMore) return;

    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });

    try {
      // 只查询当前登录用户自己的日报
      const userInfo = wx.getStorageSync('user_info') || {};
      const currentUserName = userInfo.userName || userInfo.nickName || '';

      const result = await projectService.getList({
        fillerName: currentUserName,
        projectName: this.data.filterProjectName,
        dailyTimeStart: this.data.filterDateStart,
        dailyTimeEnd: this.data.filterDateEnd,
        page,
        pageSize: this.data.pageSize,
      });

      let { list = [], total = 0 } = result || {};

      // 前端状态筛选（API 按 openid 返回自己的，前端再按 status 过滤）
      if (this.data.filterStatus) {
        list = list.filter((i) => i.status === this.data.filterStatus);
      }

      const formatted = this._formatList(list);

      // 统计：已完成 / 进行中
      const completedCount = formatted.filter((i) => (i.current_progress || 0) >= 100).length;
      const ongoingCount = formatted.length - completedCount;

      const newList = reset ? formatted : [...this.data.list, ...formatted];

      // 合并 setData 调用
      this.setData({
        list: newList,
        page: page + 1,
        noMore: newList.length >= total,
        completedCount,
        ongoingCount,
        loading: false,
        refreshing: false,
      });
    } catch (err) {
      this.setData({ loading: false, refreshing: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
      console.error('加载列表失败', err);
    }
  },

  onRefresh() {
    this.setData({ refreshing: true, page: 1, noMore: false });
    this._loadList(true);
  },

  onLoadMore() {
    if (this.data.noMore || this.data.loading) return;
    this._loadList(false);
  },

  // 新增日报
  onAddTap() {
    wx.navigateTo({ url: '/pages/employee/project-edit/index' });
  },

  // 点击日报条目
  onItemTap(e) {
    const { id, status } = e.currentTarget.dataset;
    // 被驳回的日报：点击卡片不跳转，使用「修改并重新提交」按钮
    if (status === 'rejected') return;
    wx.navigateTo({ url: `/pages/employee/project-detail/index?id=${id}` });
  },

  // 驳回后编辑 - 跳转到独立的驳回编辑页，提交后回到历史
  onEditRejected(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/employee/rejected-edit/index?id=${id}` });
  },

  onPullDownRefresh() {
    this.onRefresh();
    wx.stopPullDownRefresh();
  },
});
