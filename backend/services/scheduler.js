const cron = require('node-cron');
const dataFetcher = require('./dataFetcher');
require('dotenv').config();

class Scheduler {
  constructor() {
    this.cronSchedule = process.env.CRON_SCHEDULE || '0 0 * * *'; // 默认每天UTC 0点
    this.task = null;
  }

  /**
   * 启动定时任务
   */
  start() {
    if (this.task) {
      console.log('定时任务已在运行');
      return;
    }

    console.log(`启动定时任务，执行计划: ${this.cronSchedule} (UTC)`);

    this.task = cron.schedule(this.cronSchedule, async () => {
      console.log(`[${new Date().toISOString()}] 开始执行定时数据抓取任务`);

      try {
        // 1. 抓取数据
        const result = await dataFetcher.fetchAndSaveAllData();
        console.log(`[${new Date().toISOString()}] 数据抓取完成:`, result);

        // 2. 发送Telegram通知
        const telegramNotifier = require('./telegramNotifier');
        await telegramNotifier.sendDailyReport();
        console.log(`[${new Date().toISOString()}] Telegram通知发送完成`);

      } catch (error) {
        console.error(`[${new Date().toISOString()}] 定时任务执行失败:`, error.message);
      }
    }, {
      timezone: "UTC"  // 使用UTC时区
    });

    console.log('定时任务启动成功');
  }

  /**
   * 停止定时任务
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('定时任务已停止');
    }
  }

  /**
   * 手动执行一次任务
   */
  async runNow() {
    console.log(`[${new Date().toISOString()}] 手动执行数据抓取任务`);

    try {
      const result = await dataFetcher.fetchAndSaveAllData();
      console.log(`[${new Date().toISOString()}] 手动任务执行完成:`, result);
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 手动任务执行失败:`, error.message);
      throw error;
    }
  }

  /**
   * 获取任务状态
   */
  getStatus() {
    return {
      isRunning: this.task !== null,
      schedule: this.cronSchedule,
      nextRun: this.task ? '按计划执行' : '未启动'
    };
  }
}

module.exports = new Scheduler();
