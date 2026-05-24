// cloudfunctions/common/auth.js
// 权限检查共享模块

/**
 * 检查用户是否为管理员
 * @param {mysql.Pool} pool - MySQL 连接池
 * @param {string} openid - 用户 openid
 * @returns {Promise<boolean>} 是否为管理员
 */
const checkAdmin = async (pool, openid) => {
  const [rows] = await pool.execute(
    'SELECT is_admin FROM users WHERE openid = ?',
    [openid]
  );
  return rows.length > 0 && !!rows[0].is_admin;
};

/**
 * 检查用户是否存在
 * @param {mysql.Pool} pool - MySQL 连接池
 * @param {string} openid - 用户 openid
 * @returns {Promise<boolean>} 用户是否存在
 */
const userExists = async (pool, openid) => {
  const [rows] = await pool.execute(
    'SELECT openid FROM users WHERE openid = ?',
    [openid]
  );
  return rows.length > 0;
};

/**
 * 获取用户信息
 * @param {mysql.Pool} pool - MySQL 连接池
 * @param {string} openid - 用户 openid
 * @returns {Promise<Object|null>} 用户信息对象
 */
const getUserInfo = async (pool, openid) => {
  const [rows] = await pool.execute(
    'SELECT openid, user_name, department, is_admin, created_at FROM users WHERE openid = ?',
    [openid]
  );
  return rows[0] || null;
};

/**
 * 管理员权限中间件
 * @param {mysql.Pool} pool - MySQL 连接池
 * @param {string} openid - 用户 openid
 * @returns {Promise<Object>} { success: boolean, message: string }
 */
const requireAdmin = async (pool, openid) => {
  const isAdmin = await checkAdmin(pool, openid);
  if (!isAdmin) {
    return { success: false, message: '无管理员权限', code: 403 };
  }
  return { success: true, message: '' };
};

/**
 * 检查日报所有权
 * @param {mysql.Pool} pool - MySQL 连接池
 * @param {number} reportId - 日报 ID
 * @param {string} openid - 用户 openid
 * @returns {Promise<boolean>} 是否是日报所有者
 */
const checkReportOwner = async (pool, reportId, openid) => {
  const [rows] = await pool.execute(
    'SELECT user_id FROM daily_reports WHERE report_id = ?',
    [reportId]
  );
  return rows.length > 0 && rows[0].user_id === openid;
};

/**
 * 检查项目日报所有权
 * @param {mysql.Pool} pool - MySQL 连接池
 * @param {number} id - 项目日报 ID
 * @param {string} fillerName - 填报人姓名
 * @returns {Promise<boolean>} 是否是项目日报所有者
 */
const checkProjectReportOwner = async (pool, id, fillerName) => {
  const [rows] = await pool.execute(
    'SELECT filler_name FROM project_daily WHERE id = ?',
    [id]
  );
  return rows.length > 0 && rows[0].filler_name === fillerName;
};

module.exports = {
  checkAdmin,
  userExists,
  getUserInfo,
  requireAdmin,
  checkReportOwner,
  checkProjectReportOwner,
};
