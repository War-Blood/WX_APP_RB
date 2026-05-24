// services/project.js - 项目进度日报服务
// 使用统一请求封装，避免重复代码

const { post, getUserInfo } = require('../utils/request');
const { apiPaths, storageKeys } = require('../config/index');
const cache = require('../utils/cache');

/**
 * 获取我的项目日报列表（带缓存）
 * @param {Object} [params={}] - 查询参数
 * @param {string} [params.fillerName] - 填报人姓名
 * @param {string} [params.dailyTimeStart] - 开始日期
 * @param {string} [params.dailyTimeEnd] - 结束日期
 * @param {string} [params.projectName] - 项目名称
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.pageSize=10] - 每页数量
 * @param {boolean} [params.forceRefresh=false] - 是否强制刷新
 * @returns {Promise<Object>} 项目日报列表数据
 */
const getList = (params = {}) => {
  const { forceRefresh = false, ...queryParams } = params;
  
  // 只有第一页且无筛选条件时才使用缓存
  const canUseCache = !forceRefresh && 
    (queryParams.page || 1) === 1 && 
    !queryParams.projectName && 
    !queryParams.dailyTimeStart && 
    !queryParams.dailyTimeEnd;

  if (canUseCache && queryParams.fillerName) {
    const cachedData = cache.getProjectHistory(queryParams.fillerName);
    if (cachedData) {
      return Promise.resolve(cachedData);
    }
  }

  return post(apiPaths.project.list, {
    fillerName: queryParams.fillerName || '',
    dailyTimeStart: queryParams.dailyTimeStart || '',
    dailyTimeEnd: queryParams.dailyTimeEnd || '',
    projectName: queryParams.projectName || '',
    page: queryParams.page || 1,
    pageSize: queryParams.pageSize || 10,
  }).then(result => {
    // 缓存第一页结果
    if (canUseCache && queryParams.fillerName) {
      cache.setProjectHistory(queryParams.fillerName, result);
    }
    return result;
  });
};

/**
 * 获取项目日报详情
 * @param {number} id - 项目日报 ID
 * @returns {Promise<Object>} 项目日报详情数据
 */
const getDetail = (id) => {
  return post(apiPaths.project.detail, { id });
};

/**
 * 获取项目维度统计
 * @param {Object} [params={}] - 查询参数
 * @param {string} [params.projectName] - 项目名称
 * @param {string} [params.dailyTimeStart] - 开始日期
 * @param {string} [params.dailyTimeEnd] - 结束日期
 * @returns {Promise<Object>} 项目统计数据
 */
const getStats = (params = {}) => {
  return post(apiPaths.project.stats, {
    projectName: params.projectName || '',
    dailyTimeStart: params.dailyTimeStart || '',
    dailyTimeEnd: params.dailyTimeEnd || '',
  });
};

/**
 * 提交项目日报
 * @param {string} action - 操作类型 'create' | 'update' | 'delete'
 * @param {Object} [data={}] - 项目日报数据
 * @param {number} [data.id] - 更新/删除时需要传入
 * @returns {Promise<Object>} 提交结果
 */
const submit = (action, data = {}) => {
  const userInfo = getUserInfo();
  return post(apiPaths.project.submit, {
    action,
    openid: userInfo.openid,
    userName: userInfo.userName || userInfo.nickName || '',
    data,
  });
};

/**
 * 获取草稿（当天或最新）
 * @param {string} [dailyTime] - 指定日期（可选）
 * @returns {Promise<Object>} 草稿数据
 */
const getDraft = (dailyTime) => {
  const userInfo = getUserInfo();
  return post(apiPaths.project.submit, {
    action: 'getDraft',
    openid: userInfo.openid,
    userName: userInfo.userName || userInfo.nickName || '',
    dailyTime: dailyTime || '',
  });
};

/**
 * 获取用户最近一条日报（用于新建时预填充）
 * @param {string} userName - 用户姓名
 * @returns {Promise<Object>} 最近一条日报数据
 */
const getLastRecord = (userName) => {
  return post(apiPaths.project.lastRecord, { userName });
};

/**
 * 驳回重提：将驳回的日报重新提交为待审核
 * @param {number} id - 项目日报 ID
 * @returns {Promise<Object>} 操作结果
 */
const resubmitRejected = (id) => {
  return post(apiPaths.project.resubmitStatus, { id });
};

// ==================== 本地草稿 ====================

/**
 * 保存本地草稿（防抖用，自动汇总所有字段）
 * @param {Object} data - 草稿数据
 */
const saveLocalDraft = (data) => {
  wx.setStorageSync(storageKeys.projectDraft, {
    data,
    savedAt: new Date().toISOString(),
  });
};

/**
 * 读取本地草稿
 * @returns {Object|null} 草稿数据，无草稿返回 null
 */
const getLocalDraft = () => {
  return wx.getStorageSync(storageKeys.projectDraft) || null;
};

/**
 * 清除本地草稿
 */
const clearLocalDraft = () => {
  wx.removeStorageSync(storageKeys.projectDraft);
};

module.exports = {
  getList,
  getDetail,
  getStats,
  submit,
  getDraft,
  getLastRecord,
  resubmitRejected,
  saveLocalDraft,
  getLocalDraft,
  clearLocalDraft,
};
