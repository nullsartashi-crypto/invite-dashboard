const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const db = require('../config/db');
require('dotenv').config();

class TelegramNotifier {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;

    // 配置代理（如果设置了）
    this.proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (this.proxyUrl) {
      console.log(`使用代理: ${this.proxyUrl}`);
      this.httpsAgent = new HttpsProxyAgent(this.proxyUrl);
    }
  }

  /**
   * 发送每日报告
   */
  async sendDailyReport() {
    try {
      console.log('开始生成Telegram每日报告...');

      // 1. 获取昨日数据
      const yesterdayData = await this.getYesterdayData();

      if (!yesterdayData || yesterdayData.top5.length === 0) {
        console.log('昨日没有数据，跳过Telegram通知');
        return;
      }

      // 2. 格式化消息
      const message = this.formatMessage(yesterdayData);

      // 3. 发送到Telegram
      await this.sendMessage(message);

      console.log('Telegram每日报告发送成功');
    } catch (error) {
      console.error('Telegram通知发送失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取昨日数据
   */
  async getYesterdayData() {
    try {
      // 计算昨日日期（UTC时间）
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // 获取昨日数据并按昨日新增交易用户数排序Top5
      const [rows] = await db.query(`
        SELECT
          d.invite_code,
          c.name,
          d.daily_new_invite_users,
          d.daily_new_trade_users,
          d.daily_new_trade_amount
        FROM daily_invite_data d
        LEFT JOIN invite_codes c ON d.invite_code = c.invite_code
        WHERE d.record_date = ?
          AND c.status = 1
        ORDER BY d.daily_new_trade_users DESC
        LIMIT 5
      `, [yesterdayStr]);

      if (rows.length === 0) {
        return null;
      }

      return {
        totalNewInviteUsers: rows.reduce((sum, r) => sum + (r.daily_new_invite_users || 0), 0),
        totalNewTradeUsers: rows.reduce((sum, r) => sum + (r.daily_new_trade_users || 0), 0),
        totalNewTradeAmount: rows.reduce((sum, r) => sum + parseFloat(r.daily_new_trade_amount || 0), 0),
        top5: rows
      };
    } catch (error) {
      console.error('获取昨日数据失败:', error.message);
      throw error;
    }
  }

  /**
   * 格式化消息
   */
  formatMessage(data) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 1);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    let message = `【XXYY 邀请数据 ${dateStr}】\n`;
    message += `昨日新增邀请用户数：${data.totalNewInviteUsers}\n`;
    message += `昨日新增交易用户数：${data.totalNewTradeUsers}\n`;
    message += `昨日新增交易总额：${data.totalNewTradeAmount.toFixed(4)}\n\n`;
    message += `昨日邀请榜 top5：\n`;

    data.top5.forEach((item, index) => {
      const name = item.name || item.invite_code;
      const newInviteUsers = item.daily_new_invite_users || 0;
      const newTradeUsers = item.daily_new_trade_users || 0;
      const newTradeAmount = parseFloat(item.daily_new_trade_amount || 0).toFixed(2);

      message += `${index + 1}、「${name}」注册：${newInviteUsers}  交易：${newTradeUsers} 交易额：${newTradeAmount}\n`;
    });

    return message;
  }

  /**
   * 发送消息到Telegram
   */
  async sendMessage(text) {
    try {
      if (!this.botToken || !this.chatId) {
        throw new Error('Telegram配置未设置：缺少 TELEGRAM_BOT_TOKEN 或 TELEGRAM_CHAT_ID');
      }

      const url = `${this.apiUrl}/sendMessage`;
      const config = {
        timeout: 30000
      };

      // 如果配置了代理，添加httpsAgent
      if (this.httpsAgent) {
        config.httpsAgent = this.httpsAgent;
        config.proxy = false;  // 禁用axios默认的proxy配置
      }

      const response = await axios.post(url, {
        chat_id: this.chatId,
        text: text,
        parse_mode: 'HTML'
      }, config);

      if (!response.data.ok) {
        throw new Error(`Telegram API返回错误: ${response.data.description || '未知错误'}`);
      }

      console.log('Telegram消息发送成功');
      return response.data;
    } catch (error) {
      if (error.response) {
        console.error('Telegram API错误:', error.response.data);
        throw new Error(`Telegram API错误: ${error.response.data.description || error.message}`);
      } else if (error.request) {
        console.error('网络请求失败:', error.message);
        throw new Error(`网络请求失败: ${error.message}`);
      } else {
        console.error('发送消息失败:', error.message);
        throw error;
      }
    }
  }

  /**
   * 测试消息发送
   */
  async testMessage() {
    try {
      const testMsg = '🤖 Telegram Bot测试消息\n\n系统正常运行中...';
      await this.sendMessage(testMsg);
      console.log('测试消息发送成功');
      return true;
    } catch (error) {
      console.error('测试消息发送失败:', error.message);
      return false;
    }
  }
}

module.exports = new TelegramNotifier();
