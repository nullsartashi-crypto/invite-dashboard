/**
 * 数据库迁移脚本
 * 执行所有未执行的迁移文件
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./config/db');

async function runMigrations() {
  console.log('开始执行数据库迁移...\n');

  try {
    // 读取迁移文件
    const migrationFile = path.join(__dirname, '../database/migrations/001_add_baseline_fields.sql');

    if (!fs.existsSync(migrationFile)) {
      console.log('未找到迁移文件');
      process.exit(0);
    }

    const sql = fs.readFileSync(migrationFile, 'utf8');

    // 分割多个SQL语句（按分号分割，但要注意存储过程等情况）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

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
