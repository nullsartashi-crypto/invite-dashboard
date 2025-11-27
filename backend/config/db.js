const mysql = require('mysql2/promise');
require('dotenv').config();

// 支持两种环境变量格式：
// 1. Railway MySQL 插件：MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
// 2. 自定义配置：DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306'),
  user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'invite_dashboard',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// 打印数据库配置（隐藏密码）
console.log('数据库配置:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database,
  password: dbConfig.password ? '***已设置***' : '***未设置***'
});

const pool = mysql.createPool(dbConfig);

// 测试数据库连接（带重试机制）
const testConnection = async (retries = 5, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      console.log('✅ 数据库连接成功');
      connection.release();
      return;
    } catch (err) {
      console.error(`数据库连接失败 (尝试 ${i + 1}/${retries}):`, err.message);
      if (i < retries - 1) {
        console.log(`等待 ${delay/1000} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('❌ 数据库连接失败，已达到最大重试次数');
        console.error('请检查以下环境变量是否正确配置：');
        console.error('- MYSQL_HOST 或 DB_HOST');
        console.error('- MYSQL_PORT 或 DB_PORT');
        console.error('- MYSQL_USER 或 DB_USER');
        console.error('- MYSQL_PASSWORD 或 DB_PASSWORD');
        console.error('- MYSQL_DATABASE 或 DB_NAME');
      }
    }
  }
};

testConnection();

module.exports = pool;
