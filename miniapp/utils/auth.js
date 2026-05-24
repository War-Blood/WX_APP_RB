// utils/auth.js - 角色权限工具

/**
 * 获取当前用户信息
 * @returns {Object} 用户信息对象
 * @returns {string} [returns.openid] - 用户唯一标识
 * @returns {string} [returns.userName] - 用户姓名
 * @returns {boolean} [returns.isAdmin] - 是否为管理员
 */
function getUserInfo() {
  return wx.getStorageSync('user_info') || {};
}

/**
 * 判断当前用户是否为员工（非管理员）
 * @returns {boolean} true 表示是员工，false 表示是管理员
 */
function isEmployee() {
  return !getUserInfo().isAdmin;
}

/**
 * 判断当前用户是否为管理员
 * @returns {boolean} true 表示是管理员，false 表示是员工
 */
function isAdmin() {
  return !!getUserInfo().isAdmin;
}

/**
 * 获取当前用户 openid
 * @returns {string} 用户 openid，未登录返回空字符串
 */
function getOpenid() {
  return getUserInfo().openid || '';
}

/**
 * 获取当前用户姓名
 * @returns {string} 用户姓名，未设置返回空字符串
 */
function getUserName() {
  return getUserInfo().userName || getUserInfo().nickName || '';
}

/**
 * 获取当前用户的访问令牌
 * @returns {string} access_token，未登录返回空字符串
 */
function getToken() {
  return wx.getStorageSync('access_token') || '';
}

/**
 * 页面角色守卫
 * 在页面的 onShow 中调用，如果角色不匹配则自动跳转到正确的首页
 * @param {'employee' | 'admin'} requiredRole - 要求的角色
 * @returns {boolean} true 表示通过，false 表示被拦截
 */
function checkRole(requiredRole) {
  const userInfo = getUserInfo();
  if (!userInfo || !userInfo.openid) {
    // 未登录 → 跳转测试入口
    wx.redirectTo({ url: '/pages/test-entry/index' });
    return false;
  }

  const currentIsAdmin = !!userInfo.isAdmin;

  if (requiredRole === 'employee' && currentIsAdmin) {
    // 管理员不能访问员工页 → 跳到首页
    wx.switchTab({ url: '/pages/home/index' });
    return false;
  }

  if (requiredRole === 'admin' && !currentIsAdmin) {
    // 员工不能访问管理页 → 跳到首页
    wx.switchTab({ url: '/pages/home/index' });
    return false;
  }

  return true;
}

/**
 * 获取当前角色的首页
 */
function getHomePage() {
  return '/pages/home/index';
}

/**
 * 员工 Tab 列表
 * @constant {string[]}
 */
const EMPLOYEE_TABS = [
  '/pages/employee/project-edit/index',
  '/pages/employee/project-history/index',
];

/**
 * 管理员 Tab 列表
 * @constant {string[]}
 */
const ADMIN_TABS = [
  '/pages/admin/review-list/index',
  '/pages/admin/project-list/index',
  '/pages/admin/user-manage/index',
];

/**
 * 获取当前角色的 Tab 列表
 * @returns {string[]} Tab 页面路径数组
 */
function getRoleTabs() {
  return isAdmin() ? ADMIN_TABS : EMPLOYEE_TABS;
}

/**
 * 状态文字映射
 * @constant {Object.<string, string>}
 */
const STATUS_MAP = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

/**
 * 获取状态文字
 * @param {string} status - 状态值 (pending/approved/rejected)
 * @returns {string} 状态文字描述
 */
function getStatusText(status) {
  return STATUS_MAP[status] || '未知';
}

/**
 * 获取状态对应的样式类名
 * @param {string} status - 状态值
 * @returns {string} CSS 类名
 */
function getStatusClass(status) {
  return 'status-' + (status || 'pending');
}

module.exports = {
  getUserInfo,
  isEmployee,
  isAdmin,
  getOpenid,
  getUserName,
  getToken,
  checkRole,
  getHomePage,
  getRoleTabs,
  EMPLOYEE_TABS,
  ADMIN_TABS,
  STATUS_MAP,
  getStatusText,
  getStatusClass,
};
