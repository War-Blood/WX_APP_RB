// utils/date.js - 日期时间工具函数

/**
 * 格式化时间戳为日期时间字符串
 * @param {Date|number|string} ts - 时间戳或日期对象
 * @returns {string} 格式化后的日期时间字符串 (YYYY-MM-DD HH:mm)
 */
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
    + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param {Date|string} date - 日期对象或日期字符串
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

/**
 * 获取今天的日期字符串 (YYYY-MM-DD)
 * @returns {string} 日期字符串
 */
function getToday() {
  const today = new Date();
  return formatDate(today);
}

/**
 * 从日期时间中提取日期部分
 * @param {Date|string} datetime - 日期时间
 * @returns {string} 日期部分 (YYYY-MM-DD)
 */
function extractDate(datetime) {
  if (!datetime) return '';
  return String(datetime).substring(0, 10);
}

module.exports = {
  formatTime,
  formatDate,
  getToday,
  extractDate,
};
