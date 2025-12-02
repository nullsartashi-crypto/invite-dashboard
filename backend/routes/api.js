const express = require('express');
const router = express.Router();
const db = require('../config/db');
const dataFetcher = require('../services/dataFetcher');
const scheduler = require('../services/scheduler');

// ==================== 邀请码管理 ====================

/**
 * 获取所有邀请码
 */
router.get('/invite-codes', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM invite_codes ORDER BY created_at DESC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取邀请码失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 添加邀请码
 */
router.post('/invite-codes', async (req, res) => {
  try {
    const { inviteCode, name } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ success: false, message: '邀请码不能为空' });
    }

    // 步骤 1: 立即调用外部 API 获取当前数据作为基准
    console.log(`正在获取邀请码 ${inviteCode} 的基准数据...`);
    const apiData = await dataFetcher.fetchInviteData([inviteCode]);

    // 提取 API 数据（兼容不同返回格式）
    let codeData = apiData;
    if (apiData.data && Array.isArray(apiData.data)) {
      codeData = apiData.data.find(d =>
        (d['邀请码'] && d['邀请码'].toLowerCase() === inviteCode.toLowerCase()) ||
        (d.inviteCode && d.inviteCode.toLowerCase() === inviteCode.toLowerCase())
      );
    } else if (apiData[inviteCode]) {
      codeData = apiData[inviteCode];
    }

    if (!codeData) {
      return res.status(400).json({
        success: false,
        message: '无法从 API 获取该邀请码的数据，请确认邀请码正确'
      });
    }

    // 提取基准数据（支持中英文字段）
    const baselineInviteUsers = codeData['总邀请用户'] || codeData.inviteUsers || 0;
    const baselineTradeUsers = codeData['总邀请交易用户'] || codeData.tradeUsers || 0;
    const baselineTradeAmount = codeData['邀请总交易额'] || codeData.tradeAmount || 0;
    const baselineSelfTradeAmount = codeData['用户自己交易额'] || codeData.selfTradeAmount || 0;
    const baselineDate = new Date().toISOString().split('T')[0];

    // 步骤 2: 插入邀请码和基准数据（使用事务）
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `INSERT INTO invite_codes
        (invite_code, name, baseline_invite_users, baseline_trade_users,
         baseline_trade_amount, baseline_self_trade_amount, baseline_date, baseline_raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inviteCode,
          name || '',
          baselineInviteUsers,
          baselineTradeUsers,
          baselineTradeAmount,
          baselineSelfTradeAmount,
          baselineDate,
          JSON.stringify(codeData)
        ]
      );

      // 步骤 3: 保存第一天的数据（累计=基准，新增=0）
      await connection.query(
        `INSERT INTO daily_invite_data
        (invite_code, record_date, total_invite_users, total_trade_users,
         total_trade_amount, total_self_trade_amount, daily_new_invite_users,
         daily_new_trade_users, daily_new_trade_amount, daily_new_self_trade_amount, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?)`,
        [
          inviteCode,
          baselineDate,
          baselineInviteUsers,
          baselineTradeUsers,
          baselineTradeAmount,
          baselineSelfTradeAmount,
          JSON.stringify(codeData)
        ]
      );

      await connection.commit();
      console.log(`邀请码 ${inviteCode} 添加成功，基准数据已保存`);

      res.json({
        success: true,
        message: '邀请码添加成功',
        baseline: {
          inviteUsers: baselineInviteUsers,
          tradeUsers: baselineTradeUsers,
          tradeAmount: baselineTradeAmount,
          selfTradeAmount: baselineSelfTradeAmount,
          date: baselineDate
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: '邀请码已存在' });
    } else {
      console.error('添加邀请码失败:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
});

/**
 * 更新邀请码
 */
router.put('/invite-codes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有要更新的字段' });
    }

    values.push(id);

    await db.query(
      `UPDATE invite_codes SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ success: true, message: '邀请码更新成功' });
  } catch (error) {
    console.error('更新邀请码失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 删除邀请码
 */
router.delete('/invite-codes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.query('DELETE FROM invite_codes WHERE id = ?', [id]);

    res.json({ success: true, message: '邀请码删除成功' });
  } catch (error) {
    console.error('删除邀请码失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 数据查询 ====================

/**
 * 获取指定日期范围的数据
 */
router.get('/daily-data', async (req, res) => {
  try {
    const { inviteCode, startDate, endDate, limit = 30 } = req.query;

    let query = 'SELECT * FROM daily_invite_data WHERE 1=1';
    const params = [];

    if (inviteCode) {
      query += ' AND invite_code = ?';
      params.push(inviteCode);
    }

    if (startDate) {
      query += ' AND record_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND record_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY record_date DESC LIMIT ?';
    params.push(parseInt(limit));

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 获取昨日数据
 */
router.get('/yesterday-data', async (req, res) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const [rows] = await db.query(
      `SELECT d.*, c.name as invite_code_name
       FROM daily_invite_data d
       LEFT JOIN invite_codes c ON d.invite_code = c.invite_code
       WHERE d.record_date = ?
       ORDER BY d.invite_code`,
      [dateStr]
    );

    res.json({ success: true, data: rows, date: dateStr });
  } catch (error) {
    console.error('获取昨日数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 获取汇总统计数据
 */
router.get('/summary', async (req, res) => {
  try {
    const { inviteCode, days = 7 } = req.query;

    let query = `
      SELECT
        record_date,
        SUM(daily_new_invite_users) as total_new_invite_users,
        SUM(daily_new_trade_users) as total_new_trade_users,
        SUM(daily_new_trade_amount) as total_new_trade_amount,
        SUM(daily_new_self_trade_amount) as total_new_self_trade_amount
      FROM daily_invite_data
      WHERE record_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    `;

    const params = [parseInt(days)];

    if (inviteCode) {
      query += ' AND invite_code = ?';
      params.push(inviteCode);
    }

    query += ' GROUP BY record_date ORDER BY record_date ASC';

    const [rows] = await db.query(query, params);

    // 获取总计数据
    const [totalRows] = await db.query(
      `SELECT
        invite_code,
        MAX(total_invite_users) as total_invite_users,
        MAX(total_trade_users) as total_trade_users,
        MAX(total_trade_amount) as total_trade_amount,
        MAX(total_self_trade_amount) as total_self_trade_amount
      FROM daily_invite_data
      WHERE invite_code IN (SELECT invite_code FROM invite_codes WHERE status = 1)
      ${inviteCode ? 'AND invite_code = ?' : ''}
      GROUP BY invite_code`,
      inviteCode ? [inviteCode] : []
    );

    res.json({
      success: true,
      dailyData: rows,
      totalData: totalRows
    });
  } catch (error) {
    console.error('获取汇总数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 获取仪表盘数据
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    // 获取最新的累计数据（每个邀请码的最新记录）
    const [latestData] = await db.query(`
      SELECT
        d.invite_code,
        d.record_date,
        d.total_invite_users,
        d.total_trade_users,
        d.total_trade_amount,
        d.total_self_trade_amount,
        d.daily_new_invite_users,
        d.daily_new_trade_users,
        d.daily_new_trade_amount,
        d.daily_new_self_trade_amount,
        c.name as invite_code_name
      FROM daily_invite_data d
      INNER JOIN (
        SELECT invite_code, MAX(record_date) as max_date
        FROM daily_invite_data
        GROUP BY invite_code
      ) latest ON d.invite_code = latest.invite_code AND d.record_date = latest.max_date
      LEFT JOIN invite_codes c ON d.invite_code = c.invite_code
      WHERE c.status = 1
      ORDER BY d.total_trade_users DESC
    `);

    // 获取指定天数的每日趋势数据
    const [trendData] = await db.query(`
      SELECT
        d.record_date,
        d.invite_code,
        c.name as invite_code_name,
        d.daily_new_invite_users,
        d.daily_new_trade_users,
        d.daily_new_trade_amount,
        d.daily_new_self_trade_amount
      FROM daily_invite_data d
      LEFT JOIN invite_codes c ON d.invite_code = c.invite_code
      WHERE d.record_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND d.invite_code IN (SELECT invite_code FROM invite_codes WHERE status = 1)
      ORDER BY d.record_date ASC, d.invite_code
    `, [parseInt(days)]);

    // 获取昨日新增数据汇总
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const [yesterdayData] = await db.query(`
      SELECT
        SUM(d.daily_new_invite_users) as yesterday_new_invite_users,
        SUM(d.daily_new_trade_users) as yesterday_new_trade_users,
        SUM(d.daily_new_trade_amount) as yesterday_new_trade_amount
      FROM daily_invite_data d
      LEFT JOIN invite_codes c ON d.invite_code = c.invite_code
      WHERE d.record_date = ?
        AND c.status = 1
    `, [yesterdayStr]);

    const yesterdaySummary = yesterdayData[0] || {
      yesterday_new_invite_users: 0,
      yesterday_new_trade_users: 0,
      yesterday_new_trade_amount: 0
    };

    // 计算汇总数据
    const totalTradeAmount = latestData.reduce((sum, row) => sum + parseFloat(row.total_trade_amount || 0), 0);

    const summary = {
      // 累计数据（保持不变）
      totalInviteUsers: latestData.reduce((sum, row) => sum + (row.total_invite_users || 0), 0),
      totalTradeUsers: latestData.reduce((sum, row) => sum + (row.total_trade_users || 0), 0),
      totalTradeAmount: totalTradeAmount,
      totalCommissionFee: totalTradeAmount * 0.01,  // 贡献手续费 = 累计交易额 * 0.01
      // 新增：昨日新增数据
      yesterdayNewInviteUsers: yesterdaySummary.yesterday_new_invite_users || 0,
      yesterdayNewTradeUsers: yesterdaySummary.yesterday_new_trade_users || 0,
      yesterdayNewTradeAmount: parseFloat(yesterdaySummary.yesterday_new_trade_amount || 0)
    };

    res.json({
      success: true,
      summary,
      latestData,
      trendData
    });
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 数据同步 ====================

/**
 * 手动触发数据抓取
 */
router.post('/fetch-data', async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (inviteCode) {
      // 抓取单个邀请码
      const apiData = await dataFetcher.fetchInviteData([inviteCode]);
      let codeData = apiData;

      if (apiData.data && Array.isArray(apiData.data)) {
        codeData = apiData.data.find(d => d.inviteCode === inviteCode) || apiData;
      } else if (apiData[inviteCode]) {
        codeData = apiData[inviteCode];
      }

      const result = await dataFetcher.saveDailyData(inviteCode, codeData);
      res.json({ success: true, message: '数据抓取成功', result });
    } else {
      // 抓取所有邀请码
      const result = await dataFetcher.fetchAndSaveAllData();
      res.json({ success: true, message: '批量数据抓取成功', result });
    }
  } catch (error) {
    console.error('数据抓取失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 获取定时任务状态
 */
router.get('/scheduler/status', (req, res) => {
  try {
    const status = scheduler.getStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('获取定时任务状态失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 手动执行定时任务
 */
router.post('/scheduler/run', async (req, res) => {
  try {
    const result = await scheduler.runNow();
    res.json({ success: true, message: '定时任务执行成功', result });
  } catch (error) {
    console.error('执行定时任务失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
