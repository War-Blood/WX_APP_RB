// app.js
// 腾讯云后端 API 版（不再依赖微信云开发）

const BASE_URL = 'https://warblood.online';

App({
  globalData: {
    userInfo: null,
    isAdmin: false,
    openid: '',
  },

  onLaunch() {
    // 恢复本地缓存登录态
    const userInfo = wx.getStorageSync('user_info');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
      this.globalData.openid = userInfo.openid || '';
      this.globalData.isAdmin = userInfo.isAdmin || false;
    }
  },
});

/**
 * 小程序登录（获取 openid + 注册）
 * 返回 userInfo 对象
 */
function wxLogin() {
  return new Promise((resolve, reject) => {
    // 1. 微信登录获取 code
    wx.login({
      success(loginRes) {
        if (!loginRes.code) {
          return reject({ message: '微信登录失败，无 code' });
        }

        // 2. 调用 wx.getUserProfile 获取用户信息
        wx.getUserProfile({
          desc: '用于完善用户资料',
          success(userRes) {
            // 3. 构造 userInfo（后端根据 openid 识别用户）
            const userInfo = {
              nickName: userRes.userInfo.nickName,
              avatarUrl: userRes.userInfo.avatarUrl,
              gender: userRes.userInfo.gender,
              country: userRes.userInfo.country,
              province: userRes.userInfo.province,
              city: userRes.userInfo.city,
              openid: '',   // 后端从 code 换取后返回
              isAdmin: false,
              userName: userRes.userInfo.nickName,
              department: '',
            };

            // 4. 调用后端登录接口
            wx.request({
              url: BASE_URL + '/api/login',
              method: 'POST',
              header: { 'Content-Type': 'application/json' },
              data: { openid: loginRes.code }, // 临时用 code，实际由后端处理
              success(res) {
                if (res.statusCode === 200 && res.data && res.data.code === 0) {
                  const data = res.data.data;
                  const finalUserInfo = {
                    ...userInfo,
                    openid: data.openid,
                    isAdmin: data.isAdmin,
                    userName: data.userName || userInfo.nickName,
                    department: data.department || '',
                  };
                  wx.setStorageSync('user_info', finalUserInfo);
                  resolve(finalUserInfo);
                } else {
                  reject({ message: (res.data && res.data.message) || '登录失败' });
                }
              },
              fail(err) {
                reject({ message: '网络错误，登录失败' });
              },
            });
          },
          fail() {
            // 用户拒绝授权，仍然可以用 code 匿名登录
            wx.login({
              success(loginRes2) {
                wx.request({
                  url: BASE_URL + '/api/login',
                  method: 'POST',
                  header: { 'Content-Type': 'application/json' },
                  data: { openid: loginRes2.code },
                  success(res) {
                    if (res.statusCode === 200 && res.data && res.data.code === 0) {
                      const data = res.data.data;
                      const anonymousUser = {
                        openid: data.openid,
                        isAdmin: data.isAdmin,
                        userName: '',
                        department: '',
                      };
                      wx.setStorageSync('user_info', anonymousUser);
                      resolve(anonymousUser);
                    } else {
                      reject({ message: '登录失败' });
                    }
                  },
                  fail() {
                    reject({ message: '网络错误' });
                  },
                });
              },
            });
          },
        });
      },
      fail() {
        reject({ message: '微信登录失败' });
      },
    });
  });
}

/**
 * 更新用户资料（姓名+部门）
 */
function updateProfile(userName, department) {
  return new Promise((resolve, reject) => {
    const userInfo = wx.getStorageSync('user_info') || {};
    wx.request({
      url: BASE_URL + '/api/user/profile',
      method: 'PUT',
      header: { 'Content-Type': 'application/json' },
      data: { openid: userInfo.openid, userName, department },
      success(res) {
        if (res.data && res.data.code === 0) {
          const updated = { ...userInfo, userName, department };
          wx.setStorageSync('user_info', updated);
          resolve(updated);
        } else {
          reject({ message: res.data && res.data.message });
        }
      },
      fail() {
        reject({ message: '网络错误' });
      },
    });
  });
}

module.exports = { wxLogin, updateProfile };
