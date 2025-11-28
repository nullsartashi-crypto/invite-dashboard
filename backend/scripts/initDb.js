const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
  let connection;

  try {
    // 连接配置（支持 DB_* 和 MYSQL_* 两种环境变量）
    const config = {
      host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306'),
      user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
      password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || ''
    };

    connection = await mysql.createConnection(config);

    console.log('已连接到MySQL服务器');
    console.log('连接配置:', {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password ? '***已设置***' : '***未设置***'
    });

    // 获取数据库名（支持两种环境变量）
    const dbName = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'invite_dashboard';
    console.log(`目标数据库: ${dbName}`);

    // 创建数据库
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`数据库 ${dbName} 创建成功或已存在`);

    // 切换到目标数据库
    await connection.query(`USE \`${dbName}\``);

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

    console.log('\n✅ 数据库初始化完成！');
    console.log(`\n你可以使用以下命令启动后端服务：`);
    console.log(`  cd backend`);
    console.log(`  npm start`);

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
