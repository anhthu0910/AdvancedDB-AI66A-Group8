-- ============================================================
-- FILE: schema.cql
-- MỤC ĐÍCH: Tạo 10 bảng chính cho Financial Transaction Ledger
-- CHẠY SAU: keyspace.cql
-- CHẠY TRƯỚC: mv_setup.cql, indexes.cql
--
-- PHÂN NHÓM:
--   Nhóm 1 — Người dùng & Tài khoản  : users, accounts
--   Nhóm 2 — Giao dịch               : transactions, transaction_events
--   Nhóm 3 — Thẻ & Thanh toán        : payment_methods, card_usage_log
--   Nhóm 4 — Phân tích & Kiểm toán   : account_daily_summary, notifications,
--                                       fraud_alerts, audit_logs
-- ============================================================

USE ledger;


-- ============================================================
--  NHÓM 1: NGƯỜI DÙNG & TÀI KHOẢN
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  Bảng 1: users
--  Thông tin định danh và KYC của người dùng.
--
--  Partition Key : user_id  →  1 người dùng = 1 partition, tra cứu O(1).
--  Không TTL: dữ liệu người dùng giữ vĩnh viễn (xóa thủ công khi đóng TK).
--
--  Lưu ý compaction: SizeTieredCompactionStrategy (mặc định) phù hợp vì
--  bảng này ghi ít, đọc nhiều (lookup by user_id).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    user_id     TEXT,
    full_name   TEXT,
    email       TEXT,
    phone       TEXT,
    kyc_status  TEXT,               -- PENDING | VERIFIED | REJECTED
    tier        TEXT,               -- STANDARD | PREMIUM | VIP
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP,
    metadata    MAP<TEXT, TEXT>,    -- thông tin mở rộng: địa chỉ, quốc gia...

    PRIMARY KEY (user_id)
)
WITH comment = 'User identity and KYC information — no TTL, kept permanently';


-- ────────────────────────────────────────────────────────────
--  Bảng 2: accounts
--  Mỗi user có thể có nhiều tài khoản (thanh toán, tiết kiệm, tín dụng...).
--
--  Partition Key : account_id  →  lookup theo account O(1).
--  Không TTL: tài khoản tồn tại suốt vòng đời hệ thống.
--
--  ĐỂ tra cứu "tất cả TK của user X": dùng Secondary Index accounts_by_user
--  (xem indexes.cql). Production scale lớn nên tạo bảng lookup riêng.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
    account_id   TEXT,
    user_id      TEXT,
    account_type TEXT,      -- CHECKING | SAVINGS | WALLET | CREDIT
    balance      DECIMAL,
    currency     TEXT,      -- VND | USD | EUR
    status       TEXT,      -- ACTIVE | FROZEN | CLOSED
    credit_limit DECIMAL,   -- chỉ dùng khi account_type = CREDIT
    opened_at    TIMESTAMP,
    closed_at    TIMESTAMP,

    PRIMARY KEY (account_id)
)
WITH comment = 'Bank/wallet accounts owned by users — no TTL';
