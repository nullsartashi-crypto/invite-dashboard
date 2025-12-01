-- 为 invite_codes 表添加基准字段
ALTER TABLE invite_codes
ADD COLUMN baseline_invite_users INT DEFAULT 0 COMMENT '基准邀请用户数',
ADD COLUMN baseline_trade_users INT DEFAULT 0 COMMENT '基准交易用户数',
ADD COLUMN baseline_trade_amount DECIMAL(20, 2) DEFAULT 0 COMMENT '基准交易额',
ADD COLUMN baseline_self_trade_amount DECIMAL(20, 2) DEFAULT 0 COMMENT '基准自己交易额',
ADD COLUMN baseline_date DATE COMMENT '基准数据日期',
ADD COLUMN baseline_raw_data JSON COMMENT '基准原始API数据';

-- 为已存在的邀请码初始化基准数据（从第一条历史记录）
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
