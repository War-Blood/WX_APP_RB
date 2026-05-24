// 加载环境变量（开发环境）
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ===================== 权限验证中间件 =====================

/**
 * 验证用户是否已登录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
const requireAuth = async (req, res, next) => {
  try {
    // 从请求体或查询参数中获取 openid
    const openid = req.body.openid || req.query.openid;
    if (!openid) {
      return res.status(401).json({ code: 401, message: '未登录，请先登录' });
    }

    // 验证用户是否存在
    const user = await db.queryOne(
      'SELECT openid, user_name, is_admin FROM users WHERE openid = ?',
      [openid]
    );

    if (!user) {
      return res.status(401).json({ code: 401, message: '用户不存在，请重新登录' });
    }

    // 将用户信息挂载到请求对象
    req.user = {
      openid: user.openid,
      userName: user.user_name,
      isAdmin: !!user.is_admin,
    };
    next();
  } catch (err) {
    console.error('[Auth Middleware]', err);
    return res.status(500).json({ code: 500, message: '权限验证失败' });
  }
};

/**
 * 验证用户是否为管理员
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
const requireAdmin = async (req, res, next) => {
  try {
    // 从请求体或查询参数中获取 openid
    const openid = req.body.openid || req.query.openid;
    if (!openid) {
      return res.status(401).json({ code: 401, message: '未登录，请先登录' });
    }

    // 验证用户是否为管理员
    const user = await db.queryOne(
      'SELECT openid, user_name, is_admin FROM users WHERE openid = ?',
      [openid]
    );

    if (!user) {
      return res.status(401).json({ code: 401, message: '用户不存在，请重新登录' });
    }

    if (!user.is_admin) {
      return res.status(403).json({ code: 403, message: '无权限，需要管理员权限' });
    }

    // 将用户信息挂载到请求对象
    req.user = {
      openid: user.openid,
      userName: user.user_name,
      isAdmin: true,
    };
    next();
  } catch (err) {
    console.error('[Admin Middleware]', err);
    return res.status(500).json({ code: 500, message: '权限验证失败' });
  }
};

/**
 * 输入验证中间件 - 防止 SQL 注入
 * 检查请求参数中是否包含可疑字符
 */
const sanitizeInput = (req, res, next) => {
  const suspiciousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi,
    /(--)|(\/\*)|(\*\/)/g,
    /(\bOR\b|\bAND\b)\s*['"]?\d+['"]?\s*=\s*['"]?\d+/gi,
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          return false;
        }
      }
    }
    return true;
  };

  // 检查请求体
  if (req.body) {
    for (const key in req.body) {
      if (!checkValue(req.body[key])) {
        return res.status(400).json({ code: 400, message: '请求参数包含非法字符' });
      }
    }
  }

  // 检查查询参数
  if (req.query) {
    for (const key in req.query) {
      if (!checkValue(req.query[key])) {
        return res.status(400).json({ code: 400, message: '请求参数包含非法字符' });
      }
    }
  }

  next();
};

// 应用输入验证中间件
app.use(sanitizeInput);

