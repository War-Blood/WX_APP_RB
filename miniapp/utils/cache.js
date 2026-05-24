// utils/cache.js - 数据缓存管理工具
// 提供统一的缓存管理，支持过期策略

/**
 * 缓存配置
 */
const CACHE_CONFIG = {
  // 用户信息缓存：30分钟过期
  USER_INFO: { key: 'cache_user_info', ttl: 30 * 60 * 1000 },
  // 审核统计缓存：5分钟过期
  REVIEW_STATS: { key: 'cache_review_stats', ttl: 5 * 60 * 1000 },
  // 审核列表缓存：3分钟过期
  REVIEW_LIST: { key: 'cache_review_list', ttl: 3 * 60 * 1000 },
  // 项目历史缓存：5分钟过期
  PROJECT_HISTORY: { key: 'cache_project_history', ttl: 5 * 60 * 1000 },
  // 项目列表缓存：5分钟过期
  PROJECT_LIST: { key: 'cache_project_list', ttl: 5 * 60 * 1000 },
};

/**
 * 缓存项结构
 * @typedef {Object} CacheItem
 * @property {*} data - 缓存数据
 * @property {number} expireAt - 过期时间戳
 * @property {string} version - 缓存版本（用于数据结构变更时失效旧缓存）
 */

const CACHE_VERSION = '1.0.0';

/**
 * 设置缓存
 * @param {string} key - 缓存键
 * @param {*} data - 缓存数据
 * @param {number} ttl - 过期时间（毫秒）
 */
function set(key, data, ttl) {
  try {
    const cacheItem = {
      data,
      expireAt: Date.now() + ttl,
      version: CACHE_VERSION,
    };
    wx.setStorageSync(key, cacheItem);
  } catch (e) {
    console.warn('[Cache] 设置缓存失败:', key, e);
  }
}

/**
 * 获取缓存
 * @param {string} key - 缓存键
 * @returns {*} 缓存数据，过期或不存在返回 null
 */
function get(key) {
  try {
    const cacheItem = wx.getStorageSync(key);
    if (!cacheItem) return null;

    // 检查版本
    if (cacheItem.version !== CACHE_VERSION) {
      remove(key);
      return null;
    }

    // 检查过期
    if (Date.now() > cacheItem.expireAt) {
      remove(key);
      return null;
    }

    return cacheItem.data;
  } catch (e) {
    console.warn('[Cache] 获取缓存失败:', key, e);
    return null;
  }
}

/**
 * 移除缓存
 * @param {string} key - 缓存键
 */
function remove(key) {
  try {
    wx.removeStorageSync(key);
  } catch (e) {
    console.warn('[Cache] 移除缓存失败:', key, e);
  }
}

/**
 * 清除所有缓存
 */
function clearAll() {
  try {
    Object.values(CACHE_CONFIG).forEach(config => {
      wx.removeStorageSync(config.key);
    });
    console.log('[Cache] 已清除所有缓存');
  } catch (e) {
    console.warn('[Cache] 清除缓存失败:', e);
  }
}

/**
 * 清除过期缓存
 */
function clearExpired() {
  try {
    Object.values(CACHE_CONFIG).forEach(config => {
      const cacheItem = wx.getStorageSync(config.key);
      if (cacheItem && Date.now() > cacheItem.expireAt) {
        wx.removeStorageSync(config.key);
      }
    });
  } catch (e) {
    console.warn('[Cache] 清除过期缓存失败:', e);
  }
}

// ==================== 业务缓存方法 ====================

/**
 * 缓存用户信息
 * @param {Object} userInfo - 用户信息
 */
function setUserInfo(userInfo) {
  set(CACHE_CONFIG.USER_INFO.key, userInfo, CACHE_CONFIG.USER_INFO.ttl);
}

/**
 * 获取缓存的用户信息
 * @returns {Object|null} 用户信息
 */
function getUserInfo() {
  return get(CACHE_CONFIG.USER_INFO.key);
}

/**
 * 缓存审核统计
 * @param {Object} stats - 统计数据 { pending, approved, rejected }
 */
function setReviewStats(stats) {
  set(CACHE_CONFIG.REVIEW_STATS.key, stats, CACHE_CONFIG.REVIEW_STATS.ttl);
}

/**
 * 获取缓存的审核统计
 * @returns {Object|null} 统计数据
 */
function getReviewStats() {
  return get(CACHE_CONFIG.REVIEW_STATS.key);
}

/**
 * 缓存审核列表
 * @param {string} status - 状态筛选
 * @param {Object} data - 列表数据 { list, total, page }
 */
function setReviewList(status, data) {
  const key = `${CACHE_CONFIG.REVIEW_LIST.key}_${status}`;
  set(key, data, CACHE_CONFIG.REVIEW_LIST.ttl);
}

/**
 * 获取缓存的审核列表
 * @param {string} status - 状态筛选
 * @returns {Object|null} 列表数据
 */
function getReviewList(status) {
  const key = `${CACHE_CONFIG.REVIEW_LIST.key}_${status}`;
  return get(key);
}

/**
 * 缓存项目历史
 * @param {string} fillerName - 填报人
 * @param {Object} data - 列表数据
 */
function setProjectHistory(fillerName, data) {
  const key = `${CACHE_CONFIG.PROJECT_HISTORY.key}_${fillerName}`;
  set(key, data, CACHE_CONFIG.PROJECT_HISTORY.ttl);
}

/**
 * 获取缓存的项目历史
 * @param {string} fillerName - 填报人
 * @returns {Object|null} 列表数据
 */
function getProjectHistory(fillerName) {
  const key = `${CACHE_CONFIG.PROJECT_HISTORY.key}_${fillerName}`;
  return get(key);
}

/**
 * 使缓存失效（用于数据更新后）
 * @param {string} type - 缓存类型 'user' | 'stats' | 'review' | 'project'
 */
function invalidate(type) {
  switch (type) {
    case 'user':
      remove(CACHE_CONFIG.USER_INFO.key);
      break;
    case 'stats':
      remove(CACHE_CONFIG.REVIEW_STATS.key);
      break;
    case 'review':
      // 清除所有审核列表缓存
      ['pending', 'approved', 'rejected'].forEach(status => {
        remove(`${CACHE_CONFIG.REVIEW_LIST.key}_${status}`);
      });
      break;
    case 'project':
      // 清除项目历史缓存需要遍历所有可能的 key
      // 这里简单处理：清除所有以 PROJECT_HISTORY.key 开头的缓存
      try {
        const info = wx.getStorageInfoSync();
        info.keys.forEach(key => {
          if (key.startsWith(CACHE_CONFIG.PROJECT_HISTORY.key)) {
            wx.removeStorageSync(key);
          }
        });
      } catch (e) {
        console.warn('[Cache] 清除项目缓存失败:', e);
      }
      break;
    default:
      clearAll();
  }
}

module.exports = {
  // 基础方法
  set,
  get,
  remove,
  clearAll,
  clearExpired,
  // 业务方法
  setUserInfo,
  getUserInfo,
  setReviewStats,
  getReviewStats,
  setReviewList,
  getReviewList,
  setProjectHistory,
  getProjectHistory,
  invalidate,
  // 配置
  CACHE_CONFIG,
};
