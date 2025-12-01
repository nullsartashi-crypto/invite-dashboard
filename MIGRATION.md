# 数据库迁移说明

## 问题

在 Railway 部署时，Telegram Bot 自动添加邀请码功能报错：
```
Unknown column 'baseline_invite_users' in 'field list'
```

## 原因

数据库表 `invite_codes` 缺少基准数据字段（baseline_* 字段）。

## 解决方案

### 方法 1：在 Railway 中执行迁移脚本（推荐）

1. **等待 Railway 自动部署完成**
   - Railway 会自动从 GitHub 拉取最新代码并重新部署

2. **在 Railway 控制台执行迁移命令**
   - 进入 Railway 项目的 backend service
   - 点击 "Settings" → 滚动到 "Deploy" 部分
   - 找到 "Custom Start Command" 并临时修改为：
     ```
     npm run migrate && npm start
     ```
   - 保存后会自动重新部署并执行迁移

3. **恢复启动命令**
   - 迁移完成后，将 "Custom Start Command" 改回：
     ```
     npm start
     ```
   - 或者删除该自定义命令使用默认启动方式

### 方法 2：使用 Railway CLI（如果安装了）

```bash
# 在本地终端执行
railway run npm run migrate
```

### 方法 3：手动在 Railway MySQL 插件中执行 SQL

1. 进入 Railway 项目的 MySQL 插件
2. 点击 "Connect" → 使用 MySQL 客户端连接
3. 执行以下 SQL：

```sql
-- 添加基准字段
ALTER TABLE invite_codes
ADD COLUMN baseline_invite_users INT DEFAULT 0 COMMENT '基准邀请用户数',
ADD COLUMN baseline_trade_users INT DEFAULT 0 COMMENT '基准交易用户数',
ADD COLUMN baseline_trade_amount DECIMAL(20, 2) DEFAULT 0 COMMENT '基准交易额',
ADD COLUMN baseline_self_trade_amount DECIMAL(20, 2) DEFAULT 0 COMMENT '基准自己交易额',
ADD COLUMN baseline_date DATE COMMENT '基准数据日期',
ADD COLUMN baseline_raw_data JSON COMMENT '基准原始API数据';

-- 为已存在的邀请码初始化基准数据
UPDATE invite_codes ic
INNER JOIN (
  SELECT
    invite_code,
    total_invite_users,
    total_trade_users,
    total_trade_amount,
    total_self_trade_amount,
    record_date,
    raw_data
  FROM daily_invite_data d1
  WHERE record_date = (
    SELECT MIN(record_date)
    FROM daily_invite_data d2
    WHERE d2.invite_code = d1.invite_code
  )
) first_record ON ic.invite_code = first_record.invite_code
SET
  ic.baseline_invite_users = first_record.total_invite_users,
  ic.baseline_trade_users = first_record.total_trade_users,
  ic.baseline_trade_amount = first_record.total_trade_amount,
  ic.baseline_self_trade_amount = first_record.total_self_trade_amount,
  ic.baseline_date = first_record.record_date,
  ic.baseline_raw_data = first_record.raw_data;
```

## 验证迁移成功

迁移完成后，在 Telegram 群组中发送：
```
/invite xxyyio
```

如果成功，应该看到：
- 自动调用 API 获取数据
- 显示邀请数据并标注 "📌 此邀请码为首次查询，已自动添加到系统"

## 迁移内容

此迁移会为 `invite_codes` 表添加以下字段：
- `baseline_invite_users`: 基准邀请用户数
- `baseline_trade_users`: 基准交易用户数
- `baseline_trade_amount`: 基准交易额
- `baseline_self_trade_amount`: 基准自己交易额
- `baseline_date`: 基准数据日期
- `baseline_raw_data`: 基准原始API数据

并为已存在的邀请码自动填充基准数据（使用第一条历史记录）。
