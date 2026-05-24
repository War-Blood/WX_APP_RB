// pages/profile/index.js - 我的（个人中心）
const { getUserInfo } = require('../../utils/auth');

Page({
  data: {
    userName: '',
    department: '',
    roleText: '',
    openid: '',
  },

  onShow() {
    this._loadUserInfo();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
  },

  _loadUserInfo() {
    const userInfo = getUserInfo();
    const name = userInfo.userName || '';
    this.setData({
      userName: name || '未设置',
      avatarChar: name.charAt(0) || '?',
      department: userInfo.department || '未设置',
      roleText: userInfo.isAdmin ? '管理员' : '员工',
      openid: userInfo.openid || '',
    });
  },

  // 修改姓名
  onEditName() {
    wx.showModal({
      title: '修改姓名',
      editable: true,
      placeholderText: '请输入姓名',
      content: this.data.userName === '未设置' ? '' : this.data.userName,
      success: (res) => {
        if (res.confirm && res.content) {
          this._updateProfile(res.content, this.data.department === '未设置' ? '' : this.data.department);
        }
      },
    });
  },

  // 修改部门
  onEditDept() {
    wx.showModal({
      title: '修改部门',
      editable: true,
      placeholderText: '请输入部门名称',
      content: this.data.department === '未设置' ? '' : this.data.department,
      success: (res) => {
        if (res.confirm && res.content) {
          this._updateProfile(
            this.data.userName === '未设置' ? '' : this.data.userName,
            res.content
          );
        }
      },
    });
  },

  async _updateProfile(userName, department) {
    try {
      const { updateProfile } = require('../../app');
      const updated = await updateProfile(userName, department);
      this.setData({
        userName: updated.userName || '未设置',
        department: updated.department || '未设置',
      });
      wx.showToast({ title: '更新成功', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: err.message || '更新失败', icon: 'none' });
    }
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.redirectTo({ url: '/pages/test-entry/index' });
        }
      },
    });
  },

  // 复制openid
  onCopyOpenid() {
    if (this.data.openid) {
      wx.setClipboardData({
        data: this.data.openid,
        success: () => wx.showToast({ title: '已复制', icon: 'success' }),
      });
    }
  },
});
