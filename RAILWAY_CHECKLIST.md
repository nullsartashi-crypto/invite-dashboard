# Railway 部署问题诊断清单

如果遇到数据库连接失败，请按照以下步骤检查：

## 1. 确认 MySQL 插件已正确添加

### 检查步骤：

1. 登录 [Railway Dashboard](https://railway.app/dashboard)
2. 进入你的项目
3. 确认项目中有**两个服务**：
   - ✅ 你的应用服务（invite-dashboard）
   - ✅ MySQL 数据库服务

**如果只有一个服务，需要添加 MySQL：**

1. 点击项目中的 **"+ New"** 按钮
2. 选择 **"Database"**
3. 选择 **"Add MySQL"**
4. 等待 MySQL 创建完成

## 2. 检查环境变量引用

Railway MySQL 插件创建后，会自动生成以下变量：
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

### 重要：检查你的应用服务的环境变量

1. 点击你的**应用服务**（不是 MySQL 服务）
2. 进入 **"Variables"** 标签
3. 检查是否有 **"Shared Variables"** 部分，显示了 MySQL 的变量

**如果看不到 MySQL 变量：**

可能是应用和数据库不在同一个项目中，或者需要手动引用：

1. 在应用服务的 Variables 中，点击 **"+ New Variable"**
2. 选择 **"Reference"**
3. 选择 MySQL 服务
4. 添加以下引用：
   ```
   MYSQL_HOST -> MySQL.MYSQL_HOST
   MYSQL_PORT -> MySQL.MYSQL_PORT
   MYSQL_USER -> MySQL.MYSQL_USER
   MYSQL_PASSWORD -> MySQL.MYSQL_PASSWORD
   MYSQL_DATABASE -> MySQL.MYSQL_DATABASE
   ```

## 3. 配置必需的环境变量

在应用服务的 **Variables** 中添加（如果还没有）：

```env
API_URL=https://trade.pepeboost888.io/api/trade/user/invite/data
API_PASSWORD=inviteCodes978
CRON_SCHEDULE=0 0 * * *
TELEGRAM_BOT_TOKEN=你的bot_token
TELEGRAM_CHAT_ID=你的chat_id
```

## 4. 查看部署日志

1. 进入应用服务
2. 点击 **"Deployments"** 标签
3. 选择最新的部署
4. 查看日志，找到这一行：

```
数据库配置: { host: '...', port: ..., user: '...', database: '...', password: '***已设置***' }
```

**如果看到：**
- `host: 'localhost'` ❌ 环境变量未生效
- `host: 'xxx.railway.internal'` ✅ 正确

## 5. 重新部署

修改环境变量后，需要重新部署：

1. 在应用服务中，点击右上角的 **"..."** 菜单
2. 选择 **"Redeploy"**
3. 等待部署完成
4. 查看新的部署日志

## 6. 初始化数据库

连接成功后，需要初始化数据库表：

### 方法一：修改启动命令

1. 进入应用服务的 **"Settings"**
2. 找到 **"Deploy"** 部分
3. 在 **"Custom Start Command"** 中输入：
   ```bash
   node scripts/initDb.js && node app.js
   ```
4. 点击 **"Redeploy"**
5. 初始化完成后，改回：
   ```bash
   node app.js
   ```

### 方法二：使用 Railway CLI（推荐）

```bash
# 安装 CLI
npm install -g @railway/cli

# 登录
railway login

# 进入项目目录
cd /path/to/invite-dashboard

# 连接到项目
railway link

# 运行初始化脚本
railway run node backend/scripts/initDb.js
```

## 7. 验证部署

访问以下 URL 检查：

```
https://your-app.railway.app/health
```

应该返回：
```json
{
  "status": "ok",
  "timestamp": "2025-11-27T...",
  "scheduler": {
    "isRunning": true,
    "schedule": "0 0 * * *"
  }
}
```

## 常见问题

### 问题 1: 环境变量不生效

**原因**：Railway 可能使用了缓存的环境变量

**解决**：
1. 删除所有相关的环境变量
2. 重新添加
3. 触发完整重新部署（不是 Restart）

### 问题 2: MySQL 服务未启动

**检查**：
1. 进入 MySQL 服务
2. 查看 **"Deployments"** 确认服务正在运行
3. 查看 **"Metrics"** 确认有活动

### 问题 3: 网络连接问题

**原因**：应用无法访问 MySQL

**解决**：
1. 确认应用和 MySQL 在**同一个项目**中
2. 使用 Railway 的内部网络地址（通常是 `xxx.railway.internal`）
3. 不要使用公网地址连接数据库

### 问题 4: 数据库配置显示 localhost

**原因**：环境变量未正确注入

**解决**：
1. 确认 MySQL 服务已创建
2. 检查 Variables 标签是否有 MYSQL_* 变量
3. 如果没有，手动添加 Reference（见第2步）
4. 重新部署

## 获取帮助

如果以上步骤都无法解决问题，请提供以下信息：

1. 部署日志中的 "数据库配置" 那一行
2. Variables 标签的截图
3. 项目结构（有几个服务）
4. MySQL 服务的状态

这样可以更快地定位问题。
