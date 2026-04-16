-- 1. Tạo Keyspace (Dùng cho môi trường dev/local)
CREATE KEYSPACE IF NOT EXISTS financial_ledger
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE financial_ledger;

-- 2. Bảng chính lưu lịch sử giao dịch
CREATE TABLE IF NOT EXISTS transactions (
    account_id TEXT,                
    transaction_time TIMESTAMP,    
    transaction_id UUID,           
    transaction_type TEXT,     -- 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER'
    amount DECIMAL,
    currency TEXT DEFAULT 'VND',
    description TEXT,
    status TEXT DEFAULT 'COMPLETED',
    PRIMARY KEY ((account_id), transaction_time DESC, transaction_id)
) WITH 
    default_time_to_live = 31536000  
    AND compaction = {'class': 'SizeTieredCompactionStrategy'}
    AND caching = {'keys': 'ALL', 'rows_per_partition': '100'}
    AND comment = 'Optimized for high write & point lookup by account_id';


-- 3. Materialized View: Filter/Aggregate theo loại giao dịch
-- Cho phép truy vấn nhanh: WHERE transaction_type = ? AND account_id = ?
CREATE MATERIALIZED VIEW IF NOT EXISTS transactions_by_type AS
SELECT account_id, transaction_time, transaction_id, transaction_type, amount, currency, description, status
FROM transactions
WHERE transaction_type IS NOT NULL
  AND account_id IS NOT NULL
  AND transaction_time IS NOT NULL
  AND transaction_id IS NOT NULL
PRIMARY KEY (transaction_type, account_id, transaction_time DESC, transaction_id)
WITH default_time_to_live = 31536000
AND comment = 'MV for fast lookup by transaction_type without full table scan';