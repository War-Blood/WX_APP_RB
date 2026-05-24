// pages/admin/user-manage/index.js
const reviewService = require('../../../services/review');
const { checkRole } = require('../../../utils/auth');

Page({
  data: {
    list: [],
    loading: false,
    page: 1,
    noMore: false,
    pageSize: 20,
    keyword: '',
    total: 0,
  },

  onShow() {
    if (!checkRole('admin')) return;
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
    this._loadUsers(true);
  },

  onLoad() {},

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onDoSearch() {
    this.setData({ page: 1, noMore: false });
    this._loadUsers(true);
  },

  onClearSearch() {
    this.setData({ keyword: '', page: 1, noMore: false });
    this._loadUsers(true);
  },

  async _loadUsers(reset = false) {
    if (this.data.loading) return;
    if (!reset && this.data.noMore) return;

    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });

    try {
      const result = await reviewService.getUserList(
        page,
        this.data.pageSize,
        this.data.keyword
      );

      const list = (result.list || []).map((u) => ({
        ...u,
        isAdmin: !!u.is_admin,
        createdAtStr: u.created_at
          ? String(u.created_at).substring(0, 16).replace('T', ' ')
          : '',
      }));

      const newList = reset ? list : [...this.data.list, ...list];
      const total = result.total || 0;

      this.setData({
        list: newList,
        page: page + 1,
        noMore: newList.length >= total,
        total,
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      console.error('加载用户列表失败', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  onLoadMore() {
    this._loadUsers(false);
  },

  async onToggleAdmin(e) {
    const { openid, isadmin } = e.currentTarget.dataset;
    const targetIsAdmin = isadmin === 1 || isadmin === true;
    const action = targetIsAdmin ? '取消管理员' : '设为管理员';

    const confirm = await new Promise((resolve) => {
      wx.showModal({
        title: '确认操作',
        content: `确定要${action}该用户吗？`,
        success: (res) => resolve(res.confirm),
      });
    });
    if (!confirm) return;

    try {
      await reviewService.setAdmin(openid, !targetIsAdmin);
      wx.showToast({
        title: targetIsAdmin ? '已取消管理员' : '已设为管理员',
        icon: 'success',
      });
      // 刷新列表
      this.setData({ page: 1, noMore: false });
      this._loadUsers(true);
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  // 复制 openid（方便调试）
  onCopyOpenid(e) {
    const { openid } = e.currentTarget.dataset;
    wx.setClipboardData({
      data: openid,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      },
    });
  },
});
