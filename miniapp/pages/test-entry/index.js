// pages/test-entry/index.js
// 临时测试入口 — 域名上线后可移除此页面

const app = getApp();

Page({
  data: {
    currentRole: '', // 当前已选角色
  },

  onShow() {
    // 检查是否已经选择过角色
    const userInfo = wx.getStorageSync('user_info') || {};
    if (userInfo && userInfo.openid) {
      this.setData({
        currentRole: userInfo.isAdmin ? 'admin' : 'employee',
      });
    }
  },

  /**
   * 选择角色进入
   * @param {string} role - 'employee' | 'admin'
   */
  enterAs(role) {
    // 构造 mock 用户信息
    const isAdmin = role === 'admin';
    const mockUser = {
      openid: isAdmin ? 'test_admin_001' : 'test_employee_001',
      nickName: isAdmin ? '测试管理员' : '测试员工',
      userName: isAdmin ? '测试管理员' : '测试员工',
      avatarUrl: '',
      isAdmin: isAdmin,
      department: isAdmin ? '管理部' : '工程部',
    };

    // 写入本地缓存 + 全局数据
    wx.setStorageSync('user_info', mockUser);
    app.globalData.userInfo = mockUser;
    app.globalData.openid = mockUser.openid;
    app.globalData.isAdmin = mockUser.isAdmin;

    wx.showToast({
      title: isAdmin ? '已切换为管理员' : '已切换为员工',
      icon: 'success',
      duration: 1000,
    });

    setTimeout(() => {
      wx.switchTab({ url: '/pages/home/index' });
    }, 1000);
  },

  onTapEmployee() {
    this.enterAs('employee');
  },

  onTapAdmin() {
    this.enterAs('admin');
  },

  // 清除登录态，重新选择
  onClearAuth() {
    wx.removeStorageSync('user_info');
    app.globalData.userInfo = null;
    app.globalData.openid = '';
    app.globalData.isAdmin = false;
    this.setData({ currentRole: '' });
    wx.showToast({ title: '已清除登录态', icon: 'none' });
  },
});
