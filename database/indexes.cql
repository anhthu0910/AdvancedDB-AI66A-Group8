-- ============================================================
-- FILE: indexes.cql
-- MỤC ĐÍCH: Tạo Secondary Index cho các truy vấn bổ sung
-- CHẠY SAU: keyspace.cql + schema.cql + mv_setup.cql
--
-- TẠI SAO TÁCH FILE RIÊNG?
--   1. Secondary Index trong Cassandra có chi phí và hạn chế khác
--      hoàn toàn so với Primary Key / MV — cần kiểm soát riêng.
--   2. Index thường xuyên bị DROP + REBUILD khi data lớn hoặc
--      khi thay đổi query pattern — tách file giúp chạy lại nhanh
--      mà không đụng vào schema chính.
--   3. Dễ disable từng index khi profiling performance.
--   4. File này chứa giải thích rõ "dùng index này trong trường hợp nào"
--      và "khi nào KHÔNG nên dùng" — tách ra để team dễ review.
-- ============================================================

USE ledger;

-- ============================================================
--  NGUYÊN TẮC DÙNG SECONDARY INDEX TRONG CASSANDRA
-- ============================================================
--  ✓ Dùng được: low-to-medium cardinality (vài chục đến vài nghìn giá trị).
--  ✓ Dùng được: query thường kèm partition key hoặc chỉ lấy vài row.
--  ✗ TRÁNH: high-cardinality (email, phone, UUID) — mỗi node phải scan riêng.
--  ✗ TRÁNH: low-cardinality cực thấp (boolean TRUE/FALSE) — 1 index entry
--    trỏ đến hàng triệu row → read chậm hơn full scan.
--  ✗ TRÁNH: query không có partition key kèm theo → scatter-gather toàn cluster.
-- ============================================================


-- ────────────────────────────────────────────────────────────
--  Index 1: accounts_by_user
--  Mục đích: "Tất cả tài khoản của user X"
--
--  Cardinality của user_id: MEDIUM (mỗi user có ~1-10 accounts).
--  Query pattern: WHERE account_id = ? (partition key) đã O(1).
--    Index này dùng khi cần WHERE user_id = ? trên bảng accounts.
--
--  Production note: nếu số user > 10 triệu, nên tạo bảng lookup:
--    accounts_by_user (user_id TEXT, account_id TEXT, PRIMARY KEY((user_id), account_id))
--  và write dual vào cả 2 bảng. Index Cassandra không scale tốt ở quy mô đó.
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS accounts_by_user
    ON accounts (user_id);


-- ────────────────────────────────────────────────────────────
--  Index 2: fraud_by_severity
--  Mục đích: "Tất cả cảnh báo mức CRITICAL đang OPEN"
--
--  Cardinality: LOW (4 giá trị: LOW/MEDIUM/HIGH/CRITICAL).
--    → Ngưỡng borderline. Dùng được nếu query luôn kèm account_id.
--    → Tránh query chỉ có severity = 'CRITICAL' không có account_id
--      vì sẽ scatter-gather toàn cluster.
--
--  Cách dùng đúng:
--    SELECT * FROM fraud_alerts
--    WHERE account_id = 'ACC001' AND severity = 'HIGH';
--    -- account_id là partition key → chỉ đọc 1 node, index filter local.
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS fraud_by_severity
    ON fraud_alerts (severity);


-- ────────────────────────────────────────────────────────────
--  KHÔNG tạo index trên notifications.is_read
--
--  Lý do: is_read là BOOLEAN → chỉ có 2 giá trị (TRUE/FALSE).
--    Partition "is_read = FALSE" sẽ trỏ đến hàng triệu row.
--    Cassandra phải đọc toàn bộ để trả kết quả — chậm hơn full scan.
--
--  Thay thế được đề xuất ở production:
--    Tạo bảng unread_notifications riêng:
--
--    CREATE TABLE unread_notifications (
--        account_id TEXT,
--        sent_at    TIMESTAMP,
--        notif_id   UUID,
--        PRIMARY KEY ((account_id), sent_at, notif_id)
--    ) WITH CLUSTERING ORDER BY (sent_at DESC, notif_id ASC);
--
--    Khi user đọc thông báo: DELETE row khỏi unread_notifications.
--    Đây là pattern "lookup table" chuẩn của Cassandra.
-- ────────────────────────────────────────────────────────────


-- ============================================================
--  GHI CHÚ BẢO TRÌ
-- ============================================================
--
--  Rebuild index sau khi load dữ liệu lớn:
--    nodetool rebuild_index ledger accounts accounts_by_user
--    nodetool rebuild_index ledger fraud_alerts fraud_by_severity
--
--  Xóa index:
--    DROP INDEX IF EXISTS ledger.accounts_by_user;
--    DROP INDEX IF EXISTS ledger.fraud_by_severity;
-- ============================================================
