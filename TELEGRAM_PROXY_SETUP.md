# Telegram Bot 代理配置说明

由于Telegram API在中国大陆被墙，需要配置代理才能发送消息。

## 方案一：使用Clash或其他代理软件

### 1. 启动Clash或其他代理软件

确保代理软件正在运行，并记下代理端口（常见端口：7890, 1087, 1080）

### 2. 修改 `.env` 文件

```env
# 代理配置
HTTPS_PROXY=http://127.0.0.1:7890
HTTP_PROXY=http://127.0.0.1:7890
```

将 `7890` 替换为你的实际代理端口。

### 3. 测试连接

```bash
cd backend
node test-telegram.js
```

## 方案二：使用服务器部署

如果你有海外服务器，可以将后端部署到服务器上，无需代理即可访问Telegram API。

## 方案三：临时禁用Telegram通知

如果暂时不需要Telegram通知功能，可以在 `.env` 中注释掉代理配置：

```env
# HTTPS_PROXY=http://127.0.0.1:7890
# HTTP_PROXY=http://127.0.0.1:7890
```

这样定时任务会继续运行，但会跳过Telegram通知（不会报错）。

## 常见代理软件端口

- Clash for Mac/Windows: 7890 (HTTP), 7891 (SOCKS5)
- V2RayX: 1087 (HTTP), 1080 (SOCKS5)
- Surge: 6152 (HTTP), 6153 (SOCKS5)
- Shadowsocks: 1080 (SOCKS5)

## 当前测试消息格式

```
【XXYY 邀请数据 2025-11-26】
昨日新增邀请用户数：391
昨日新增交易用户数：72
昨日新增交易总额：13030.0649

昨日邀请榜 top5：
1、cryptoD「加密大佬」
2、666666「测试邀请码」
3、testCode「testCode」
4、abc123「推广专用」
5、xyz789「VIP邀请」
```

## 检查代理是否可用

```bash
# 检查代理端口是否开启
lsof -iTCP -sTCP:LISTEN -n -P | grep 7890

# 通过代理测试Telegram连接
curl -x http://127.0.0.1:7890 https://api.telegram.org/botYOUR_TOKEN/getMe
```
