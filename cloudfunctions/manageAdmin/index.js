// cloudfunctions/manageAdmin/index.js
// 管理员管理云函数（MySQL 版）
// 使用共享模块重构

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { getPool } = require('../common/mysql');
const { checkAdmin } = require('../common/auth');

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { action } = event;
  const p = getPool();

  // 所有操作都需要管理员权限
  const isAdmin = await checkAdmin(p, OPENID);
  if (!isAdmin) return { code: 403, message: '无权限' };

  try {
    // ========== 获取管理员列表 ==========
    if (action === 'getAdminList') {
      const [rows] = await p.execute(
        'SELECT openid, user_name AS userName, department, is_admin AS isAdmin, created_at AS createdAt FROM users WHERE is_admin = 1'
      );
      return { code: 0, data: rows };
    }

    // ========== 获取用户列表（分页） ==========
    if (action === 'getUserList') {
      const { page = 1, pageSize = 20 } = event;
      const offset = (page - 1) * pageSize;

      const [list] = await p.execute(
        `SELECT openid, user_name AS userName, department, is_admin AS isAdmin, created_at AS createdAt
           FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [pageSize, offset]
      );
      const [[{ total }]] = await p.execute('SELECT COUNT(*) AS total FROM users');
      return { code: 0, data: list, total };
    }

    // ========== 设为管理员 ==========
    if (action === 'addAdmin') {
      const { targetOpenid } = event;
      if (!targetOpenid) return { code: 400, message: '缺少 targetOpenid' };

      const [existing] = await p.execute('SELECT openid FROM users WHERE openid = ?', [targetOpenid]);
      if (!existing.length) return { code: 404, message: '用户不存在' };

      await p.execute('UPDATE users SET is_admin = 1, updated_at = NOW() WHERE openid = ?', [targetOpenid]);
      return { code: 0, message: '已设为管理员' };
    }

    // ========== 取消管理员 ==========
    if (action === 'removeAdmin') {
      const { targetOpenid } = event;
      if (!targetOpenid) return { code: 400, message: '缺少 targetOpenid' };
      if (targetOpenid === OPENID) return { code: 400, message: '不能取消自己的管理员身份' };

      await p.execute('UPDATE users SET is_admin = 0, updated_at = NOW() WHERE openid = ?', [targetOpenid]);
      return { code: 0, message: '已取消管理员' };
    }

    // ========== 搜索用户 ==========
    if (action === 'searchUser') {
      const { keyword } = event;
      if (!keyword || keyword.trim().length < 2) return { code: 400, message: '关键词至少2个字符' };

      const like = `%${keyword.trim()}%`;
      const [rows] = await p.execute(
        `SELECT openid, user_name AS userName, department, is_admin AS isAdmin, created_at AS createdAt
           FROM users
          WHERE openid LIKE ? OR user_name LIKE ? OR department LIKE ?
          LIMIT 20`,
        [like, like, like]
      );
      return { code: 0, data: rows };
    }

    return { code: 400, message: '未知 action' };

  } catch (err) {
    console.error('manageAdmin 云函数错误:', err);
    return { code: -1, message: err.message || '服务器错误' };
  }
};
