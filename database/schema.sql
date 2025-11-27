-- 邀请码管理表
CREATE TABLE IF NOT EXISTS invite_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invite_code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) COMMENT '邀请码名称/备注',
    status TINYINT DEFAULT 1 COMMENT '状态：1=启用，0=禁用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_invite_code (invite_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='邀请码管理表';

-- 每日邀请数据记录表
CREATE TABLE IF NOT EXISTS daily_invite_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invite_code VARCHAR(100) NOT NULL,
    record_date DATE NOT NULL COMMENT '记录日期',

    -- 累计数据（从注册到当天的总数据）
    total_invite_users INT DEFAULT 0 COMMENT '累计邀请用户数',
    total_trade_users INT DEFAULT 0 COMMENT '累计邀请交易用户数',
    total_trade_amount DECIMAL(20, 2) DEFAULT 0 COMMENT '累计邀请交易额',
    total_self_trade_amount DECIMAL(20, 2) DEFAULT 0 COMMENT '累计自己交易额',

    -- 当日新增数据（通过和前一天对比计算得出）
    daily_new_invite_users INT DEFAULT 0 COMMENT '当日新增邀请用户数',
    daily_new_trade_users INT DEFAULT 0 COMMENT '当日新增交易用户数',
    daily_new_trade_amount DECIMAL(20, 2) DEFAULT 0 COMMENT '当日新增交易额',
    daily_new_self_trade_amount DECIMAL(20, 2) DEFAULT 0 COMMENT '当日新增自己交易额',

    -- 原始API返回的数据（JSON格式保存）
    raw_data JSON COMMENT '原始API数据',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_code_date (invite_code, record_date),
    INDEX idx_record_date (record_date),
    INDEX idx_invite_code (invite_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每日邀请数据记录表';
