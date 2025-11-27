# Railway 部署指南

本文档说明如何将邀请数据统计系统部署到 Railway.app。

## 前提条件

1. 注册 [Railway](https://railway.app/) 账号
2. 准备好 MySQL 数据库（可以使用 Railway 的 MySQL 插件）
3. 准备好 Telegram Bot Token 和 Chat ID

## 部署步骤

### 1. 创建 Railway 项目

1. 登录 [Railway Dashboard](https://railway.app/dashboard)
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择你的 `invite-dashboard` 仓库
5. Railway 会自动检测到 Dockerfile 并开始构建

### 2. 添加 MySQL 数据库

1. 在项目中点击 "New"
2. 选择 "Database" → "Add MySQL"
3. Railway 会自动创建 MySQL 实例
4. 记下数据库连接信息（会自动注入环境变量）

### 3. 配置环境变量

在 Railway 项目的 "Variables" 标签页中添加以下环境变量：

#### 必需的环境变量

**重要**：如果你使用 Railway 的 MySQL 插件，数据库相关的环境变量会**自动注入**，不需要手动配置！

只需要配置以下变量：

```env
# API配置
API_URL=https://trade.pepeboost888.io/api/trade/user/invite/data
API_PASSWORD=inviteCodes978

# 定时任务配置（每天UTC 0点）
CRON_SCHEDULE=0 0 * * *

# Telegram Bot配置
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

如果使用外部 MySQL 数据库（不是 Railway 插件），则需要手动配置：

```env
# 数据库配置（仅在使用外部数据库时需要）
DB_HOST=your_mysql_host
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=invite_dashboard
```

#### 可选的环境变量（如果需要代理）

```env
# 代理配置（如果 Railway 服务器无法访问 Telegram，才需要配置）
# 注意：Railway 的美国/欧洲服务器通常不需要代理
# HTTPS_PROXY=http://proxy-server:port
# HTTP_PROXY=http://proxy-server:port
```

### 4. 初始化数据库

部署成功后，需要初始化数据库表：

1. 进入 Railway 项目的 "Deployments" 标签
2. 找到最新的部署，点击查看日志
3. 在项目设置中，临时修改启动命令来初始化数据库：
   ```bash
   node scripts/initDb.js && node app.js
   ```
4. 重新部署
5. 初始化完成后，改回原来的启动命令：
   ```bash
   node app.js
   ```

或者使用 Railway CLI：

```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 连接到项目
railway link

# 运行初始化脚本
railway run node backend/scripts/initDb.js
```

### 5. 验证部署

1. 访问 Railway 提供的域名（在项目的 "Settings" → "Domains" 中查看）
2. 检查 `/health` 端点是否正常：
   ```
   https://your-app.railway.app/health
   ```
3. 访问前端页面，检查数据是否正常显示

## 数据库连接配置

### Railway MySQL 插件（推荐）

当你在 Railway 项目中添加 MySQL 插件后，Railway 会自动注入以下环境变量：

- `MYSQL_HOST` - 数据库主机地址
- `MYSQL_PORT` - 数据库端口
- `MYSQL_USER` - 数据库用户名
- `MYSQL_PASSWORD` - 数据库密码
- `MYSQL_DATABASE` - 数据库名称

**我们的应用会自动检测并使用这些变量**，无需任何额外配置！

### 自定义数据库

如果使用外部 MySQL 数据库，可以配置以下环境变量：

- `DB_HOST` - 数据库主机地址
- `DB_PORT` - 数据库端口
- `DB_USER` - 数据库用户名
- `DB_PASSWORD` - 数据库密码
- `DB_NAME` - 数据库名称

应用会优先使用 `DB_*` 变量，如果没有则使用 `MYSQL_*` 变量。

## 自定义域名（可选）

1. 在 Railway 项目的 "Settings" → "Domains" 中
2. 点击 "Add Domain"
3. 输入你的自定义域名
4. 按照提示配置 DNS 记录（CNAME 或 A 记录）

## 定时任务

定时任务会在容器启动后自动运行，默认在每天 UTC 0:00（北京时间 8:00）执行数据抓取和 Telegram 通知。

可以通过修改 `CRON_SCHEDULE` 环境变量来调整执行时间：

- `0 0 * * *` - 每天 UTC 0:00
- `0 16 * * *` - 每天 UTC 16:00（北京时间 0:00）
- `0 */6 * * *` - 每 6 小时一次

## 监控和日志

### 查看日志

在 Railway Dashboard 中：
1. 进入项目
2. 点击 "Deployments"
3. 选择最新的部署
4. 查看实时日志

### 监控服务状态

访问健康检查端点：
```
https://your-app.railway.app/health
```

返回示例：
```json
{
  "status": "ok",
  "timestamp": "2025-11-27T10:00:00.000Z",
  "scheduler": {
    "isRunning": true,
    "schedule": "0 0 * * *"
  }
}
```

## 常见问题

### 1. 构建失败

**问题**：Docker 构建失败
**解决**：检查 Dockerfile 和 .dockerignore 文件是否正确

### 2. 数据库连接失败

**问题**：应用无法连接到数据库
**解决**：
- 确认 MySQL 插件已添加到项目
- 检查环境变量是否正确配置
- 确保数据库和应用在同一个 Railway 项目中

### 3. Telegram 通知失败

**问题**：无法发送 Telegram 消息
**解决**：
- Railway 的服务器位于美国/欧洲，通常可以直接访问 Telegram
- 不需要配置代理（除非特殊情况）
- 检查 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID 是否正确

### 4. 定时任务未执行

**问题**：定时任务没有按预期执行
**解决**：
- 检查日志确认定时任务是否启动
- 确认 CRON_SCHEDULE 格式正确
- 注意时区是 UTC，不是北京时间

### 5. 前端 404 错误

**问题**：访问前端页面显示 404
**解决**：
- 确认前端构建成功（查看构建日志）
- 确认 backend/public 目录包含前端文件
- 检查 app.js 中的静态文件配置

## 成本估算

Railway 提供免费额度：
- 500小时/月的运行时间
- 100GB 出站流量
- 8GB 内存
- 8GB 磁盘空间

对于小型项目，免费额度通常足够使用。

## 更新部署

当代码有更新时：

1. 提交代码到 GitHub：
   ```bash
   git add .
   git commit -m "更新说明"
   git push
   ```

2. Railway 会自动检测到更新并重新部署

或者手动触发部署：
1. 在 Railway Dashboard 中进入项目
2. 点击 "Deployments"
3. 点击 "Deploy"

## 回滚部署

如果新版本有问题：

1. 在 Railway Dashboard 中进入 "Deployments"
2. 找到之前的稳定版本
3. 点击 "Redeploy"

## 技术支持

- Railway 文档：https://docs.railway.app/
- Railway 社区：https://help.railway.app/
