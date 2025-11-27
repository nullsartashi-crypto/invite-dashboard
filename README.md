# 邀请数据统计系统

一个完整的邀请数据统计和可视化系统，支持多邀请码管理、自动数据抓取、历史数据记录和可视化仪表盘。

## 功能特性

- **邀请码管理**：支持添加、编辑、启用/禁用、删除邀请码
- **自动数据抓取**：每天早上8点自动抓取所有启用邀请码的数据
- **历史数据记录**：自动记录每天的数据，计算每日新增
- **数据可视化**：
  - 累计数据统计卡片
  - 每日邀请用户趋势图
  - 每日交易用户趋势图
  - 每日交易额趋势图
  - 详细数据表格
- **手动抓取**：支持随时手动触发数据抓取

## 技术栈

### 后端
- Node.js + Express
- MySQL 数据库
- node-cron (定时任务)
- axios (HTTP 请求)

### 前端
- Vue 3
- Element Plus (UI 组件库)
- ECharts (图表库)
- Vite (构建工具)

## 项目结构

```
invite-dashboard/
├── backend/                 # 后端服务
│   ├── config/
│   │   └── db.js           # 数据库配置
│   ├── routes/
│   │   └── api.js          # API 路由
│   ├── services/
│   │   ├── dataFetcher.js  # 数据抓取服务
│   │   └── scheduler.js    # 定时任务服务
│   ├── scripts/
│   │   └── initDb.js       # 数据库初始化脚本
│   ├── app.js              # 应用入口
│   ├── package.json
│   └── .env                # 环境配置
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── api/
│   │   │   └── index.js    # API 接口
│   │   ├── components/
│   │   │   ├── InviteCodeManager.vue  # 邀请码管理
│   │   │   └── Dashboard.vue          # 数据仪表盘
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── database/
    └── schema.sql          # 数据库表结构

## 安装步骤

### 1. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 2. 配置数据库

创建 MySQL 数据库，然后配置后端环境变量：

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件，配置你的数据库信息：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=invite_dashboard

# 服务器配置
PORT=3000

# API配置
API_URL=https://trade.pepeboost888.io/api/trade/user/invite/data
API_PASSWORD=inviteCodes978

# 定时任务配置（Cron表达式：每天早上8点）
CRON_SCHEDULE=0 8 * * *
```

### 3. 初始化数据库

```bash
cd backend
npm run init-db
```

这会自动创建数据库和表结构。

### 4. 启动服务

```bash
# 启动后端服务
cd backend
npm start

# 新开一个终端，启动前端服务
cd frontend
npm run dev
```

后端服务运行在：http://localhost:3000
前端应用运行在：http://localhost:5173

## 使用说明

### 1. 添加邀请码

1. 访问前端页面 http://localhost:5173
2. 点击顶部的"管理邀请码"按钮
3. 点击"添加邀请码"按钮
4. 输入邀请码和名称（备注）
5. 点击确定

### 2. 查看数据

1. 点击顶部的"查看仪表盘"按钮
2. 系统会自动加载最近7天的数据
3. 可以切换不同的天数查看趋势
4. 点击"立即抓取数据"可以手动触发数据更新

### 3. 自动数据抓取

系统会在每天早上8点自动抓取所有启用状态的邀请码数据，无需手动操作。

## API 接口文档

### 邀请码管理

- `GET /api/invite-codes` - 获取所有邀请码
- `POST /api/invite-codes` - 添加邀请码
- `PUT /api/invite-codes/:id` - 更新邀请码
- `DELETE /api/invite-codes/:id` - 删除邀请码

### 数据查询

- `GET /api/daily-data` - 获取每日数据
- `GET /api/yesterday-data` - 获取昨日数据
- `GET /api/summary` - 获取汇总统计
- `GET /api/dashboard` - 获取仪表盘数据

### 数据同步

- `POST /api/fetch-data` - 手动触发数据抓取
- `GET /api/scheduler/status` - 获取定时任务状态
- `POST /api/scheduler/run` - 手动执行定时任务

## 数据库表说明

### invite_codes (邀请码表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| invite_code | VARCHAR(100) | 邀请码（唯一） |
| name | VARCHAR(255) | 名称/备注 |
| status | TINYINT | 状态：1=启用，0=禁用 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### daily_invite_data (每日数据表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| invite_code | VARCHAR(100) | 邀请码 |
| record_date | DATE | 记录日期 |
| total_invite_users | INT | 累计邀请用户数 |
| total_trade_users | INT | 累计交易用户数 |
| total_trade_amount | DECIMAL(20,2) | 累计交易额 |
| total_self_trade_amount | DECIMAL(20,2) | 累计自己交易额 |
| daily_new_invite_users | INT | 当日新增邀请用户 |
| daily_new_trade_users | INT | 当日新增交易用户 |
| daily_new_trade_amount | DECIMAL(20,2) | 当日新增交易额 |
| daily_new_self_trade_amount | DECIMAL(20,2) | 当日新增自己交易额 |
| raw_data | JSON | 原始API数据 |

## 常见问题

### 1. 定时任务不执行？

检查：
- 后端服务是否正常运行
- .env 中的 CRON_SCHEDULE 配置是否正确
- 服务器时区是否正确

### 2. 无法连接数据库？

检查：
- MySQL 服务是否启动
- .env 中的数据库配置是否正确
- 数据库用户是否有足够的权限

### 3. 数据抓取失败？

检查：
- 网络连接是否正常
- API_URL 和 API_PASSWORD 是否正确
- 邀请码是否存在且有效

## 开发计划

- [ ] 添加数据导出功能（Excel）
- [ ] 支持多用户和权限管理
- [ ] 添加数据对比功能
- [ ] 支持邮件通知
- [ ] 添加更多图表类型

## 许可证

MIT
