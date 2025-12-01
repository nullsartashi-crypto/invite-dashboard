/**
 * 本地测试Telegram Bot功能
 * 这个脚本会：
 * 1. 测试连接Telegram API
 * 2. 获取最新消息
 * 3. 模拟处理 /invite 命令
 */

require('dotenv').config();
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const db = require('./config/db');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

async function testBotConnection() {
  console.log('=== 测试Telegram Bot连接 ===\n');
  console.log(`Bot Token: ${BOT_TOKEN.substring(0, 20)}...`);
  console.log(`Chat ID: ${CHAT_ID}`);
  console.log(`代理设置: ${PROXY_URL || '无代理'}\n`);

  // 测试1: 获取Bot信息
  console.log('测试1: 获取Bot信息...');
  try {
    const config = { timeout: 10000 };
    if (PROXY_URL) {
      config.httpsAgent = new HttpsProxyAgent(PROXY_URL);
      config.proxy = false;
    }

    const response = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getMe`,
      config
    );

    if (response.data.ok) {
      console.log('✅ Bot连接成功!');
      console.log(`   Bot名称: ${response.data.result.first_name}`);
      console.log(`   用户名: @${response.data.result.username}\n`);
    }
  } catch (error) {
    if (PROXY_URL) {
      console.log('❌ 使用代理连接失败，尝试直接连接...');
      try {
        const response = await axios.get(
          `https://api.telegram.org/bot${BOT_TOKEN}/getMe`,
          { timeout: 10000 }
        );
        if (response.data.ok) {
          console.log('✅ 直接连接成功! (建议在Railway环境变量中移除HTTPS_PROXY和HTTP_PROXY)');
          console.log(`   Bot名称: ${response.data.result.first_name}`);
          console.log(`   用户名: @${response.data.result.username}\n`);
        }
      } catch (directError) {
        console.error('❌ 直接连接也失败:', directError.message);
        return false;
      }
    } else {
      console.error('❌ 连接失败:', error.message);
      return false;
    }
  }

  // 测试2: 获取最新消息
  console.log('测试2: 获取最近的消息更新...');
  try {
    const config = { timeout: 10000 };
    if (PROXY_URL) {
      try {
        config.httpsAgent = new HttpsProxyAgent(PROXY_URL);
        config.proxy = false;
        var response = await axios.get(
          `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`,
          config
        );
      } catch (proxyError) {
        console.log('   代理获取失败，使用直接连接...');
        response = await axios.get(
          `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`,
          { timeout: 10000 }
        );
      }
    } else {
      response = await axios.get(
        `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`,
        { timeout: 10000 }
      );
    }

    if (response.data.ok) {
      const updates = response.data.result;
      console.log(`✅ 成功获取 ${updates.length} 条更新\n`);

      if (updates.length > 0) {
        console.log('最近的几条消息:');
        updates.slice(-5).forEach((update, idx) => {
          if (update.message) {
            const msg = update.message;
            console.log(`   ${idx + 1}. [${msg.chat.id}] ${msg.from?.username || msg.from?.first_name}: ${msg.text}`);
          }
        });
        console.log('');

        // 检查是否有 /invite 命令
        const inviteCommands = updates.filter(u =>
          u.message?.text?.match(/^\/invite\s+\S+/)
        );

        if (inviteCommands.length > 0) {
          console.log(`发现 ${inviteCommands.length} 条 /invite 命令:`);
          for (const cmd of inviteCommands) {
            const match = cmd.message.text.match(/^\/invite\s+(\S+)/);
            const inviteCode = match[1];
            const chatId = cmd.message.chat.id;

            console.log(`\n   命令: ${cmd.message.text}`);
            console.log(`   来自群组ID: ${chatId} (配置的群组ID: ${CHAT_ID})`);
            console.log(`   匹配: ${chatId.toString() === CHAT_ID ? '✅ 是' : '❌ 否'}`);

            if (chatId.toString() === CHAT_ID) {
              console.log(`\n   模拟查询邀请码 ${inviteCode} 的数据...`);
              const data = await getInviteCodeData(inviteCode);
              if (data) {
                console.log('   ✅ 找到数据:');
                console.log(`      7日新增邀请用户: ${data.newInviteUsers7d}`);
                console.log(`      7日新增交易用户: ${data.newTradeUsers7d}`);
                console.log(`      总邀请用户: ${data.totalInviteUsers}`);
              } else {
                console.log('   ❌ 未找到该邀请码的数据');
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ 获取更新失败:', error.message);
    return false;
  }

  return true;
}

async function getInviteCodeData(inviteCode) {
  try {
    const [codeInfo] = await db.query(
      'SELECT name, status FROM invite_codes WHERE invite_code = ?',
      [inviteCode]
    );

    if (codeInfo.length === 0 || codeInfo[0].status !== 1) {
      return null;
    }

    const name = codeInfo[0].name || inviteCode;

    const [latestData] = await db.query(
      `SELECT total_invite_users, total_trade_users, total_trade_amount
       FROM daily_invite_data WHERE invite_code = ?
       ORDER BY record_date DESC LIMIT 1`,
      [inviteCode]
    );

    if (latestData.length === 0) return null;

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
    console.error('查询失败:', error.message);
    return null;
  }
}

// 运行测试
testBotConnection().then(() => {
  console.log('\n测试完成!');
  process.exit(0);
}).catch(error => {
  console.error('\n测试失败:', error);
  process.exit(1);
});
