// cloudfunctions/common/mysql.js
// 微信云函数 MySQL 连接池共享模块
// 单例模式 + 连接池状态监控

const mysql = require('mysql2/promise');

/**
 * 连接池单例管理器
 * 使用闭包实现线程安全的懒加载
 */
const ConnectionPoolManager = (function () {
  // 私有变量
  let pool = null;
  let isInitializing = false;
  let initPromise = null;

  // 连接池状态
  const status = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
    lastError: null,
    createdAt: null,
    requestCount: 0,
    errorCount: 0,
  };

  /**
   * 创建连接池配置
   * @returns {Object} 连接池配置
   */
  function createPoolConfig() {
    return {
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'daily_report',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 30000,
      timezone: '+08:00',
      dateStrings: false,
    };
  }

  /**
   * 初始化连接池（线程安全）
   * @returns {Promise<mysql.Pool>}
   */
  async function initialize() {
    // 双重检查锁定模式
    if (pool) {
      return pool;
    }

    // 防止并发初始化
    if (isInitializing && initPromise) {
      return initPromise;
    }

    isInitializing = true;
    initPromise = (async () => {
      try {
        const config = createPoolConfig();
        pool = mysql.createPool(config);
        status.createdAt = new Date().toISOString();
        status.totalConnections = config.connectionLimit;

        // 监听连接池事件
        pool.on('connection', (connection) => {
          status.totalConnections++;
        });

        pool.on('acquire', (connection) => {
          status.activeConnections++;
          status.requestCount++;
        });

        pool.on('release', (connection) => {
          status.activeConnections = Math.max(0, status.activeConnections - 1);
        });

        pool.on('enqueue', () => {
          status.waitingRequests++;
        });

        return pool;
      } catch (error) {
        status.lastError = error.message;
        status.errorCount++;
        isInitializing = false;
        initPromise = null;
        throw error;
      }
    })();

    try {
      await initPromise;
      isInitializing = false;
      return pool;
    } catch (error) {
      isInitializing = false;
      initPromise = null;
      throw error;
    }
  }

  return {
    /**
     * 获取连接池实例（懒加载）
     * @returns {mysql.Pool}
     */
    getPool() {
      if (pool) return pool;
      // 同步返回，异步初始化在首次调用时完成
      initialize();
      return pool;
    },

    /**
     * 异步获取连接池（确保初始化完成）
     * @returns {Promise<mysql.Pool>}
     */
    async getPoolAsync() {
      return await initialize();
    },

    /**
     * 获取连接池状态
     * @returns {Object} 状态对象
     */
    getStatus() {
      return { ...status };
    },

    /**
     * 检查连接池健康状态
     * @returns {Promise<Object>} 健康检查结果
     */
    async healthCheck() {
      try {
        if (!pool) {
          return { healthy: false, message: '连接池未初始化' };
        }

        const start = Date.now();
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        const latency = Date.now() - start;

        return {
          healthy: true,
          latency,
          message: '连接正常',
          status: this.getStatus(),
        };
      } catch (error) {
        status.lastError = error.message;
        status.errorCount++;
        return {
          healthy: false,
          message: error.message,
          status: this.getStatus(),
        };
      }
    },

    /**
     * 关闭连接池
     * @returns {Promise<void>}
     */
    async close() {
      if (pool) {
        await pool.end();
        pool = null;
        isInitializing = false;
        initPromise = null;
        // 重置状态
        status.totalConnections = 0;
        status.activeConnections = 0;
        status.idleConnections = 0;
        status.waitingRequests = 0;
      }
    },

    /**
     * 重置连接池（用于错误恢复）
     * @returns {Promise<mysql.Pool>}
     */
    async reset() {
      await this.close();
      return await initialize();
    },
  };
})();

/**
 * 获取 MySQL 连接池（单例）
 * 环境变量：
 *   MYSQL_HOST     - MySQL 服务器地址
 *   MYSQL_PORT     - 端口，默认 3306
 *   MYSQL_USER     - 用户名
 *   MYSQL_PASSWORD - 密码
 *   MYSQL_DATABASE - 数据库名
 * @returns {mysql.Pool} MySQL 连接池
 */
function getPool() {
  return ConnectionPoolManager.getPool();
}

/**
 * 执行 SQL 查询（SELECT）
 * @param {string} sql - SQL 语句（使用 ? 占位符）
 * @param {Array} params - 参数数组
 * @returns {Promise<Array>} 查询结果行
 */
async function query(sql, params = []) {
  const pool = await ConnectionPoolManager.getPoolAsync();
  const [rows] = await pool.execute(sql, params);
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
  const pool = await ConnectionPoolManager.getPoolAsync();
  const [result] = await pool.execute(sql, params);
  return {
    affectedRows: result.affectedRows,
    insertId: result.insertId,
  };
}

/**
 * 关闭连接池（云函数实例复用时可选调用）
 * @returns {Promise<void>}
 */
async function closePool() {
  await ConnectionPoolManager.close();
}

/**
 * 检查用户是否为管理员
 * @param {mysql.Pool} p - 连接池（可选，不传则自动获取）
 * @param {string} openid - 用户 openid
 * @returns {Promise<boolean>} 是否为管理员
 */
async function checkAdmin(p, openid) {
  const pool = p || (await ConnectionPoolManager.getPoolAsync());
  const [rows] = await pool.execute('SELECT is_admin FROM users WHERE openid = ?', [openid]);
  return rows.length > 0 && !!rows[0].is_admin;
}

/**
 * 获取今天的日期字符串 (YYYY-MM-DD)
 * @returns {string} 日期字符串
 */
function getToday() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

/**
 * 获取连接池状态
 * @returns {Object} 状态对象
 */
function getPoolStatus() {
  return ConnectionPoolManager.getStatus();
}

/**
 * 连接池健康检查
 * @returns {Promise<Object>} 健康检查结果
 */
async function healthCheck() {
  return await ConnectionPoolManager.healthCheck();
}

/**
 * 重置连接池
 * @returns {Promise<mysql.Pool>}
 */
async function resetPool() {
  return await ConnectionPoolManager.reset();
}

module.exports = {
  getPool,
  query,
  queryOne,
  execute,
  closePool,
  checkAdmin,
  getToday,
  // 新增：状态监控接口
  getPoolStatus,
  healthCheck,
  resetPool,
  ConnectionPoolManager,
};
