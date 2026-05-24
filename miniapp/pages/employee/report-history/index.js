// pages/employee/report-history/index.js
const reportService = require('../../../services/report');
const { formatDateTime } = require('../../../utils/debounce');

Page({
  data: {
    list: [],
    filterStatus: '',
    loading: false,
    refreshing: false,
    page: 1,
    noMore: false,
    pageSize: 10,
  },

  onLoad() {
    this._loadList(true);
  },

  onShow() {
    this._loadList(true);
  },

  // 切换筛选
  onFilterChange(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ filterStatus: status, page: 1, noMore: false });
    this._loadList(true);
  },

  async _loadList(reset = false) {
    if (this.data.loading) return;
    if (!reset && this.data.noMore) return;

    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });

    try {
      const result = await reportService.getList(this.data.filterStatus, page, this.data.pageSize);
      const { list = [], total = 0 } = result || {};

      // 格式化时间
      const formatted = (list || []).map((item) => ({
        ...item,
        submitTimeStr: formatDateTime(item.submitTime),
        content: item.content || {},
      }));

      const newList = reset ? formatted : [...this.data.list, ...formatted];
      this.setData({
        list: newList,
        page: page + 1,
        noMore: newList.length >= total,
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false, refreshing: false });
    }
  },

  // 下拉刷新
  onRefresh() {
    this.setData({ refreshing: true, page: 1, noMore: false });
    this._loadList(true);
  },

  // 上拉加载更多
  onLoadMore() {
    this._loadList(false);
  },

  // 点击日报条目
  onItemTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/employee/report-detail/index?id=${id}`,
    });
  },
});
