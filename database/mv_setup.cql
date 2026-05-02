-- ============================================================
-- FILE: mv_setup.cql
-- MỤC ĐÍCH: Tạo Materialized View hỗ trợ truy vấn theo loại giao dịch
-- CHẠY SAU: keyspace.cql + schema.cql
-- CHẠY TRƯỚC: indexes.cql (indexes không phụ thuộc MV, nhưng theo thứ tự logic)
-- ============================================================

USE ledger;

-- ============================================================
--  Materialized View: transactions_by_type
-- ============================================================
--
--  VẤN ĐỀ:
--    Bảng transactions có Partition Key là account_id.
--    Query "tất cả DEPOSIT trong tháng 4" cần filter theo type —
--    nhưng type không phải partition key hay clustering key,
--    nên Cassandra sẽ yêu cầu ALLOW FILTERING (scan toàn bảng).
--
--  GIẢI PHÁP — Materialized View với layout khác:
--    Partition Key: type
--      → Tất cả DEPOSIT / WITHDRAW / TRANSFER gom vào partition riêng.
--    Clustering Key: txn_time DESC, account_id, txn_id
--      → Trong cùng 1 type, sắp xếp theo thời gian → range query nhanh.
--      → account_id trong clustering key để hỗ trợ thêm filter theo account.
--
--  Cassandra tự động sync MV khi bảng gốc có write mới.
--  Write overhead: ~10–20% do coordinator phải cập nhật cả MV.
--
--  TRADE-OFF:
--    ✓ Đọc theo type cực nhanh — không scan toàn bảng.
--    ✗ Write chậm hơn một chút.
--    ✗ MV không hỗ trợ ALTER — muốn thay đổi phải DROP + CREATE lại.
--    ✗ Cassandra 4.x: MV còn ở trạng thái beta, cần bật
--      materialized_views_enabled: true trong cassandra.yaml.
--
--  TTL: kế thừa từ bảng gốc transactions (365 ngày).
--    Không cần đặt lại — MV nhận TTL từ write gốc.
--
--  VÍ DỤ QUERY:
--    -- Tất cả DEPOSIT trong khoảng thời gian:
--    SELECT * FROM transactions_by_type
--    WHERE type = 'DEPOSIT'
--      AND txn_time >= '2025-01-01 00:00:00+0000'
--      AND txn_time <= '2025-01-31 23:59:59+0000';
--
--    -- TRANSFER của 1 account cụ thể:
--    SELECT * FROM transactions_by_type
--    WHERE type = 'TRANSFER'
--      AND account_id = 'ACC001';
--      -- Lưu ý: cần thêm txn_time trong WHERE nếu muốn account_id đứng một mình
--      -- vì clustering order là txn_time → account_id. Hoặc dùng index.
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS transactions_by_type AS
    SELECT
        type,
        txn_time,
        account_id,
        txn_id,
        amount,
        balance_after,
        counterparty_id,
        status,
        channel,
        description,
        fee,
        ref_code
    FROM transactions
    WHERE
        type       IS NOT NULL AND
        account_id IS NOT NULL AND
        txn_time   IS NOT NULL AND
        txn_id     IS NOT NULL
    PRIMARY KEY ((type), txn_time, account_id, txn_id)
WITH CLUSTERING ORDER BY (txn_time DESC, account_id ASC, txn_id ASC)
AND  comment = 'MV: query transactions by type without full-table scan — TTL inherited from base table';


-- ============================================================
--  GHI CHÚ BẢO TRÌ
-- ============================================================
--
--  Bật MV trong cassandra.yaml (nếu Cassandra 4.x):
--    materialized_views_enabled: true
--
--  Xóa và tạo lại khi cần thay đổi schema:
--    DROP MATERIALIZED VIEW IF EXISTS ledger.transactions_by_type;
--    -- Sau đó chạy lại file này.
--
--  Kiểm tra trạng thái sync MV:
--    nodetool viewbuildstatus ledger transactions_by_type
-- ============================================================