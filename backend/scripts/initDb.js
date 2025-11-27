const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
  let connection;

  try {
    // 先连接到MySQL服务器（不指定数据库）
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('已连接到MySQL服务器');

    // 创建数据库
    const dbName = process.env.DB_NAME || 'invite_dashboard';
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`数据库 ${dbName} 创建成功或已存在`);

    // 切换到目标数据库
    await connection.query(`USE ${dbName}`);

    // 读取并执行SQL文件
    const sqlFile = path.join(__dirname, '../../database/schema.sql');

    if (fs.existsSync(sqlFile)) {
      const sql = fs.readFileSync(sqlFile, 'utf8');

      // 分割SQL语句并执行
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        await connection.query(statement);
      }

      console.log('数据库表创建成功');
    } else {
      console.log('SQL文件不存在，跳过表创建');
    }

    console.log('\n数据库初始化完成！');
    console.log(`\n你可以使用以下命令启动后端服务：`);
    console.log(`  cd backend`);
    console.log(`  npm start`);

  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
