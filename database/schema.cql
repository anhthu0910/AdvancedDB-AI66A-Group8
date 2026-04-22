-- 1. Tạo Keyspace (Dùng cho môi trường dev/local)
-- CREATE KEYSPACE IF NOT EXISTS financial_ledger
-- WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

-- USE financial_ledger;

-- 2. Bảng chính lưu lịch sử giao dịch
-- CREATE TABLE IF NOT EXISTS transactions (
--     account_id TEXT,                
--     transaction_time TIMESTAMP,    
--     transaction_id UUID,           
--     transaction_type TEXT,     -- 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER'
--     amount DECIMAL,
--    currency TEXT DEFAULT 'VND',
--    description TEXT,
--    status TEXT DEFAULT 'COMPLETED',
--    PRIMARY KEY ((account_id), transaction_time DESC, transaction_id)
--) WITH 
--    default_time_to_live = 31536000  
--    AND compaction = {'class': 'SizeTieredCompactionStrategy'}
--    AND caching = {'keys': 'ALL', 'rows_per_partition': '100'}
--    AND comment = 'Optimized for high write & point lookup by account_id';


-- 1. Tạo Keyspace (Replication factor = 1 cho môi trường Docker/local)
CREATE KEYSPACE IF NOT EXISTS banking 
WITH REPLICATION = { 'class' : 'SimpleStrategy', 'replication_factor' : 1 };

USE banking;

-- 2. Tạo bảng transactions
-- Lưu ý: Trong CQL, thứ tự DESC không đặt trong PRIMARY KEY mà dùng WITH CLUSTERING ORDER BY
CREATE TABLE IF NOT EXISTS transactions (
    account_id text,
    transaction_time timestamp,
    transaction_id uuid,
    amount decimal,
    currency text,
    type text,          -- e.g., 'CREDIT', 'DEBIT'
    status text,        -- e.g., 'PENDING', 'COMPLETED', 'FAILED'
    description text,
    PRIMARY KEY ((account_id), transaction_time)
) WITH CLUSTERING ORDER BY (transaction_time DESC);