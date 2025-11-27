const telegramNotifier = require('./services/telegramNotifier');
require('dotenv').config();

async function sendTestMessage() {
  try {
    console.log('开始发送Telegram测试消息...');
    console.log(`Bot Token: ${process.env.TELEGRAM_BOT_TOKEN}`);
    console.log(`Chat ID: ${process.env.TELEGRAM_CHAT_ID}`);

    // 构造测试消息（模拟昨日数据格式）
    const testData = {
      totalNewInviteUsers: 391,
      totalNewTradeUsers: 72,
      totalNewTradeAmount: 13030.0649,
      top5: [
        { invite_code: 'cryptoD', name: '加密大佬' },
        { invite_code: '666666', name: '测试邀请码' },
        { invite_code: 'testCode', name: null },  // 测试没有备注名的情况
        { invite_code: 'abc123', name: '推广专用' },
        { invite_code: 'xyz789', name: 'VIP邀请' }
      ]
    };

    // 格式化消息
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 1);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    let message = `【XXYY 邀请数据 ${dateStr}】\n`;
    message += `昨日新增邀请用户数：${testData.totalNewInviteUsers}\n`;
    message += `昨日新增交易用户数：${testData.totalNewTradeUsers}\n`;
    message += `昨日新增交易总额：${testData.totalNewTradeAmount.toFixed(4)}\n\n`;
    message += `昨日邀请榜 top5：\n`;

    testData.top5.forEach((item, index) => {
      const name = item.name || item.invite_code;
      message += `${index + 1}、${item.invite_code}「${name}」\n`;
    });

    console.log('\n准备发送的消息内容：');
    console.log('='.repeat(50));
    console.log(message);
    console.log('='.repeat(50));

    // 发送消息
    await telegramNotifier.sendMessage(message);

    console.log('\n✅ 测试消息发送成功！');
    console.log('请检查Telegram群组是否收到消息。');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 测试消息发送失败：', error.message);
    if (error.response) {
      console.error('API响应：', error.response.data);
    }
    process.exit(1);
  }
}

sendTestMessage();