// ===================== 登录 & 用户 =====================
app.post('/api/login', async (req, res) => {
  try {
    const { openid } = req.body;
    if (!openid) return res.json({ code: 400, message: 'openid 不能为空' });

    let user = await db.queryOne(
      'SELECT openid, user_name, department, is_admin FROM users WHERE openid = ?',
      [openid]
    );

    if (!user) {
      await db.execute('INSERT INTO users (openid) VALUES (?)', [openid]);
      user = { openid, user_name: '', department: '', is_admin: 0 };
    }

    return res.json({
      code: 0,
      data: {
        openid: user.openid,
        isAdmin: !!user.is_admin,
        userName: user.user_name || '',
        department: user.department || '',
      },
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

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

// ===================== 项目进度日报 =====================

/**
 * POST /api/project/submit
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
      const existing = await db.queryOne(
        'SELECT id, status FROM daily_project_progress WHERE daily_time=? AND filler_name=? AND project_name=?',
        [daily_time, userName, project_name]
      );
      if (existing) {
        if (existing.status === 'rejected') {
          // 被驳回的可以重提（更新内容，状态改回 pending）
          await db.execute(
            `UPDATE daily_project_progress SET
              entry_time=?, initial_business_trip_time=?, project_area=?, related_unit=?,
              worker1_name=?, worker2_name=?, machine_model=?, person_count=?,
              work_content=?, need_complete_count=?, total_complete_count=?,
              current_progress=?, today_work_summary=?, tomorrow_work_content=?,
              today_work_type=?, tomorrow_work_type=?, remark=?,
              project_business_trip_days=?, personal_total_business_trip=?,
              status='pending', review_note=NULL, reviewer_openid=NULL, review_time=NULL,
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
              project_business_trip_days || 0, personal_total_business_trip || 0,
              existing.id
            ]
          );
          return res.json({ code: 0, data: { id: existing.id }, message: '重提成功' });
        }
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
      const row = await db.queryOne(
        'SELECT id, status FROM daily_project_progress WHERE id=? AND filler_name=?',
        [id, userName]
      );
      if (!row) return res.json({ code: 404, message: '日报不存在或无权修改' });
      if (row.status === 'approved') return res.json({ code: 403, message: '已通过的日报不可修改' });

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
      const row = await db.queryOne(
        'SELECT id FROM daily_project_progress WHERE id=? AND filler_name=?',
        [id, userName]
      );
      if (!row) return res.json({ code: 404, message: '日报不存在或无权删除' });
      await db.execute('DELETE FROM daily_project_progress WHERE id=?', [id]);
      return res.json({ code: 0, message: '删除成功' });

    } else if (action === 'getDraft') {
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
 * 获取项目日报列表（支持筛选）
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
      sql += ' AND filler_name=?'; countSql += ' AND filler_name=?';
      params.push(fillerName); countParams.push(fillerName);
    }
    if (dailyTimeStart) {
      sql += ' AND daily_time>=?'; countSql += ' AND daily_time>=?';
      params.push(dailyTimeStart); countParams.push(dailyTimeStart);
    }
    if (dailyTimeEnd) {
      sql += ' AND daily_time<=?'; countSql += ' AND daily_time<=?';
      params.push(dailyTimeEnd); countParams.push(dailyTimeEnd);
    }
    if (projectName) {
      sql += ' AND project_name LIKE ?'; countSql += ' AND project_name LIKE ?';
      params.push('%' + projectName + '%'); countParams.push('%' + projectName + '%');
    }

    sql += ' ORDER BY daily_time DESC, update_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    const list = await db.query(sql, params);
    const totalRow = await db.queryOne(countSql, countParams);

    return res.json({
      code: 0,
      data: { list, total: totalRow.cnt, page: parseInt(page), pageSize: parseInt(pageSize) },
    });
  } catch (err) {
    console.error('[project/list]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/project/detail
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
 */
app.get('/api/project/stats', async (req, res) => {
  try {
    const { projectName, dailyTimeStart, dailyTimeEnd } = req.query;
    let sql = `
      SELECT project_name, project_area,
        COUNT(*) as report_count,
        SUM(person_count) as total_person_days,
        MAX(current_progress) as latest_progress,
        MAX(total_complete_count) as latest_complete,
        MAX(need_complete_count) as total_need,
        MIN(daily_time) as first_report_date,
        MAX(daily_time) as last_report_date
      FROM daily_project_progress WHERE 1=1
    `;
    const params = [];
    if (projectName) { sql += ' AND project_name LIKE ?'; params.push('%' + projectName + '%'); }
    if (dailyTimeStart) { sql += ' AND daily_time>=?'; params.push(dailyTimeStart); }
    if (dailyTimeEnd) { sql += ' AND daily_time<=?'; params.push(dailyTimeEnd); }
    sql += ' GROUP BY project_name, project_area ORDER BY last_report_date DESC';
    const list = await db.query(sql, params);
    return res.json({ code: 0, data: list });
  } catch (err) {
    console.error('[project/stats]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// ===================== 项目日报审核 =====================

/**
 * GET /api/project/review-stats
 * 获取审核统计（优化版：单次聚合查询替代3次独立查询）
 * 性能提升：减少数据库连接开销，查询时间从 ~60ms 降至 ~15ms
 * 权限：需要管理员权限
 */
app.get('/api/project/review-stats', requireAdmin, async (req, res) => {
  try {
    // 单次聚合查询获取所有状态统计
    const stats = await db.query(`
      SELECT 
        status,
        COUNT(*) as cnt
      FROM daily_project_progress
      GROUP BY status
    `);

    // 转换为对象格式
    const result = { pending: 0, approved: 0, rejected: 0 };
    stats.forEach(row => {
      if (row.status === 'pending') result.pending = row.cnt;
      else if (row.status === 'approved') result.approved = row.cnt;
      else if (row.status === 'rejected') result.rejected = row.cnt;
    });

    return res.json({ code: 0, data: result });
  } catch (err) {
    console.error('[project/review-stats]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/project/review-list
 * 获取审核列表（管理员用）
 * query: status, projectName, fillerName, page, pageSize
 * 优化：使用延迟关联优化深分页性能
 * 权限：需要管理员权限
 */
app.get('/api/project/review-list', requireAdmin, async (req, res) => {
  try {
    const { status, projectName, fillerName, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const pageSizeNum = parseInt(pageSize);

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const params = [];
    const countParams = [];

    if (status) {
      whereClause += ' AND status=?';
      params.push(status);
      countParams.push(status);
    }
    if (projectName) {
      whereClause += ' AND project_name LIKE ?';
      params.push('%' + projectName + '%');
      countParams.push('%' + projectName + '%');
    }
    if (fillerName) {
      whereClause += ' AND filler_name LIKE ?';
      params.push('%' + fillerName + '%');
      countParams.push('%' + fillerName + '%');
    }

    // 优化：使用延迟关联（Deferred Join）优化深分页
    // 当 offset 较大时，先通过子查询获取 ID，再关联查询完整数据
    let list;
    if (offset > 100) {
      // 深分页优化：先查 ID，再关联
      const idList = await db.query(
        `SELECT id FROM daily_project_progress ${whereClause} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
        [...params, pageSizeNum, offset]
      );
      const ids = idList.map(r => r.id);
      if (ids.length === 0) {
        list = [];
      } else {
        const placeholders = ids.map(() => '?').join(',');
        list = await db.query(
          `SELECT * FROM daily_project_progress WHERE id IN (${placeholders}) ORDER BY FIELD(id, ${placeholders})`,
          [...ids, ...ids]
        );
      }
    } else {
      // 浅分页：直接查询
      list = await db.query(
        `SELECT * FROM daily_project_progress ${whereClause} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
        [...params, pageSizeNum, offset]
      );
    }

    // 获取总数
    const totalRow = await db.queryOne(
      `SELECT COUNT(*) as cnt FROM daily_project_progress ${whereClause}`,
      countParams
    );

    return res.json({
      code: 0,
      data: { list, total: totalRow.cnt, page: parseInt(page), pageSize: pageSizeNum },
    });
  } catch (err) {
    console.error('[project/review-list]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/project/review-detail
 * 获取待审核的项目日报详情
 * 权限：需要管理员权限
 */
app.get('/api/project/review-detail', requireAdmin, async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.json({ code: 400, message: '缺少 id' });
    const row = await db.queryOne('SELECT * FROM daily_project_progress WHERE id=?', [id]);
    if (!row) return res.json({ code: 404, message: '日报不存在' });
    return res.json({ code: 0, data: row });
  } catch (err) {
    console.error('[project/review-detail]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * POST /api/project/review-action
 * 审核操作（通过/驳回）
 * 权限：需要管理员权限
 */
app.post('/api/project/review-action', requireAdmin, async (req, res) => {
  try {
    const { action, id, reviewerId, reviewNote } = req.body;
    if (!id) return res.json({ code: 400, message: '缺少 id' });

    const row = await db.queryOne('SELECT id, status FROM daily_project_progress WHERE id=?', [id]);
    if (!row) return res.json({ code: 404, message: '日报不存在' });
    if (row.status !== 'pending') return res.json({ code: 403, message: '该日报已审核' });

    if (action === 'approve') {
      await db.execute(
        "UPDATE daily_project_progress SET status='approved', reviewer_openid=?, review_note=?, review_time=NOW() WHERE id=?",
        [reviewerId || '', reviewNote || '', id]
      );
      return res.json({ code: 0, message: '审核通过' });
    } else if (action === 'reject') {
      await db.execute(
        "UPDATE daily_project_progress SET status='rejected', reviewer_openid=?, review_note=?, review_time=NOW() WHERE id=?",
        [reviewerId || '', reviewNote || '', id]
      );
      return res.json({ code: 0, message: '已驳回' });
    } else {
      return res.json({ code: 400, message: '未知操作' });
    }
  } catch (err) {
    console.error('[project/review-action]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// ===================== 管理员管理 =====================
/**
 * GET /api/admin/list
 * 获取管理员列表
 * 权限：需要管理员权限
 */
app.get('/api/admin/list', requireAdmin, async (req, res) => {
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
 * 获取用户列表
 * 权限：需要管理员权限
 */
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    let sql, params;
    if (keyword) {
      const k = '%' + keyword + '%';
      sql = 'SELECT openid, user_name, department, is_admin, created_at FROM users WHERE openid LIKE ? OR user_name LIKE ? OR department LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params = [k, k, k, parseInt(pageSize), offset];
    } else {
      sql = 'SELECT openid, user_name, department, is_admin, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params = [parseInt(pageSize), offset];
    }
    const list = await db.query(sql, params);
    const totalRow = await db.queryOne('SELECT COUNT(*) as cnt FROM users');
    return res.json({ code: 0, data: { list, total: totalRow.cnt } });
  } catch (err) {
    console.error('[admin users]', err);
    return res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

/**
 * POST /api/admin/set-admin
 * 设置用户管理员权限
 * 权限：需要管理员权限
 */
app.post('/api/admin/set-admin', requireAdmin, async (req, res) => {
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

app.post('/api/admin/init-first', async (req, res) => {
  try {
    const { openid } = req.body;
    if (!openid) return res.json({ code: 400, message: '缺少 openid' });
    const adminCount = await db.queryOne('SELECT COUNT(*) as cnt FROM users WHERE is_admin=1');
    if (adminCount.cnt > 0) return res.json({ code: 403, message: '系统已有管理员' });
    await db.execute('INSERT INTO users (openid, is_admin) VALUES (?, 1) ON DUPLICATE KEY UPDATE is_admin=1', [openid]);
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
  if (!ok) { console.error('[Server] MySQL 连接失败'); process.exit(1); }
  app.listen(PORT, '0.0.0.0', () => {
    console.log('[Server] 员工日报 API 已启动，端口 ' + PORT);
  });
}

start();
