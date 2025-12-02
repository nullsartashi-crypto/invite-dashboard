const axios = require('axios');
const db = require('../config/db');
require('dotenv').config();

class DataFetcher {
  constructor() {
    this.apiUrl = process.env.API_URL || 'https://trade.pepeboost888.io/api/trade/user/invite/data';
    this.apiPassword = process.env.API_PASSWORD || 'inviteCodes978';
  }

  /**
   * 从API获取邀请数据
   * @param {string[]} inviteCodes - 邀请码数组
   * @returns {Promise<Object>} API返回的数据
   */
  async fetchInviteData(inviteCodes) {
    try {
      const codes = Array.isArray(inviteCodes) ? inviteCodes.join(',') : inviteCodes;
      const url = `${this.apiUrl}?pwd=${this.apiPassword}&inviteCodes=${codes}`;

      console.log(`正在获取邀请数据: ${codes}`);
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (response.data) {
        return response.data;
      }

      throw new Error('API返回数据为空');
    } catch (error) {
      console.error('获取邀请数据失败:', error.message);
      throw error;
    }
  }

  /**
   * 保存每日数据到数据库
   * @param {string} inviteCode - 邀请码
   * @param {Object} apiData - API返回的数据
   * @param {Date} recordDate - 记录日期
   */
  async saveDailyData(inviteCode, apiData, recordDate = new Date()) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const dateStr = recordDate.toISOString().split('T')[0];

      // 从API数据中提取统计信息（支持中文和英文字段名）
      const totalInviteUsers = apiData['总邀请用户'] || apiData.inviteUsers || 0;
      const totalTradeUsers = apiData['总邀请交易用户'] || apiData.tradeUsers || 0;
      const totalTradeAmount = apiData['邀请总交易额'] || apiData.tradeAmount || 0;
      const totalSelfTradeAmount = apiData['用户自己交易额'] || apiData.selfTradeAmount || 0;

      // 获取该邀请码的基准数据
      const [inviteCodeRecord] = await connection.query(
        'SELECT baseline_invite_users, baseline_trade_users, baseline_trade_amount, baseline_self_trade_amount FROM invite_codes WHERE invite_code = ?',
        [inviteCode]
      );

      let dailyNewInviteUsers, dailyNewTradeUsers, dailyNewTradeAmount, dailyNewSelfTradeAmount;

      // 获取前一天的数据用于计算真正的每日新增
      const [previousData] = await connection.query(
        'SELECT * FROM daily_invite_data WHERE invite_code = ? AND record_date < ? ORDER BY record_date DESC LIMIT 1',
        [inviteCode, dateStr]
      );

      if (previousData.length > 0) {
        // 使用前一天数据计算每日新增（今天的total - 昨天的total）
        const prev = previousData[0];
        dailyNewInviteUsers = totalInviteUsers - (prev.total_invite_users || 0);
        dailyNewTradeUsers = totalTradeUsers - (prev.total_trade_users || 0);
        dailyNewTradeAmount = totalTradeAmount - (prev.total_trade_amount || 0);
        dailyNewSelfTradeAmount = totalSelfTradeAmount - (prev.total_self_trade_amount || 0);
      } else {
        // 第一条数据，daily_new设为0（因为是基准数据）
        dailyNewInviteUsers = 0;
        dailyNewTradeUsers = 0;
        dailyNewTradeAmount = 0;
        dailyNewSelfTradeAmount = 0;
      }

      // 确保新增数据不为负数（防止数据异常）
      dailyNewInviteUsers = Math.max(0, dailyNewInviteUsers);
      dailyNewTradeUsers = Math.max(0, dailyNewTradeUsers);
      dailyNewTradeAmount = Math.max(0, dailyNewTradeAmount);
      dailyNewSelfTradeAmount = Math.max(0, dailyNewSelfTradeAmount);

      // 插入或更新数据
      await connection.query(
        `INSERT INTO daily_invite_data
        (invite_code, record_date, total_invite_users, total_trade_users,
         total_trade_amount, total_self_trade_amount, daily_new_invite_users,
         daily_new_trade_users, daily_new_trade_amount, daily_new_self_trade_amount, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          total_invite_users = VALUES(total_invite_users),
          total_trade_users = VALUES(total_trade_users),
          total_trade_amount = VALUES(total_trade_amount),
          total_self_trade_amount = VALUES(total_self_trade_amount),
          daily_new_invite_users = VALUES(daily_new_invite_users),
          daily_new_trade_users = VALUES(daily_new_trade_users),
          daily_new_trade_amount = VALUES(daily_new_trade_amount),
          daily_new_self_trade_amount = VALUES(daily_new_self_trade_amount),
          raw_data = VALUES(raw_data),
          updated_at = CURRENT_TIMESTAMP`,
        [
          inviteCode,
          dateStr,
          totalInviteUsers,
          totalTradeUsers,
          totalTradeAmount,
          totalSelfTradeAmount,
          dailyNewInviteUsers,
          dailyNewTradeUsers,
          dailyNewTradeAmount,
          dailyNewSelfTradeAmount,
          JSON.stringify(apiData)
        ]
      );

      await connection.commit();
      console.log(`邀请码 ${inviteCode} 的 ${dateStr} 数据保存成功`);

      return {
        success: true,
        inviteCode,
        date: dateStr,
        data: {
          totalInviteUsers,
          totalTradeUsers,
          totalTradeAmount,
          totalSelfTradeAmount,
          dailyNewInviteUsers,
          dailyNewTradeUsers,
          dailyNewTradeAmount,
          dailyNewSelfTradeAmount
        }
      };
    } catch (error) {
      await connection.rollback();
      console.error('保存数据失败:', error.message);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 批量获取并保存所有邀请码的数据
   */
  async fetchAndSaveAllData() {
    try {
      // 获取所有启用的邀请码
      const [inviteCodes] = await db.query(
        'SELECT invite_code FROM invite_codes WHERE status = 1'
      );

      if (inviteCodes.length === 0) {
        console.log('没有启用的邀请码');
        return { success: true, message: '没有启用的邀请码' };
      }

      const results = [];

      // 为每个邀请码单独获取数据
      for (const row of inviteCodes) {
        try {
          const apiData = await this.fetchInviteData([row.invite_code]);

          // API可能返回多个邀请码的数据，需要提取对应的数据
          let codeData = apiData;
          if (apiData.data && Array.isArray(apiData.data)) {
            // 支持中文和英文邀请码字段，不区分大小写
            codeData = apiData.data.find(d =>
              (d['邀请码'] && d['邀请码'].toLowerCase() === row.invite_code.toLowerCase()) ||
              (d.inviteCode && d.inviteCode.toLowerCase() === row.invite_code.toLowerCase())
            );

            if (!codeData) {
              console.log(`未找到邀请码 ${row.invite_code} 的数据`);
              continue;
            }
          } else if (apiData[row.invite_code]) {
            codeData = apiData[row.invite_code];
          }

          const result = await this.saveDailyData(row.invite_code, codeData);
          results.push(result);

          // 避免请求过快
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`处理邀请码 ${row.invite_code} 失败:`, error.message);
          results.push({
            success: false,
            inviteCode: row.invite_code,
            error: error.message
          });
        }
      }

      return {
        success: true,
        message: `处理了 ${results.length} 个邀请码`,
        results
      };
    } catch (error) {
      console.error('批量获取数据失败:', error.message);
      throw error;
    }
  }
}

module.exports = new DataFetcher();
