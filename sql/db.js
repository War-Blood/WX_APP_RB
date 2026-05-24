// sql/db.js - 后端 MySQL 连接池工具
// 使用环境变量配置，安全可靠

const mysql = require('mysql2/promise');

let pool = null;

/**
 * 获取 MySQL 连接池（单例）
 * 环境变量：
 *   MYSQL_HOST     - MySQL 服务器地址
 *   MYSQL_PORT     - 端口，默认 3306
 *   MYSQL_USER     - 用户名
 *   MYSQL_PASSWORD - 密码
 *   MYSQL_DATABASE - 数据库名
 */
function getPool() {
  if (pool) return pool;

  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = parseInt(process.env.MYSQL_PORT || '3306', 10);
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'daily_report';

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    timezone: '+08:00',
    dateStrings: false,
  });

  console.log(`[MySQL] 连接池已创建: ${host}:${port}/${database}`);
  return pool;
}

/**
 * 执行 SQL 查询（SELECT）
 * @param {string} sql - SQL 语句（使用 ? 占位符）
 * @param {Array} params - 参数数组
 * @returns {Promise<Array>} 查询结果行
 */
async function query(sql, params = []) {
  const p = getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

/**
 * 执行单行查询（SELECT ONE）
 * @param {string} sql - SQL 语句（使用 ? 占位符）
 * @param {Array} [params=[]] - 参数数组
 * @returns {Promise<Object|null>} 查询结果行，无结果返回 null
 */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

/**
 * 执行 INSERT / UPDATE / DELETE
 * @param {string} sql - SQL 语句
 * @param {Array} params - 参数数组
 * @returns {Promise<Object>} { affectedRows, insertId }
 */
async function execute(sql, params = []) {
  const p = getPool();
  const [result] = await p.execute(sql, params);
  return {
    affectedRows: result.affectedRows,
    insertId: result.insertId,
  };
}

/**
 * 测试数据库连接
 * @returns {Promise<boolean>} 连接是否成功
 */
async function testConnection() {
  try {
    const p = getPool();
    await p.execute('SELECT 1');
    console.log('[MySQL] 连接测试成功');
    return true;
  } catch (err) {
    console.error('[MySQL] 连接测试失败:', err.message);
    return false;
  }
}

/**
 * 关闭连接池
 * @returns {Promise<void>}
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[MySQL] 连接池已关闭');
  }
}

module.exports = {
  query,
  queryOne,
  execute,
  getPool,
  closePool,
  testConnection,
};
