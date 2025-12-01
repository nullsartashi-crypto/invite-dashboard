const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const db = require('../config/db');
require('dotenv').config();

class TelegramBotListener {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.offset = 0;
    this.isRunning = false;

    // 配置代理
    this.proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (this.proxyUrl) {
      console.log(`Bot监听器使用代理: ${this.proxyUrl}`);
      this.httpsAgent = new HttpsProxyAgent(this.proxyUrl);
    }
  }

  /**
   * 启动Bot监听器
   */
  async start() {
    if (this.isRunning) {
      console.log('Bot监听器已在运行');
      return;
    }

    // 诊断信息
    console.log('========== Telegram Bot 启动诊断 ==========');
    console.log(`Bot Token: ${this.botToken ? this.botToken.substring(0, 20) + '...' : '❌ 未设置'}`);
    console.log(`Chat ID: ${this.chatId || '❌ 未设置'}`);
    console.log(`API URL: ${this.apiUrl}`);
    console.log(`代理: ${this.proxyUrl || '无'}`);

    if (!this.botToken) {
      console.error('❌ 错误: TELEGRAM_BOT_TOKEN 环境变量未设置！');
      console.log('请在Railway环境变量中添加 TELEGRAM_BOT_TOKEN');
      return;
    }

    if (!this.chatId) {
      console.error('❌ 错误: TELEGRAM_CHAT_ID 环境变量未设置！');
      console.log('请在Railway环境变量中添加 TELEGRAM_CHAT_ID');
      return;
    }

    console.log('启动Telegram Bot监听器...');
    this.isRunning = true;
    this.poll().catch(error => {
      console.error('❌ Bot轮询致命错误:', error);
      this.isRunning = false;
    });
    console.log('✅ Bot监听器已启动，开始轮询');
    console.log('==========================================');
  }

  /**
   * 停止Bot监听器
   */
  stop() {
    console.log('停止Telegram Bot监听器');
    this.isRunning = false;
  }

  /**
   * 长轮询获取更新
   */
  async poll() {
    console.log('🔄 开始Bot轮询循环...');
    let pollCount = 0;

    while (this.isRunning) {
      try {
        pollCount++;
        if (pollCount === 1 || pollCount % 60 === 0) {
          console.log(`🔄 Bot轮询中... (第${pollCount}次)`);
        }

        const updates = await this.getUpdates();
        if (updates && updates.length > 0) {
          console.log(`📨 收到 ${updates.length} 条新消息`);
          for (const update of updates) {
            await this.handleUpdate(update);
            this.offset = update.update_id + 1;
          }
        }
      } catch (error) {
        console.error('❌ 轮询错误:', error.message);
        await this.sleep(5000); // 出错后等待5秒再重试
      }
      await this.sleep(1000); // 每次轮询间隔1秒
    }
    console.log('⏹️  Bot轮询已停止');
  }

  /**
   * 获取更新
   */
  async getUpdates() {
    try {
      const config = {
        timeout: 30000,
        params: {
          offset: this.offset,
          timeout: 25
        }
      };

      if (this.httpsAgent) {
        config.httpsAgent = this.httpsAgent;
        config.proxy = false;
      }

      const response = await axios.get(`${this.apiUrl}/getUpdates`, config);

      if (response.data.ok) {
        return response.data.result;
      }
      return [];
    } catch (error) {
      // 如果使用代理失败，尝试直接连接
      if (this.httpsAgent && !this.proxyFailed) {
        console.log('代理连接失败，尝试直接连接Telegram API...');
        this.proxyFailed = true;
        try {
          const config = {
            timeout: 30000,
            params: {
              offset: this.offset,
              timeout: 25
            }
          };
          const response = await axios.get(`${this.apiUrl}/getUpdates`, config);
          if (response.data.ok) {
            console.log('✅ 直接连接成功，后续将不使用代理');
            this.httpsAgent = null; // 禁用代理
            return response.data.result;
          }
        } catch (directError) {
          console.error('直接连接也失败:', directError.message);
        }
      }
      return [];
    }
  }

  /**
   * 处理更新
   */
  async handleUpdate(update) {
    try {
      if (!update.message || !update.message.text) {
        console.log('⏭️  跳过非文本消息');
        return;
      }

      const chatId = update.message.chat.id;
      const text = update.message.text.trim();
      const username = update.message.from?.username || update.message.from?.first_name || '未知用户';

      console.log(`📩 收到消息: [${chatId}] ${username}: ${text}`);

      // 只响应配置的群组
      if (chatId.toString() !== this.chatId) {
        console.log(`⏭️  跳过非目标群组消息 (群组ID: ${chatId}, 目标ID: ${this.chatId})`);
        return;
      }

      // 匹配 /invite 邀请码 格式
      const match = text.match(/^\/invite\s+(\S+)/);
      if (!match) {
        console.log(`⏭️  跳过非 /invite 命令`);
        return;
      }

      const inviteCode = match[1];
      console.log(`✅ 收到查询指令: /invite ${inviteCode}`);

      // 查询邀请码数据
      console.log(`🔍 查询邀请码 ${inviteCode} 的数据...`);
      const data = await this.getInviteCodeData(inviteCode);
      if (!data) {
        console.log(`❌ 未找到邀请码 ${inviteCode} 的数据`);
        await this.sendMessage('未找到该邀请码的数据', chatId);
        return;
      }

      // 格式化并发送消息
      console.log(`✅ 找到数据，准备发送...`);
      const message = this.formatInviteData(data);
      await this.sendMessage(message, chatId);
      console.log(`✅ 消息发送成功！`);

    } catch (error) {
      console.error('❌ 处理消息失败:', error.message);
      console.error(error.stack);
    }
  }

  /**
   * 查询邀请码数据
   */
  async getInviteCodeData(inviteCode) {
    try {
      // 检查邀请码是否存在且启用
      const [codeInfo] = await db.query(
        'SELECT name, status FROM invite_codes WHERE invite_code = ?',
        [inviteCode]
      );

      if (codeInfo.length === 0 || codeInfo[0].status !== 1) {
        return null;
      }

      const name = codeInfo[0].name || inviteCode;

      // 查询最新的累计数据
      const [latestData] = await db.query(
        `SELECT total_invite_users, total_trade_users, total_trade_amount
         FROM daily_invite_data
         WHERE invite_code = ?
         ORDER BY record_date DESC
         LIMIT 1`,
        [inviteCode]
      );

      if (latestData.length === 0) {
        return null;
      }

      // 查询7日新增数据
      const [sevenDayData] = await db.query(
        `SELECT
          SUM(daily_new_invite_users) as new_invite_users_7d,
          SUM(daily_new_trade_users) as new_trade_users_7d,
          SUM(daily_new_trade_amount) as new_trade_amount_7d
         FROM daily_invite_data
         WHERE invite_code = ?
           AND record_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
        [inviteCode]
      );

      return {
        inviteCode,
        name,
        newInviteUsers7d: sevenDayData[0]?.new_invite_users_7d || 0,
        newTradeUsers7d: sevenDayData[0]?.new_trade_users_7d || 0,
        newTradeAmount7d: parseFloat(sevenDayData[0]?.new_trade_amount_7d || 0),
        totalInviteUsers: latestData[0].total_invite_users || 0,
        totalTradeUsers: latestData[0].total_trade_users || 0,
        totalTradeAmount: parseFloat(latestData[0].total_trade_amount || 0)
      };

    } catch (error) {
      console.error('查询邀请码数据失败:', error.message);
      return null;
    }
  }

  /**
   * 格式化邀请数据消息
   */
  formatInviteData(data) {
    return `「${data.name}」- ${data.inviteCode} 邀请数据

7 日新增邀请用户数：${data.newInviteUsers7d}
7 日新增交易用户数：${data.newTradeUsers7d}
7 日新增交易总额：${data.newTradeAmount7d.toFixed(4)}

总邀请用户数：${data.totalInviteUsers}
总交易用户数：${data.totalTradeUsers}
总交易总额：${data.totalTradeAmount.toFixed(4)}`;
  }

  /**
   * 发送消息
   */
  async sendMessage(text, chatId) {
    try {
      const config = {
        timeout: 30000
      };

      if (this.httpsAgent) {
        config.httpsAgent = this.httpsAgent;
        config.proxy = false;
      }

      const response = await axios.post(
        `${this.apiUrl}/sendMessage`,
        {
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        },
        config
      );

      if (!response.data.ok) {
        throw new Error(`发送失败: ${response.data.description}`);
      }

      console.log('消息发送成功');
      return response.data;
    } catch (error) {
      // 如果代理失败，尝试直接连接
      if (this.httpsAgent) {
        console.log('代理发送失败，尝试直接发送...');
        try {
          const response = await axios.post(
            `${this.apiUrl}/sendMessage`,
            {
              chat_id: chatId,
              text: text,
              parse_mode: 'HTML'
            },
            { timeout: 30000 }
          );
          if (response.data.ok) {
            console.log('✅ 直接发送成功');
            return response.data;
          }
        } catch (directError) {
          console.error('直接发送也失败:', directError.message);
        }
      }
      console.error('发送消息失败:', error.message);
      throw error;
    }
  }

  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new TelegramBotListener();
