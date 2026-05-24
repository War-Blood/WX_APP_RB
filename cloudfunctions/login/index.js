// cloudfunctions/login/index.js
// 云函数：获取登录用户的 openid 和管理员身份（MySQL 版）
// 使用共享模块重构

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { getPool } = require('../common/mysql');
const { getUserInfo } = require('../common/auth');

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  try {
    const p = getPool();

    // 查询用户记录（不存在则自动注册）
    const [rows] = await p.execute(
      'SELECT openid, user_name, department, is_admin FROM users WHERE openid = ?',
      [OPENID]
    );
    const userRecord = rows[0] || null;

    return {
      code: 0,
      data: {
        openid:     OPENID,
        isAdmin:    userRecord ? !!userRecord.is_admin : false,
        userName:   userRecord ? (userRecord.user_name || '') : '',
        department: userRecord ? (userRecord.department || '') : '',
      },
    };
  } catch (err) {
    console.error('login 云函数错误:', err);
    return { code: -1, message: '登录失败', detail: err.message };
  }
};
