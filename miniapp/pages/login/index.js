// pages/login/index.js
// 腾讯云后端 API 版

const app = getApp();
const { wxLogin } = require('../../app.js');

Page({
  data: {
    loading: false,
  },

  onLoad() {
    // 如果已登录，直接跳转
    const userInfo = wx.getStorageSync('user_info');
    if (userInfo && userInfo.openid) {
      this._redirectAfterLogin(userInfo);
    }
  },

  // 点击登录按钮
  async onLoginTap() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const userInfo = await wxLogin();

      getApp().globalData.userInfo = userInfo;
      getApp().globalData.openid = userInfo.openid;
      getApp().globalData.isAdmin = userInfo.isAdmin;

      wx.showToast({ title: '登录成功', icon: 'success', duration: 1000 });

      setTimeout(() => {
        this._redirectAfterLogin(userInfo);
      }, 800);
    } catch (err) {
      console.error('登录失败', err);
      wx.showToast({ title: err.message || '登录失败，请重试', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 登录后跳转
  _redirectAfterLogin(userInfo) {
    wx.switchTab({ url: '/pages/home/index' });
  },
});
