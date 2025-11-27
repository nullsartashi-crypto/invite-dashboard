const mysql = require('mysql2/promise');
require('dotenv').config();

// 支持两种环境变量格式：
// 1. Railway MySQL 插件：MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
// 2. 自定义配置：DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
  port: process.env.DB_PORT || process.env.MYSQL_PORT || 3306,
  user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'invite_dashboard',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

pool.getConnection()
  .then(connection => {
    console.log('数据库连接成功');
    connection.release();
  })
  .catch(err => {
    console.error('数据库连接失败:', err.message);
  });

module.exports = pool;
