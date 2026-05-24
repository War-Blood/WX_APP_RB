// cloudfunctions/reviewReport/index.js
// 管理员审核云函数（支持多 action，MySQL 版）
// 使用共享模块重构

const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { getPool, getToday } = require('../common/mysql');
const { checkAdmin } = require('../common/auth');

// ========== 辅助：查询单条日报 ==========
async function getReportById(p, reportId) {
  const [rows] = await p.execute('SELECT * FROM daily_reports WHERE report_id = ?', [reportId]);
  return rows[0] || null;
}

// ========== WPS 写入 ==========
async function appendToWPS(report) {
  const WPS_API_TOKEN = process.env.WPS_API_TOKEN;
  const WPS_FILE_ID   = process.env.WPS_FILE_ID;
  const WPS_SHEET_INDEX = process.env.WPS_SHEET_INDEX || '0';

  if (!WPS_API_TOKEN || !WPS_FILE_ID) {
    throw new Error('WPS 配置未设置，请在云函数环境变量中配置 WPS_API_TOKEN 和 WPS_FILE_ID');
  }

  const c = typeof report.content === 'string'
    ? JSON.parse(report.content)
    : report.content;

  const rowData = [
    report.report_date || report.date || '',
    report.user_name   || report.userName || '',
    report.department  || '',
    c.todayDone     || '',
    c.tomorrowPlan  || '',
    c.blockers      || '',
    c.remarks       || '',
    new Date().toLocaleString('zh-CN'),
  ];

  await axios.post(
    `https://api.wps.cn/v3/files/${WPS_FILE_ID}/sheets/${WPS_SHEET_INDEX}/rows`,
    { rows: [{ cells: rowData.map(v => ({ text: String(v) })) }] },
    {
      headers: {
        Authorization: `Bearer ${WPS_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );
}

// ========== 订阅消息通知 ==========
async function sendSubscribeMsg(toUser, reportId, status, date, note) {
  const templateId = process.env.SUBSCRIBE_TEMPLATE_ID;
  if (!templateId) return;

  await cloud.openapi.subscribeMessage.send({
    touser: toUser,
    template_id: templateId,
    page: `pages/employee/report-detail/index?id=${reportId}`,
    data: {
      thing1: { value: status === 'approved' ? '日报审核通过' : '日报被驳回' },
      thing2: { value: note || (status === 'approved' ? '请继续保持' : '请根据原因修改后重新提交') },
      time3:  { value: new Date().toLocaleString('zh-CN') },
      thing4: { value: `${date} 日报` },
    },
  });
}

exports.main = async (event, context) => {
  const { action } = event;
  const { OPENID } = cloud.getWXContext();
  const p = getPool();

  // 需要管理员权限的操作
  const adminActions = ['approve', 'reject', 'getStats', 'getList', 'getDetail'];
  if (adminActions.includes(action)) {
    const isAdmin = await checkAdmin(p, OPENID);
    if (!isAdmin) return { code: 403, message: '无管理员权限' };
  }

  try {
    // ========== 审核通过 ==========
    if (action === 'approve') {
      const { reportId, note = '' } = event;
      const report = await getReportById(p, reportId);
      if (!report)  return { code: -1, message: '日报不存在' };
      if (report.status !== 'pending') return { code: -1, message: '该日报已审核，请勿重复操作' };

      await p.execute(
        `UPDATE daily_reports
           SET status = 'approved', review_note = ?, review_time = NOW(), reviewer_id = ?
         WHERE report_id = ?`,
        [note, OPENID, reportId]
      );

      // 写入 WPS（失败不影响审核）
      try { await appendToWPS({ ...report, report_date: report.report_date || report.date }); } catch (e) {
        console.error('WPS 写入失败:', e.message);
      }
      // 订阅消息
      try {
        await sendSubscribeMsg(report.user_id, reportId, 'approved', report.report_date, note);
      } catch (e) {
        console.error('订阅消息失败:', e.message);
      }

      return { code: 0, data: { status: 'approved' } };
    }

    // ========== 审核驳回 ==========
    if (action === 'reject') {
      const { reportId, reason = '' } = event;
      const report = await getReportById(p, reportId);
      if (!report)  return { code: -1, message: '日报不存在' };
      if (report.status !== 'pending') return { code: -1, message: '该日报已审核，请勿重复操作' };

      await p.execute(
        `UPDATE daily_reports
           SET status = 'rejected', review_note = ?, review_time = NOW(), reviewer_id = ?
         WHERE report_id = ?`,
        [reason, OPENID, reportId]
      );

      try {
        await sendSubscribeMsg(report.user_id, reportId, 'rejected', report.report_date, reason);
      } catch (e) {
        console.error('订阅消息失败:', e.message);
      }

      return { code: 0, data: { status: 'rejected' } };
    }

    // ========== 今日统计 ==========
    if (action === 'getStats') {
      const today = getToday();
      const [[pendingRow], [approvedRow], [rejectedRow]] = await Promise.all([
        p.execute('SELECT COUNT(*) AS cnt FROM daily_reports WHERE report_date = ? AND status = ?', [today, 'pending']),
        p.execute('SELECT COUNT(*) AS cnt FROM daily_reports WHERE report_date = ? AND status = ?', [today, 'approved']),
        p.execute('SELECT COUNT(*) AS cnt FROM daily_reports WHERE report_date = ? AND status = ?', [today, 'rejected']),
      ]);
      return {
        code: 0,
        data: {
          pending:  pendingRow.cnt  || 0,
          approved: approvedRow.cnt || 0,
          rejected: rejectedRow.cnt || 0,
        },
      };
    }

    // ========== 审核列表 ==========
    if (action === 'getList') {
      const { status = 'pending', page = 1, pageSize = 10 } = event;
      const offset = (page - 1) * pageSize;

      let where = '';
      const params = [];
      if (status) { where = 'WHERE status = ?'; params.push(status); }

      const [list] = await p.execute(
        `SELECT * FROM daily_reports ${where} ORDER BY submit_time DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      const [[{ total }]] = await p.execute(
        `SELECT COUNT(*) AS total FROM daily_reports ${where}`, params
      );

      return { code: 0, data: { list, total, page, pageSize } };
    }

    // ========== 日报详情 ==========
    if (action === 'getDetail') {
      const { reportId } = event;
      const report = await getReportById(p, reportId);
      if (!report) return { code: 404, message: '日报不存在' };
      return { code: 0, data: report };
    }

    return { code: -1, message: '未知 action: ' + action };

  } catch (err) {
    console.error('reviewReport 云函数错误:', action, err);
    return { code: -1, message: err.message || '服务器错误' };
  }
};
