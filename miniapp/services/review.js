// services/review.js - 项目日报审核服务
// 使用统一请求封装，避免重复代码

const { post, getUserInfo } = require('../utils/request');
const { apiPaths } = require('../config/index');
const cache = require('../utils/cache');

/**
 * 获取审核统计（带缓存）
 * @param {boolean} [forceRefresh=false] - 是否强制刷新
 * @returns {Promise<Object>} 统计数据 { pending, approved, rejected }
 */
const getStats = (forceRefresh = false) => {
  // 先检查缓存
  if (!forceRefresh) {
    const cachedStats = cache.getReviewStats();
    if (cachedStats) {
      return Promise.resolve(cachedStats);
    }
  }

  return post(apiPaths.project.reviewStats).then(stats => {
    cache.setReviewStats(stats);
    return stats;
  });
};

/**
 * 获取审核列表（带缓存）
 * @param {string} [status='pending'] - 状态筛选 'pending' | 'approved' | 'rejected'
 * @param {Object} [filters={}] - 筛选条件
 * @param {string} [filters.projectName] - 项目名称
 * @param {string} [filters.fillerName] - 填报人姓名
 * @param {number} [page=1] - 页码
 * @param {number} [pageSize=10] - 每页数量
 * @param {boolean} [forceRefresh=false] - 是否强制刷新
 * @returns {Promise<Object>} 审核列表数据
 */
const getList = (status = 'pending', filters = {}, page = 1, pageSize = 10, forceRefresh = false) => {
  // 只有第一页才使用缓存
  if (page === 1 && !forceRefresh && !filters.projectName && !filters.fillerName) {
    const cachedList = cache.getReviewList(status);
    if (cachedList) {
      return Promise.resolve(cachedList);
    }
  }

  return post(apiPaths.project.reviewList, {
    status,
    projectName: filters.projectName || '',
    fillerName: filters.fillerName || '',
    page,
    pageSize,
  }).then(result => {
    // 缓存第一页结果
    if (page === 1 && !filters.projectName && !filters.fillerName) {
      cache.setReviewList(status, result);
    }
    return result;
  });
};

/**
 * 获取项目日报详情（审核用）
 * @param {number} id - 项目日报 ID
 * @returns {Promise<Object>} 日报详情数据
 */
const getDetail = (id) => {
  return post(apiPaths.project.reviewDetail, { id });
};

/**
 * 审核通过
 * @param {number} id - 项目日报 ID
 * @param {string} [note=''] - 审核备注
 * @returns {Promise<Object>} 操作结果
 */
const approve = (id, note = '') => {
  const userInfo = getUserInfo();
  return post(apiPaths.project.reviewAction, {
    action: 'approve',
    id,
    reviewerId: userInfo.openid,
    reviewNote: note,
  }).then(result => {
    // 清除相关缓存
    cache.invalidate('stats');
    cache.invalidate('review');
    return result;
  });
};

/**
 * 审核驳回
 * @param {number} id - 项目日报 ID
 * @param {string} [reason=''] - 驳回原因
 * @returns {Promise<Object>} 操作结果
 */
const reject = (id, reason = '') => {
  const userInfo = getUserInfo();
  return post(apiPaths.project.reviewAction, {
    action: 'reject',
    id,
    reviewerId: userInfo.openid,
    reviewNote: reason,
  }).then(result => {
    // 清除相关缓存
    cache.invalidate('stats');
    cache.invalidate('review');
    return result;
  });
};

// ==================== 管理员管理 ====================

/**
 * 获取用户列表
 * @param {number} [page=1] - 页码
 * @param {number} [pageSize=20] - 每页数量
 * @param {string} [keyword=''] - 搜索关键词
 * @returns {Promise<Object>} 用户列表数据
 */
const getUserList = (page = 1, pageSize = 20, keyword = '') => {
  return post(apiPaths.admin.users, { page, pageSize, keyword });
};

/**
 * 获取管理员列表
 * @returns {Promise<Array>} 管理员列表
 */
const getAdminList = () => {
  return post(apiPaths.admin.list);
};

/**
 * 设置用户管理员权限
 * @param {string} targetOpenid - 目标用户 openid
 * @param {boolean} [isAdmin=true] - 是否设为管理员
 * @returns {Promise<Object>} 操作结果
 */
const setAdmin = (targetOpenid, isAdmin = true) => {
  return post(apiPaths.admin.setAdmin, { targetOpenid, isAdmin });
};

/**
 * 初始化首个管理员
 * @param {string} openid - 用户 openid
 * @returns {Promise<Object>} 操作结果
 */
const initFirstAdmin = (openid) => {
  return post(apiPaths.admin.initFirst, { openid });
};

/**
 * 删除日报（管理员权限）
 * @param {number} id - 日报 ID
 * @returns {Promise<Object>} 操作结果
 */
const deleteReport = (id) => {
  return post(apiPaths.project.delete, { id }).then(result => {
    // 清除相关缓存
    cache.invalidate('stats');
    cache.invalidate('review');
    return result;
  });
};

module.exports = {
  getStats,
  getList,
  getDetail,
  approve,
  reject,
  getUserList,
  getAdminList,
  setAdmin,
  initFirstAdmin,
  deleteReport,
};
