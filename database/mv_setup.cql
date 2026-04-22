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