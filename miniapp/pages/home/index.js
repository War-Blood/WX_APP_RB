// pages/home/index.js - 首页
const { checkRole, getStatusText } = require('../../utils/auth');

Page({
  data: {
    userName: '',
    roleText: '',
    todayStr: '',
    isAdmin: false,
    quickActions: [],
  },

  onShow() {
    this._loadData();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
  },

  _loadData() {
    const userInfo = wx.getStorageSync('user_info') || {};
    const isAdmin = !!userInfo.isAdmin;

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    // 根据角色设置快捷操作
    const quickActions = isAdmin
      ? [
          { icon: '✅', name: '审核日报', page: '/pages/admin/review-list/index' },
          { icon: '📊', name: '日报记录', page: '/pages/admin/project-list/index' },
          { icon: '👥', name: '用户管理', page: '/pages/admin/user-manage/index' },
        ]
      : [
          { icon: '📋', name: '我的历史', page: '/pages/employee/project-history/index' },
        ];

    this.setData({
      userName: userInfo.userName || userInfo.nickName || '用户',
      roleText: isAdmin ? '管理员' : '员工',
      todayStr: `${y}年${m}月${d}日 星期${weekDays[now.getDay()]}`,
      isAdmin,
      quickActions,
    });
  },

  // 快捷入口
  onQuickAction(e) {
    const page = e.currentTarget.dataset.page;
    if (page) {
      wx.navigateTo({ url: page });
    }
  },

  // 去功能页
  onGoFeatures() {
    wx.switchTab({ url: '/pages/features/index' });
  },
});
