// services/report.js - 日报相关服务
// 使用统一请求封装，避免重复代码

const { post, getUserInfo } = require('../utils/request');
const { apiPaths, storageKeys } = require('../config/index');
const { getToday } = require('../utils/date');

/**
 * 获取最近一次日报（用于预填）
 * @returns {Promise<Object>} 最近一次日报数据
 */
const getLatest = () => {
  const userInfo = getUserInfo();
  return post(apiPaths.report.submit, {
    action: 'getLastReport',
    openid: userInfo.openid,
  });
};

/**
 * 获取历史日报列表
 * @param {string} [status=''] - 筛选状态（可选）
 * @param {number} [page=1] - 页码
 * @param {number} [pageSize=10] - 每页数量
 * @returns {Promise<Object>} 日报列表数据
 */
const getList = (status = '', page = 1, pageSize = 10) => {
  const userInfo = getUserInfo();
  return post(apiPaths.report.list, {
    openid: userInfo.openid,
    status,
    page,
    pageSize,
  });
};

/**
 * 获取日报详情
 * @param {number} reportId - 日报 ID
 * @returns {Promise<Object>} 日报详情数据
 */
const getDetail = (reportId) => {
  return post(apiPaths.report.detail, { reportId });
};

/**
 * 提交日报（新建）
 * @param {Object} content - 日报内容
 * @param {string} content.todayDone - 今日完成
 * @param {string} content.tomorrowPlan - 明日计划
 * @param {string} content.blockers - 遇到问题
 * @param {string} content.remarks - 备注
 * @returns {Promise<Object>} 提交结果
 */
const submit = (content) => {
  const userInfo = getUserInfo();
  const reportDate = getToday();
  return post(apiPaths.report.submit, {
    action: 'create',
    openid: userInfo.openid,
    userName: userInfo.userName || '',
    department: userInfo.department || '',
    reportDate,
    content,
  });
};

/**
 * 更新日报（草稿更新）
 * @param {number} reportId - 日报 ID
 * @param {Object} content - 日报内容
 * @returns {Promise<Object>} 更新结果
 */
const updateReport = (reportId, content) => {
  const userInfo = getUserInfo();
  return post(apiPaths.report.submit, {
    action: 'update',
    openid: userInfo.openid,
    reportId,
    content,
  });
};

/**
 * 重提被驳回的日报
 * @param {number} reportId - 日报 ID
 * @param {Object} content - 日报内容
 * @returns {Promise<Object>} 重提结果
 */
const resubmit = (reportId, content) => {
  const userInfo = getUserInfo();
  return post(apiPaths.report.submit, {
    action: 'resubmit',
    openid: userInfo.openid,
    reportId,
    content,
  });
};

// ==================== 本地草稿 ====================

/**
 * 保存草稿到本地存储
 * @param {Object} content - 草稿内容
 */
const saveDraft = (content) => {
  wx.setStorageSync(storageKeys.reportDraft, {
    content,
    savedAt: new Date().toISOString(),
  });
};

/**
 * 获取本地草稿
 * @returns {Object|null} 草稿数据，无草稿返回 null
 */
const getDraft = () => {
  return wx.getStorageSync(storageKeys.reportDraft) || null;
};

/**
 * 清除本地草稿
 */
const clearDraft = () => {
  wx.removeStorageSync(storageKeys.reportDraft);
};

module.exports = {
  getLatest,
  getList,
  getDetail,
  submit,
  updateReport,
  resubmit,
  saveDraft,
  getDraft,
  clearDraft,
};
