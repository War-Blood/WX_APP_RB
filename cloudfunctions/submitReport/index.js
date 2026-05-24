// cloudfunctions/submitReport/index.js
// 日报云函数（支持多 action，MySQL 版）
// 使用共享模块重构

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { getPool, getToday } = require('../common/mysql');

exports.main = async (event, context) => {
  const { action } = event;
  const { OPENID } = cloud.getWXContext();
  const p = getPool();

  try {
    // ========== 提交 / 重提日报 ==========
    if (action === 'submit') {
      const { content, userName = '', department = '' } = event;
      const reportDate = getToday();

      // 查今日是否已有
      const [existing] = await p.execute(
        'SELECT report_id, status FROM daily_reports WHERE user_id = ? AND report_date = ?',
        [OPENID, reportDate]
      );

      if (existing.length > 0) {
        const rec = existing[0];
        if (rec.status === 'approved') {
          return { code: -1, message: '今日日报已审核通过，如需修改请联系管理员' };
        }
        // 重提：更新内容，版本+1，状态回到 pending
        await p.execute(
          `UPDATE daily_reports
             SET content = ?, status = 'pending', version = version + 1,
                 submit_time = NOW(), reviewer_id = NULL, review_time = NULL, review_note = ''
           WHERE report_id = ?`,
          [JSON.stringify(content), rec.report_id]
        );
        return { code: 0, data: { reportId: rec.report_id, action: 'updated' } };
      } else {
        // 新增
        const [result] = await p.execute(
          `INSERT INTO daily_reports
             (user_id, user_name, department, report_date, content, status, version, submit_time)
           VALUES (?, ?, ?, ?, ?, 'pending', 1, NOW())`,
          [OPENID, userName, department, reportDate, JSON.stringify(content)]
        );
        return { code: 0, data: { reportId: result.insertId, action: 'created' } };
      }
    }

    // ========== 获取指定日期日报 ==========
    if (action === 'getByDate') {
      const { date } = event;
      const [rows] = await p.execute(
        'SELECT * FROM daily_reports WHERE user_id = ? AND report_date = ?',
        [OPENID, date]
      );
      if (!rows.length) return { code: 404, message: '该日期无日报' };
      return { code: 0, data: rows[0] };
    }

    // ========== 获取最新一条日报（用于预填） ==========
    if (action === 'getLatest') {
      const [rows] = await p.execute(
        'SELECT * FROM daily_reports WHERE user_id = ? ORDER BY submit_time DESC LIMIT 1',
        [OPENID]
      );
      if (!rows.length) return { code: 404, message: '暂无历史日报' };
      return { code: 0, data: rows[0] };
    }

    // ========== 获取历史列表（员工） ==========
    if (action === 'getList') {
      const { status = '', page = 1, pageSize = 10 } = event;
      const offset = (page - 1) * pageSize;

      let where = 'WHERE user_id = ?';
      const params = [OPENID];
      if (status) { where += ' AND status = ?'; params.push(status); }

      const [list] = await p.execute(
        `SELECT * FROM daily_reports ${where} ORDER BY report_date DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      const [[{ total }]] = await p.execute(
        `SELECT COUNT(*) AS total FROM daily_reports ${where}`, params
      );

      return { code: 0, data: { list, total, page, pageSize } };
    }

    // ========== 获取详情 ==========
    if (action === 'getDetail') {
      const { reportId } = event;
      const [rows] = await p.execute(
        'SELECT * FROM daily_reports WHERE report_id = ?', [reportId]
      );
      if (!rows.length) return { code: 404, message: '日报不存在' };
      if (rows[0].user_id !== OPENID) return { code: 403, message: '无权限查看' };
      return { code: 0, data: rows[0] };
    }

    return { code: -1, message: '未知 action: ' + action };

  } catch (err) {
    console.error('submitReport 云函数错误:', action, err);
    return { code: -1, message: err.message || '服务器错误' };
  }
};
