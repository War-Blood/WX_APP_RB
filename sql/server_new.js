const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ===================== 登录 & 用户 =====================
/**
 * POST /api/login
 * 小程序登录：接收 openid，返回用户信息和管理员身份
 */
app.post('/api/login', async (req, res) => {
  try {
    const { openid } = req.body;
    if (!openid) return res.json({ code: 400, message: 'openid 不能为空' });

    let user = await db.queryOne(
      'SELECT openid, user_name, department, is_admin FROM users WHERE openid = ?',
      [openid]
    );

    if (!user) {
      await db.execute(
        'INSERT INTO users (openid) VALUES (?)',
        [openid]
      );
      user = { openid, user_name: '', department: '', is_admin: 0 };
    }

    return res.json({
      code: 0,
      data: {
        openid:     user.openid,
        isAdmin:    !!user.is_admin,
        userName:   user.user_name || '',
        department: user.department || '',
      },
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * PUT /api/user/profile
 * 更新用户资料（姓名、部门）
 */
app.put('/api/user/profile', async (req, res) => {
  try {
    const { openid, userName, department } = req.body;
    if (!openid) return res.json({ code: 400, message: 'openid 不能为空' });

    await db.execute(
      'UPDATE users SET user_name = ?, department = ? WHERE openid = ?',
      [userName || '', department || '', openid]
    );

    return res.json({ code: 0, message: '更新成功' });
  } catch (err) {
    console.error('[profile]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// ===================== 日报提交（原始表 daily_reports）=====================
/**
 * POST /api/report/submit
 * 提交 / 修改日报
 * action: 'create' | 'update' | 'resubmit' | 'getLastReport'
 */
app.post('/api/report/submit', async (req, res) => {
  try {
    const { action, openid, userName, department, reportDate, content, reportId } = req.body;
    if (!openid) return res.json({ code: 401, message: '未登录' });

    if (action === 'create') {
      const existing = await db.queryOne(
        'SELECT report_id FROM daily_reports WHERE user_id=? AND report_date=? AND status IN ("pending","approved")',
        [openid, reportDate]
      );
      if (existing) {
        return res.json({ code: 409, message: '今日已提交日报，无需重复提交' });
      }

      const draft = await db.queryOne(
        'SELECT report_id, version FROM daily_reports WHERE user_id=? AND report_date=? AND status="rejected" ORDER BY version DESC LIMIT 1',
        [openid, reportDate]
      );

      const version = draft ? draft.version + 1 : 1;

      if (draft) {
        await db.execute(
          'UPDATE daily_reports SET content=?, status="pending", submit_time=NOW(), reviewer_id=NULL, review_time=NULL, review_note="" WHERE report_id=?',
          [JSON.stringify(content), draft.report_id]
        );
        return res.json({ code: 0, data: { reportId: draft.report_id, version }, message: '提交成功' });
      } else {
        const { insertId } = await db.execute(
          'INSERT INTO daily_reports (user_id, user_name, department, report_date, content, status, version) VALUES (?,?,?,?,"pending",1)',
          [openid, userName || '', department || '', reportDate, JSON.stringify(content)]
        );
        return res.json({ code: 0, data: { reportId: insertId, version: 1 }, message: '提交成功' });
      }

    } else if (action === 'update') {
      const r = await db.queryOne('SELECT status FROM daily_reports WHERE report_id=? AND user_id=?', [reportId, openid]);
      if (!r) return res.json({ code: 404, message: '日报不存在' });
      if (r.status === 'approved') return res.json({ code: 403, message: '已通过的日报不可修改' });
      await db.execute('UPDATE daily_reports SET content=?, submit_time=NOW() WHERE report_id=?', [JSON.stringify(content), reportId]);
      return res.json({ code: 0, message: '更新成功' });

    } else if (action === 'resubmit') {
      const r = await db.queryOne('SELECT report_id, version, status FROM daily_reports WHERE report_id=?', [reportId]);
      if (!r) return res.json({ code: 404, message: '日报不存在' });
      if (r.status !== 'rejected') return res.json({ code: 403, message: '只能重提被驳回的日报' });
      await db.execute(
        'UPDATE daily_reports SET content=?, status="pending", version=version+1, submit_time=NOW(), reviewer_id=NULL, review_time=NULL, review_note="" WHERE report_id=?',
        [JSON.stringify(content), reportId]
      );
      return res.json({ code: 0, data: { reportId, version: r.version + 1 }, message: '重提成功' });

    } else if (action === 'getLastReport') {
      const last = await db.queryOne(
        'SELECT report_id, content, submit_time FROM daily_reports WHERE user_id=? ORDER BY submit_time DESC LIMIT 1',
        [openid]
      );
      if (!last) return res.json({ code: 0, data: null });
      let content = last.content;
      if (typeof content === 'string') {
        try { content = JSON.parse(content); } catch (e) {}
      }
      return res.json({ code: 0, data: { reportId: last.report_id, content, submitTime: last.submit_time } });

    } else {
      return res.json({ code: 400, message: '未知 action' });
    }
  } catch (err) {
    console.error('[submit]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/report/list
 * 获取员工日报历史列表
 */
app.get('/api/report/list', async (req, res) => {
  try {
    const { openid, status, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    let sql = 'SELECT report_id, user_id, user_name, department, report_date, content, status, version, submit_time, review_time, review_note FROM daily_reports WHERE user_id=?';
    const params = [openid];

    if (status) {
      sql += ' AND status=?';
      params.push(status);
    }
    sql += ' ORDER BY submit_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    const list = await db.query(sql, params);
    const totalRow = await db.queryOne(
      'SELECT COUNT(*) as cnt FROM daily_reports WHERE user_id=?' + (status ? ' AND status=?' : ''),
      status ? [openid, status] : [openid]
    );

    return res.json({
      code: 0,
      data: {
        list: list.map(r => ({
          ...r,
          content: typeof r.content === 'string' ? JSON.parse(r.content) : r.content,
        })),
        total: totalRow.cnt,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      },
    });
  } catch (err) {
    console.error('[list]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// ===================== 日报审核（原始表 daily_reports）=====================
/**
 * GET /api/review/list
 * 获取管理员审核列表
 */
app.get('/api/review/list', async (req, res) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    let sql = 'SELECT report_id, user_id, user_name, department, report_date, content, status, version, submit_time FROM daily_reports WHERE status=? ORDER BY submit_time DESC LIMIT ? OFFSET ?';
    const list = await db.query(sql, [status || 'pending', parseInt(pageSize), offset]);

    const totalRow = await db.queryOne(
      'SELECT COUNT(*) as cnt FROM daily_reports WHERE status=?',
      [status || 'pending']
    );

    return res.json({
      code: 0,
      data: {
        list: list.map(r => ({
          ...r,
          content: typeof r.content === 'string' ? JSON.parse(r.content) : r.content,
        })),
        total: totalRow.cnt,
      },
    });
  } catch (err) {
    console.error('[review list]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/review/detail
 * 获取日报详情
 */
app.get('/api/review/detail', async (req, res) => {
  try {
    const { reportId } = req.query;
    const r = await db.queryOne('SELECT * FROM daily_reports WHERE report_id=?', [reportId]);
    if (!r) return res.json({ code: 404, message: '日报不存在' });
    return res.json({
      code: 0,
      data: {
        ...r,
        content: typeof r.content === 'string' ? JSON.parse(r.content) : r.content,
      },
    });
  } catch (err) {
    console.error('[detail]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * POST /api/review/action
 * 审核操作
 * action: 'approve' | 'reject'
 */
app.post('/api/review/action', async (req, res) => {
  try {
    const { action, reportId, reviewerId, reviewNote } = req.body;
    if (!reviewerId) return res.json({ code: 401, message: '未授权' });

    const r = await db.queryOne('SELECT status FROM daily_reports WHERE report_id=?', [reportId]);
    if (!r) return res.json({ code: 404, message: '日报不存在' });
    if (r.status !== 'pending') return res.json({ code: 403, message: '该日报已审核' });

    if (action === 'approve') {
      await db.execute(
        'UPDATE daily_reports SET status="approved", reviewer_id=?, review_time=NOW(), review_note=? WHERE report_id=?',
        [reviewerId, reviewNote || '', reportId]
      );
      return res.json({ code: 0, message: '审核通过' });
    } else if (action === 'reject') {
      await db.execute(
        'UPDATE daily_reports SET status="rejected", reviewer_id=?, review_time=NOW(), review_note=? WHERE report_id=?',
        [reviewerId, reviewNote || '', reportId]
      );
      return res.json({ code: 0, message: '已驳回' });
    } else {
      return res.json({ code: 400, message: '未知操作' });
    }
  } catch (err) {
    console.error('[review action]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// ===================== 项目进度日报（新版表 daily_project_progress）=====================
/**
 * POST /api/project/submit
 * 提交 / 修改项目进度日报
 * action: 'create' | 'update' | 'delete' | 'getDraft'
 */
app.post('/api/project/submit', async (req, res) => {
  try {
    const { action, openid, userName, data } = req.body;
    if (!openid) return res.json({ code: 401, message: '未登录' });

    const {
      daily_time, entry_time, initial_business_trip_time, project_name,
      project_area, related_unit, worker1_name, worker2_name, machine_model,
      person_count, work_content, need_complete_count, total_complete_count,
      current_progress, today_work_summary, tomorrow_work_content,
      today_work_type, tomorrow_work_type, remark,
      project_business_trip_days, personal_total_business_trip, id
    } = data || {};

    if (action === 'create') {
      // 唯一约束检查：同一天同一人同一项目
      const existing = await db.queryOne(
        'SELECT id FROM daily_project_progress WHERE daily_time=? AND filler_name=? AND project_name=?',
        [daily_time, userName, project_name]
      );
      if (existing) {
        return res.json({ code: 409, message: '该项目当天已有日报，不可重复提交', id: existing.id });
      }

      const { insertId } = await db.execute(
        `INSERT INTO daily_project_progress
          (daily_time, filler_name, entry_time, initial_business_trip_time,
           project_name, project_area, related_unit, worker1_name, worker2_name,
           machine_model, person_count, work_content, need_complete_count,
           total_complete_count, current_progress, today_work_summary,
           tomorrow_work_content, today_work_type, tomorrow_work_type, remark,
           project_business_trip_days, personal_total_business_trip)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          daily_time, userName, entry_time || null, initial_business_trip_time || null,
          project_name, project_area || '', related_unit || '',
          worker1_name || '', worker2_name || '', machine_model || '',
          person_count || 0, work_content || '', need_complete_count || 0,
          total_complete_count || 0, current_progress || 0.00,
          today_work_summary || '', tomorrow_work_content || '',
          today_work_type || '', tomorrow_work_type || '', remark || '',
          project_business_trip_days || 0, personal_total_business_trip || 0
        ]
      );
      return res.json({ code: 0, data: { id: insertId }, message: '提交成功' });

    } else if (action === 'update') {
      if (!id) return res.json({ code: 400, message: '缺少 id' });
      const row = await db.queryOne('SELECT id FROM daily_project_progress WHERE id=? AND filler_name=?', [id, userName]);
      if (!row) return res.json({ code: 404, message: '日报不存在或无权修改' });

      await db.execute(
        `UPDATE daily_project_progress SET
          entry_time=?, initial_business_trip_time=?, project_area=?, related_unit=?,
          worker1_name=?, worker2_name=?, machine_model=?, person_count=?,
          work_content=?, need_complete_count=?, total_complete_count=?,
          current_progress=?, today_work_summary=?, tomorrow_work_content=?,
          today_work_type=?, tomorrow_work_type=?, remark=?,
          project_business_trip_days=?, personal_total_business_trip=?,
          update_time=CURRENT_TIMESTAMP
         WHERE id=?`,
        [
          entry_time || null, initial_business_trip_time || null, project_area || '',
          related_unit || '', worker1_name || '', worker2_name || '',
          machine_model || '', person_count || 0, work_content || '',
          need_complete_count || 0, total_complete_count || 0,
          current_progress || 0.00, today_work_summary || '',
          tomorrow_work_content || '', today_work_type || '',
          tomorrow_work_type || '', remark || '',
          project_business_trip_days || 0, personal_total_business_trip || 0, id
        ]
      );
      return res.json({ code: 0, message: '更新成功' });

    } else if (action === 'delete') {
      if (!id) return res.json({ code: 400, message: '缺少 id' });
      const row = await db.queryOne('SELECT id FROM daily_project_progress WHERE id=? AND filler_name=?', [id, userName]);
      if (!row) return res.json({ code: 404, message: '日报不存在或无权删除' });

      await db.execute('DELETE FROM daily_project_progress WHERE id=?', [id]);
      return res.json({ code: 0, message: '删除成功' });

    } else if (action === 'getDraft') {
      // 获取最近一条草稿（按日期获取当天草稿或最新记录）
      const { dailyTime } = req.body;
      let draft;
      if (dailyTime) {
        draft = await db.queryOne(
          'SELECT * FROM daily_project_progress WHERE filler_name=? AND daily_time=? ORDER BY update_time DESC LIMIT 1',
          [userName, dailyTime]
        );
      } else {
        draft = await db.queryOne(
          'SELECT * FROM daily_project_progress WHERE filler_name=? ORDER BY update_time DESC LIMIT 1',
          [userName]
        );
      }
      if (!draft) return res.json({ code: 0, data: null });
      return res.json({ code: 0, data: draft });

    } else {
      return res.json({ code: 400, message: '未知 action' });
    }
  } catch (err) {
    console.error('[project/submit]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/project/list
 * 获取我的项目日报列表（按填写人 + 日期筛选）
 * query: fillerName, dailyTimeStart, dailyTimeEnd, projectName, page, pageSize
 */
app.get('/api/project/list', async (req, res) => {
  try {
    const { fillerName, dailyTimeStart, dailyTimeEnd, projectName, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let sql = 'SELECT * FROM daily_project_progress WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as cnt FROM daily_project_progress WHERE 1=1';
    const params = [];
    const countParams = [];

    if (fillerName) {
      sql += ' AND filler_name=?';
      countSql += ' AND filler_name=?';
      params.push(fillerName);
      countParams.push(fillerName);
    }
    if (dailyTimeStart) {
      sql += ' AND daily_time>=?';
      countSql += ' AND daily_time>=?';
      params.push(dailyTimeStart);
      countParams.push(dailyTimeStart);
    }
    if (dailyTimeEnd) {
      sql += ' AND daily_time<=?';
      countSql += ' AND daily_time<=?';
      params.push(dailyTimeEnd);
      countParams.push(dailyTimeEnd);
    }
    if (projectName) {
      sql += ' AND project_name LIKE ?';
      countSql += ' AND project_name LIKE ?';
      params.push(`%${projectName}%`);
      countParams.push(`%${projectName}%`);
    }

    sql += ' ORDER BY daily_time DESC, update_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    const list = await db.query(sql, params);
    const totalRow = await db.queryOne(countSql, countParams);

    return res.json({
      code: 0,
      data: {
        list,
        total: totalRow.cnt,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      },
    });
  } catch (err) {
    console.error('[project/list]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/project/detail
 * 获取项目日报详情
 */
app.get('/api/project/detail', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.json({ code: 400, message: '缺少 id' });

    const row = await db.queryOne('SELECT * FROM daily_project_progress WHERE id=?', [id]);
    if (!row) return res.json({ code: 404, message: '日报不存在' });

    return res.json({ code: 0, data: row });
  } catch (err) {
    console.error('[project/detail]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/project/stats
 * 获取项目进度统计（按项目维度）
 * query: projectName, dailyTimeStart, dailyTimeEnd
 */
app.get('/api/project/stats', async (req, res) => {
  try {
    const { projectName, dailyTimeStart, dailyTimeEnd } = req.query;

    let sql = `
      SELECT
        project_name,
        project_area,
        COUNT(*) as report_count,
        SUM(person_count) as total_person_days,
        MAX(current_progress) as latest_progress,
        MAX(total_complete_count) as latest_complete,
        MAX(need_complete_count) as total_need,
        MIN(daily_time) as first_report_date,
        MAX(daily_time) as last_report_date,
        MAX(project_business_trip_days) as max_project_trip_days
      FROM daily_project_progress
      WHERE 1=1
    `;
    const params = [];

    if (projectName) {
      sql += ' AND project_name LIKE ?';
      params.push(`%${projectName}%`);
    }
    if (dailyTimeStart) {
      sql += ' AND daily_time>=?';
      params.push(dailyTimeStart);
    }
    if (dailyTimeEnd) {
      sql += ' AND daily_time<=?';
      params.push(dailyTimeEnd);
    }

    sql += ' GROUP BY project_name, project_area ORDER BY last_report_date DESC';

    const list = await db.query(sql, params);
    return res.json({ code: 0, data: list });
  } catch (err) {
    console.error('[project/stats]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/project/project-list
 * 获取按项目分组的所有日报（按项目名筛选）
 * query: projectName, page, pageSize
 */
app.get('/api/project/project-list', async (req, res) => {
  try {
    const { projectName, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let sql = 'SELECT * FROM daily_project_progress WHERE 1=1';
    let countSql = 'SELECT COUNT(DISTINCT project_name) as cnt FROM daily_project_progress WHERE 1=1';
    const params = [];
    const countParams = [];

    if (projectName) {
      sql += ' AND project_name LIKE ?';
      countSql += ' AND project_name LIKE ?';
      params.push(`%${projectName}%`);
      countParams.push(`%${projectName}%`);
    }

    sql += ' ORDER BY daily_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    const list = await db.query(sql, params);
    const totalRow = await db.queryOne(countSql, countParams);

    return res.json({
      code: 0,
      data: {
        list,
        total: totalRow.cnt,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      },
    });
  } catch (err) {
    console.error('[project/project-list]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// ===================== 管理员管理 =====================
/**
 * GET /api/admin/list
 * 获取管理员列表
 */
app.get('/api/admin/list', async (req, res) => {
  try {
    const list = await db.query(
      'SELECT openid, user_name, department, created_at FROM users WHERE is_admin=1 ORDER BY created_at'
    );
    return res.json({ code: 0, data: list });
  } catch (err) {
    console.error('[admin list]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/admin/users
 * 获取所有用户列表（分页）
 */
app.get('/api/admin/users', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let sql, params;
    if (keyword) {
      sql = 'SELECT openid, user_name, department, is_admin, created_at FROM users WHERE openid LIKE ? OR user_name LIKE ? OR department LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      const k = `%${keyword}%`;
      params = [k, k, k, parseInt(pageSize), offset];
    } else {
      sql = 'SELECT openid, user_name, department, is_admin, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params = [parseInt(pageSize), offset];
    }

    const list = await db.query(sql, params);
    const totalRow = await db.queryOne(
      'SELECT COUNT(*) as cnt FROM users'
    );

    return res.json({ code: 0, data: { list, total: totalRow.cnt } });
  } catch (err) {
    console.error('[admin users]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * POST /api/admin/set-admin
 * 设置管理员
 */
app.post('/api/admin/set-admin', async (req, res) => {
  try {
    const { targetOpenid, isAdmin = true } = req.body;
    if (!targetOpenid) return res.json({ code: 400, message: '缺少参数' });
    await db.execute('UPDATE users SET is_admin=? WHERE openid=?', [isAdmin ? 1 : 0, targetOpenid]);
    return res.json({ code: 0, message: isAdmin ? '已设为管理员' : '已取消管理员' });
  } catch (err) {
    console.error('[set-admin]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * POST /api/admin/init-first
 * 初始化第一个管理员（仅在无管理员时可用）
 */
app.post('/api/admin/init-first', async (req, res) => {
  try {
    const { openid } = req.body;
    if (!openid) return res.json({ code: 400, message: '缺少 openid' });

    const adminCount = await db.queryOne('SELECT COUNT(*) as cnt FROM users WHERE is_admin=1');
    if (adminCount.cnt > 0) {
      return res.json({ code: 403, message: '系统已有管理员，请联系管理员添加' });
    }

    await db.execute(
      'INSERT INTO users (openid, is_admin) VALUES (?, 1) ON DUPLICATE KEY UPDATE is_admin=1',
      [openid]
    );
    return res.json({ code: 0, message: '已设为你为管理员' });
  } catch (err) {
    console.error('[init-admin]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// ===================== 健康检查 =====================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ===================== 启动 =====================
async function start() {
  const ok = await db.testConnection();
  if (!ok) {
    console.error('[Server] MySQL 连接失败，服务无法启动');
    process.exit(1);
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] 员工日报 API 服务已启动，端口 ${PORT}`);
    console.log(`[Server] 访问地址: http://0.0.0.0:${PORT}`);
  });
}

start();
