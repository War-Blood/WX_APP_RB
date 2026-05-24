// pages/features/index.js - 功能列表页
const { getUserInfo, checkRole } = require('../../utils/auth');

Page({
  data: {
    sections: [],
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
    this._buildFeatureList();
  },

  _buildFeatureList() {
    const userInfo = getUserInfo();
    const isAdmin = !!(userInfo && userInfo.isAdmin);

    const sections = [];

    if (!isAdmin) {
      // 员工功能
      sections.push({
        title: '员工功能',
        items: [
          {
            icon: '📝',
            name: '写日报',
            desc: '填写项目进度日报',
            page: '/pages/employee/project-edit/index',
          },
          {
            icon: '📋',
            name: '历史记录',
            desc: '查看我的日报历史',
            page: '/pages/employee/project-history/index',
          },
        ],
      });
    }

    if (isAdmin) {
      // 管理员功能
      sections.push({
        title: '管理功能',
        items: [
          {
            icon: '✅',
            name: '审核',
            desc: '审核员工提交的日报',
            page: '/pages/admin/review-list/index',
          },
          {
            icon: '📊',
            name: '日报记录',
            desc: '查看所有日报数据',
            page: '/pages/admin/project-list/index',
          },
          {
            icon: '👥',
            name: '用户管理',
            desc: '管理员工账号和权限',
            page: '/pages/admin/user-manage/index',
          },
        ],
      });
    }

    this.setData({ sections });
  },

  onFeatureTap(e) {
    const dataset = e.currentTarget.dataset;
    console.log('[features] tap', dataset);
    const page = dataset.page;
    if (!page) {
      wx.showToast({ title: '页面路径为空', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: page });
  },
});
