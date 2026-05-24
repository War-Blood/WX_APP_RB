// cloudfunctions/initAdmin/index.js
// 初始化管理员：将自己设为超级管理员（MySQL 版）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { getPool } = require('../common/mysql');

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const p = getPool();

  try {
    // 检查是否已有管理员
    const [admins] = await p.execute('SELECT openid FROM users WHERE is_admin = 1 LIMIT 1');
    if (admins.length > 0) {
      return {
        code: 403,
        message: '已有管理员，请联系现有管理员添加你',
      };
    }

    // 检查用户记录是否存在
    const [existing] = await p.execute('SELECT openid FROM users WHERE openid = ?', [OPENID]);
    if (existing.length > 0) {
      await p.execute('UPDATE users SET is_admin = 1, updated_at = NOW() WHERE openid = ?', [OPENID]);
    } else {
      await p.execute(
        'INSERT INTO users (openid, user_name, department, is_admin, created_at) VALUES (?, ?, ?, 1, NOW())',
        [OPENID, '', '']
      );
    }

    return {
      code: 0,
      message: '已设为你为管理员，请刷新管理后台',
      data: { openid: OPENID },
    };
  } catch (err) {
    return { code: -1, message: '初始化失败', detail: err.message };
  }
};
