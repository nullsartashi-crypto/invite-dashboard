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

      // 处理不同的返回情况
      if (!data) {
        console.log(`❌ 未找到邀请码 ${inviteCode} 的数据`);
        await this.sendMessage('未找到该邀请码的数据，可能是邀请码不存在或 API 查询失败', chatId);
        return;
      }

      // 邀请码已被禁用
      if (data.error === 'disabled') {
        console.log(`⚠️  邀请码 ${inviteCode} 已被禁用`);
        await this.sendMessage('该邀请码已被禁用', chatId);
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

      // 邀请码不存在，尝试自动添加
      if (codeInfo.length === 0) {
        console.log(`邀请码 ${inviteCode} 不存在，尝试自动添加...`);
        const added = await this.autoAddInviteCode(inviteCode);

        if (!added) {
          console.log(`❌ 自动添加邀请码 ${inviteCode} 失败`);
          return null; // 自动添加失败
        }

        // 自动添加成功，重新查询邀请码信息
        console.log(`✅ 自动添加成功，重新查询邀请码 ${inviteCode} 的数据`);
        const [newCodeInfo] = await db.query(
          'SELECT name, status FROM invite_codes WHERE invite_code = ?',
          [inviteCode]
        );

        if (newCodeInfo.length === 0) {
          console.log(`❌ 重新查询失败，未找到邀请码 ${inviteCode}`);
          return null;
        }

        // 使用新查询的数据继续
        codeInfo[0] = newCodeInfo[0];
      }

      // 邀请码已禁用
      if (codeInfo[0].status !== 1) {
        console.log(`⚠️  邀请码 ${inviteCode} 已被禁用`);
        return { error: 'disabled' };
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
   * 自动添加邀请码到系统
   * @param {string} inviteCode - 邀请码
   * @returns {Promise<boolean>} 是否添加成功
   */
  async autoAddInviteCode(inviteCode) {
    const connection = await db.getConnection();

    try {
      console.log(`🔄 开始自动添加邀请码: ${inviteCode}`);

      // 步骤 1: 调用 API 获取基准数据
      const dataFetcher = require('./dataFetcher');
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

      // 验证数据
      if (!codeData) {
        console.log(`❌ API 未返回邀请码 ${inviteCode} 的数据`);
        return false;
      }

      // 提取基准数据（支持中英文字段）
      const baselineInviteUsers = codeData['总邀请用户'] || codeData.inviteUsers || 0;
      const baselineTradeUsers = codeData['总邀请交易用户'] || codeData.tradeUsers || 0;
      const baselineTradeAmount = codeData['邀请总交易额'] || codeData.tradeAmount || 0;
      const baselineSelfTradeAmount = codeData['用户自己交易额'] || codeData.selfTradeAmount || 0;
      const baselineDate = new Date().toISOString().split('T')[0];

      console.log(`✅ 获取到基准数据 - 总邀请用户: ${baselineInviteUsers}, 总交易用户: ${baselineTradeUsers}`);

      // 步骤 2: 数据库事务插入
      await connection.beginTransaction();

      // 插入 invite_codes 表（name = 邀请码本身）
      await connection.query(
        `INSERT INTO invite_codes
        (invite_code, name, baseline_invite_users, baseline_trade_users,
         baseline_trade_amount, baseline_self_trade_amount, baseline_date, baseline_raw_data, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          inviteCode,
          inviteCode, // 需求：使用邀请码本身作为备注名
          baselineInviteUsers,
          baselineTradeUsers,
          baselineTradeAmount,
          baselineSelfTradeAmount,
          baselineDate,
          JSON.stringify(codeData)
        ]
      );

      // 插入 daily_invite_data 表（累计=基准，新增=0）
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
      console.log(`✅ 邀请码 ${inviteCode} 自动添加成功`);
      return true;

    } catch (error) {
      await connection.rollback();

      // 处理重复添加（并发情况）
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(`⚠️  邀请码 ${inviteCode} 已被其他进程添加（并发）`);
        return true; // 虽然本次添加失败，但邀请码已存在，视为成功
      }

      console.error(`❌ 自动添加邀请码 ${inviteCode} 失败:`, error.message);
      return false;

    } finally {
      connection.release();
    }
  }

  /**
   * 格式化邀请数据消息
   */
  formatInviteData(data) {
    // 判断是否为首次添加（7日新增都为0）
    const isFirstTime = data.newInviteUsers7d === 0 &&
                        data.newTradeUsers7d === 0 &&
                        data.newTradeAmount7d === 0;

    let message = `「${data.name}」- ${data.inviteCode} 邀请数据\n`;

    // 首次添加显示提示
    if (isFirstTime) {
      message += '\n📌 此邀请码为首次查询，已自动添加到系统\n';
    }

    message += `
7 日新增邀请用户数：${data.newInviteUsers7d}
7 日新增交易用户数：${data.newTradeUsers7d}
7 日新增交易总额：${data.newTradeAmount7d.toFixed(4)}

总邀请用户数：${data.totalInviteUsers}
总交易用户数：${data.totalTradeUsers}
总交易总额：${data.totalTradeAmount.toFixed(4)}`;

    return message;
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
