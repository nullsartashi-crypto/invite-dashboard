/**
 * 数据库迁移脚本
 * 添加基准字段到 invite_codes 表
 */

require('dotenv').config();
const db = require('./config/db');

async function runMigrations() {
  console.log('开始执行数据库迁移...\n');

  try {
    // 直接定义 SQL 语句（避免文件路径问题）
    const statements = [
      // 第一条：添加基准字段
      `ALTER TABLE invite_codes
       ADD COLUMN baseline_invite_users INT DEFAULT 0 COMMENT '基准邀请用户数',
       ADD COLUMN baseline_trade_users INT DEFAULT 0 COMMENT '基准交易用户数',
       ADD COLUMN baseline_trade_amount DECIMAL(20, 2) DEFAULT 0 COMMENT '基准交易额',
       ADD COLUMN baseline_self_trade_amount DECIMAL(20, 2) DEFAULT 0 COMMENT '基准自己交易额',
       ADD COLUMN baseline_date DATE COMMENT '基准数据日期',
       ADD COLUMN baseline_raw_data JSON COMMENT '基准原始API数据'`,

      // 第二条：为已存在的邀请码初始化基准数据
      `UPDATE invite_codes ic
       INNER JOIN (
         SELECT
           invite_code,
           total_invite_users,
           total_trade_users,
           total_trade_amount,
           total_self_trade_amount,
           record_date,
           raw_data
         FROM daily_invite_data d1
         WHERE record_date = (
           SELECT MIN(record_date)
           FROM daily_invite_data d2
           WHERE d2.invite_code = d1.invite_code
         )
       ) first_record ON ic.invite_code = first_record.invite_code
       SET
         ic.baseline_invite_users = first_record.total_invite_users,
         ic.baseline_trade_users = first_record.total_trade_users,
         ic.baseline_trade_amount = first_record.total_trade_amount,
         ic.baseline_self_trade_amount = first_record.total_self_trade_amount,
         ic.baseline_date = first_record.record_date,
         ic.baseline_raw_data = first_record.raw_data`
    ];

    console.log(`找到 ${statements.length} 条SQL语句\n`);

    // 执行每条SQL语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`执行语句 ${i + 1}/${statements.length}...`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));

      try {
        await db.query(statement);
        console.log('✅ 执行成功\n');
      } catch (error) {
        // 如果是字段已存在的错误，忽略
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('⚠️  字段已存在，跳过\n');
        } else {
          console.error('❌ 执行失败:', error.message);
          throw error;
        }
      }
    }

    console.log('✅ 所有迁移执行完成！');
    process.exit(0);

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

// 运行迁移
runMigrations();
