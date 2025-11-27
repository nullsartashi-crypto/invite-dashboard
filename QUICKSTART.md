# 快速入门指南

## 一、环境准备

确保你的系统已安装：
- Node.js (v14.0.0 或更高版本)
- MySQL (v5.7 或更高版本)

## 二、快速启动（推荐）

### macOS / Linux

```bash
cd invite-dashboard
chmod +x start.sh
./start.sh
```

### Windows

```bash
cd invite-dashboard
start.bat
```

启动脚本会自动完成：
1. 检查环境
2. 安装依赖
3. 配置数据库
4. 初始化数据库表
5. 启动前后端服务

## 三、手动启动

### 1. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 2. 配置环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的密码
DB_NAME=invite_dashboard

PORT=3000

API_URL=https://trade.pepeboost888.io/api/trade/user/invite/data
API_PASSWORD=inviteCodes978

CRON_SCHEDULE=0 8 * * *
```

### 3. 初始化数据库

```bash
cd backend
npm run init-db
```

### 4. 启动服务

```bash
# 终端1：启动后端
cd backend
npm start

# 终端2：启动前端
cd frontend
npm run dev
```

## 四、首次使用

### 1. 访问系统

打开浏览器访问：http://localhost:5173

### 2. 添加邀请码

1. 点击页面顶部的"管理邀请码"按钮
2. 点击"添加邀请码"
3. 输入邀请码（例如：666666）
4. 输入名称/备注（例如：测试邀请码）
5. 点击"确定"

### 3. 抓取数据

1. 点击"查看仪表盘"返回主页
2. 点击"立即抓取数据"按钮
3. 等待数据抓取完成
4. 查看仪表盘展示的数据

## 五、功能说明

### 邀请码管理
- 添加邀请码：支持添加多个邀请码
- 编辑邀请码：修改邀请码的名称/备注
- 启用/禁用：禁用的邀请码不会被定时任务抓取
- 删除邀请码：删除不再使用的邀请码

### 数据仪表盘
- **数据概览卡片**：显示累计邀请用户、交易用户、交易额、自己交易额
- **趋势图表**：
  - 每日邀请用户趋势（折线图）
  - 每日交易用户趋势（折线图）
  - 每日交易额趋势（折线图）
- **详细数据表格**：显示各邀请码的最新数据和昨日新增

### 定时任务
- 系统会在每天早上8点自动抓取所有启用状态的邀请码数据
- 自动计算每日新增数据
- 自动保存历史记录

## 六、常见问题

### 1. 端口被占用

如果 3000 或 5173 端口被占用，可以修改：
- 后端端口：修改 `backend/.env` 中的 `PORT`
- 前端端口：修改 `frontend/vite.config.js` 中的 `server.port`

### 2. 数据库连接失败

检查：
- MySQL 服务是否启动
- `.env` 中的数据库配置是否正确
- 数据库用户权限是否足够

### 3. 无法访问外部 API

检查：
- 网络连接是否正常
- API 地址是否正确
- 防火墙设置

## 七、下一步

- 添加更多邀请码
- 查看历史数据趋势
- 配置定时任务时间
- 根据数据进行分析和决策

## 八、获取帮助

如有问题，请查看：
- 完整文档：README.md
- 数据库表结构：database/schema.sql
- API 接口：查看 backend/routes/api.js
