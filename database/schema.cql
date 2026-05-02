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


-- ============================================================
--  NHÓM 2: GIAO DỊCH
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  Bảng 3: transactions  ← BẢNG TRUNG TÂM
--  Ghi nhận mọi giao dịch tài chính theo thời gian thực.
--
--  Partition Key : account_id
--    → Co-locate toàn bộ lịch sử 1 tài khoản trên 1 node.
--    → Truy vấn sao kê chỉ cần 1 network hop.
--
--  Clustering Key 1: txn_time DESC
--    → Giao dịch mới nhất đứng đầu — phù hợp với pattern "lấy 20 GD gần nhất".
--    → Hỗ trợ range query: WHERE txn_time >= ? AND txn_time <= ?
--
--  Clustering Key 2: txn_id (UUID)
--    → Tiebreaker khi 2 GD cùng millisecond — tránh overwrite.
--    → Đảm bảo idempotent khi retry insert (upsert an toàn).
--
--  TTL: 31 536 000 giây = 365 ngày
--    → Cassandra tự xóa row sau 1 năm, không cần cron job.
--    → Kết hợp TWCS: SSTable cũ được drop nguyên block khi hết TTL.
--
--  Compaction — TimeWindowCompactionStrategy (TWCS):
--    → Nhóm SSTable theo cửa sổ thời gian (1 ngày/cửa sổ).
--    → Khi data hết TTL, toàn bộ SSTable của cửa sổ đó được drop ngay
--      thay vì phải merge từng row → giảm I/O đáng kể ở workload time-series.
--    → KHÔNG dùng STCS hay LCS cho bảng có TTL cao — kém hiệu quả.
--
--  LZ4Compressor: nén nhanh, CPU overhead thấp → phù hợp throughput cao.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
    account_id      TEXT,
    txn_time        TIMESTAMP,
    txn_id          UUID,
    type            TEXT,       -- DEPOSIT | WITHDRAW | TRANSFER | PAYMENT | REFUND
    amount          DECIMAL,
    balance_after   DECIMAL,
    counterparty_id TEXT,       -- tài khoản đối ứng (nếu là TRANSFER)
    status          TEXT,       -- SUCCESS | FAILED | PENDING | REVERSED
    channel         TEXT,       -- ATM | MOBILE | WEB | POS | API
    description     TEXT,
    fee             DECIMAL,
    ref_code        TEXT,       -- mã tham chiếu từ hệ thống ngoài (ngân hàng, NAPAS...)

    PRIMARY KEY ((account_id), txn_time, txn_id)
)
WITH CLUSTERING ORDER BY (txn_time DESC, txn_id ASC)
AND  default_time_to_live = 31536000
AND  compaction = {
    'class'                  : 'TimeWindowCompactionStrategy',
    'compaction_window_unit' : 'DAYS',
    'compaction_window_size' : 1
}
AND  compression = { 'sstable_compression': 'LZ4Compressor' }
AND  comment = 'Core ledger — partitioned by account, ordered by time DESC, TTL 365d';


-- ────────────────────────────────────────────────────────────
--  Bảng 4: transaction_events
--  Lịch sử trạng thái (state machine) của mỗi giao dịch.
--  Ví dụ flow: PENDING → SUCCESS, PENDING → FAILED → REVERSED.
--
--  Partition Key : txn_id
--    → Toàn bộ event của 1 giao dịch nằm trên cùng 1 node.
--    → Truy vấn "timeline của GD X" là 1 partition read.
--
--  TTL: 365 ngày — đồng bộ vòng đời với bảng transactions.
--    Khi GD hết TTL thì event log của nó cũng tự hết.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transaction_events (
    txn_id      UUID,
    event_time  TIMESTAMP,
    event_id    UUID,
    event_type  TEXT,               -- STATUS_CHANGE | RETRY | REVERSAL | HOLD | RELEASE
    old_status  TEXT,
    new_status  TEXT,
    actor       TEXT,               -- user_id hoặc 'system'
    note        TEXT,
    payload     MAP<TEXT, TEXT>,    -- dữ liệu context tùy event

    PRIMARY KEY ((txn_id), event_time, event_id)
)
WITH CLUSTERING ORDER BY (event_time DESC, event_id ASC)
AND  default_time_to_live = 31536000
AND  compaction = {
    'class'                  : 'TimeWindowCompactionStrategy',
    'compaction_window_unit' : 'DAYS',
    'compaction_window_size' : 1
}
AND  compression = { 'sstable_compression': 'LZ4Compressor' }
AND  comment = 'State-machine audit trail per transaction — TTL 365d, matches transactions table';


-- ============================================================
--  NHÓM 3: THẺ & PHƯƠNG THỨC THANH TOÁN
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  Bảng 5: payment_methods
--  Các phương thức thanh toán gắn với tài khoản (thẻ, ví...).
--
--  Partition Key : account_id
--    → Tất cả thẻ/ví của 1 TK nằm cùng node.
--    → Truy vấn "thẻ của ACC001" = 1 partition read.
--
--  Clustering Key: method_id
--    → UUID để phân biệt các thẻ, không cần ordering theo thời gian.
--
--  Không TTL: thẻ tồn tại đến khi bị hủy (cập nhật status = EXPIRED/BLOCKED).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_methods (
    account_id      TEXT,
    method_id       UUID,
    method_type     TEXT,               -- DEBIT_CARD | CREDIT_CARD | E_WALLET | BANK_TRANSFER
    masked_number   TEXT,               -- 4 số cuối, VD: ****1234
    provider        TEXT,               -- VISA | MASTERCARD | JCB | MOMO | VNPAY
    status          TEXT,               -- ACTIVE | BLOCKED | EXPIRED
    linked_at       TIMESTAMP,
    expires_at      TIMESTAMP,
    billing_address MAP<TEXT, TEXT>,

    PRIMARY KEY ((account_id), method_id)
)
WITH CLUSTERING ORDER BY (method_id ASC)
AND  comment = 'Payment instruments (cards, wallets) linked to an account — no TTL';


-- ────────────────────────────────────────────────────────────
--  Bảng 6: card_usage_log
--  Mỗi lần quẹt / tap / giao dịch online của thẻ.
--  Hỗ trợ phát hiện fraud theo velocity (nhiều lần trong thời gian ngắn).
--
--  Partition Key : method_id
--    → Toàn bộ lịch sử dùng của 1 thẻ nằm cùng node.
--
--  TTL: 7 776 000 giây = 90 ngày
--    → Log ngắn hạn cho fraud detection — không cần giữ lâu như GD chính.
--
--  TWCS + window 1 ngày: phù hợp vì log theo thời gian, xóa hàng loạt khi hết TTL.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS card_usage_log (
    method_id     UUID,
    used_at       TIMESTAMP,
    log_id        UUID,
    merchant_name TEXT,
    merchant_code TEXT,
    country_code  TEXT,
    amount        DECIMAL,
    currency      TEXT,
    approval_code TEXT,
    is_online     BOOLEAN,
    device_id     TEXT,

    PRIMARY KEY ((method_id), used_at, log_id)
)
WITH CLUSTERING ORDER BY (used_at DESC, log_id ASC)
AND  default_time_to_live = 7776000
AND  compaction = {
    'class'                  : 'TimeWindowCompactionStrategy',
    'compaction_window_unit' : 'DAYS',
    'compaction_window_size' : 1
}
AND  compression = { 'sstable_compression': 'LZ4Compressor' }
AND  comment = 'Card swipe/tap/online usage log for fraud detection — TTL 90 days';


-- ============================================================
--  NHÓM 4: PHÂN TÍCH & KIỂM TOÁN
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  Bảng 7: account_daily_summary
--  Số liệu tổng hợp theo ngày cho mỗi tài khoản.
--  Được tính bởi batch job cuối ngày (không real-time).
--
--  Partition Key : account_id
--  Clustering Key: summary_date DESC  →  ngày mới nhất đứng đầu.
--
--  TTL: 63 072 000 giây = 730 ngày (2 năm)
--    → Đủ để báo cáo lịch sử 2 năm theo yêu cầu nghiệp vụ.
--
--  Lưu ý: summary_date dùng TEXT (YYYY-MM-DD) thay vì DATE để
--  tránh edge case timezone trong Cassandra date handling.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS account_daily_summary (
    account_id         TEXT,
    summary_date       TEXT,       -- format: YYYY-MM-DD
    total_txn_count    INT,
    total_deposit      DECIMAL,
    total_withdraw     DECIMAL,
    total_transfer_out DECIMAL,
    total_transfer_in  DECIMAL,
    total_payment      DECIMAL,
    total_fee          DECIMAL,
    opening_balance    DECIMAL,
    closing_balance    DECIMAL,
    computed_at        TIMESTAMP,

    PRIMARY KEY ((account_id), summary_date)
)
WITH CLUSTERING ORDER BY (summary_date DESC)
AND  default_time_to_live = 63072000
AND  comment = 'Daily roll-up per account for reporting — TTL 2 years';


-- ────────────────────────────────────────────────────────────
--  Bảng 8: notifications
--  Thông báo gửi tới người dùng (push, SMS, email, in-app).
--
--  Partition Key : account_id
--  Clustering Key: sent_at DESC, notif_id
--    → Đọc thông báo mới nhất trước — phù hợp UI mobile.
--
--  TTL: 2 592 000 giây = 30 ngày
--    → Thông báo cũ không có giá trị, tự dọn sau 1 tháng.
--
--  Lưu ý is_read: KHÔNG dùng Secondary Index trên boolean này
--  (low-cardinality → hotspot). Để lọc "chưa đọc", application
--  đọc toàn partition và filter ở tầng app, hoặc dùng bảng
--  lookup unread_notifications riêng nếu cần scale.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    account_id  TEXT,
    sent_at     TIMESTAMP,
    notif_id    UUID,
    channel     TEXT,       -- PUSH | SMS | EMAIL | IN_APP
    type        TEXT,       -- TXN_SUCCESS | LOW_BALANCE | PROMO | SECURITY_ALERT
    title       TEXT,
    body        TEXT,
    is_read     BOOLEAN,
    read_at     TIMESTAMP,
    ref_txn_id  UUID,       -- liên kết GD liên quan (nếu có)

    PRIMARY KEY ((account_id), sent_at, notif_id)
)
WITH CLUSTERING ORDER BY (sent_at DESC, notif_id ASC)
AND  default_time_to_live = 2592000
AND  comment = 'User notifications — TTL 30 days';


-- ────────────────────────────────────────────────────────────
--  Bảng 9: fraud_alerts
--  Cảnh báo gian lận do fraud detection engine tạo ra.
--
--  Partition Key : account_id
--  Clustering Key: detected_at DESC, alert_id
--
--  Không TTL: giữ vĩnh viễn cho mục đích pháp lý và compliance.
--  Đây là dữ liệu cần audit trail dài hạn — không được tự xóa.
--
--  score: FLOAT 0.0–1.0, rule-based hoặc từ ML model.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fraud_alerts (
    account_id  TEXT,
    detected_at TIMESTAMP,
    alert_id    UUID,
    txn_id      UUID,
    rule_name   TEXT,       -- "velocity_3min" | "geo_anomaly" | "large_amount"
    severity    TEXT,       -- LOW | MEDIUM | HIGH | CRITICAL
    status      TEXT,       -- OPEN | INVESTIGATING | CLOSED | FALSE_POSITIVE
    reason      TEXT,
    score       FLOAT,
    resolved_by TEXT,
    resolved_at TIMESTAMP,

    PRIMARY KEY ((account_id), detected_at, alert_id)
)
WITH CLUSTERING ORDER BY (detected_at DESC, alert_id ASC)
AND  comment = 'Fraud alerts — no TTL, permanent for compliance';


-- ────────────────────────────────────────────────────────────
--  Bảng 10: audit_logs
--  Nhật ký toàn bộ hành động của người dùng và hệ thống.
--
--  Partition Key : user_id
--    → Toàn bộ lịch sử hành động của 1 user trên cùng node.
--
--  Clustering Key: log_time DESC, log_id
--    → Hành động gần nhất đứng đầu.
--
--  TTL: 31 536 000 giây = 365 ngày — tuân thủ yêu cầu kiểm toán.
--
--  TWCS: phù hợp vì log theo thời gian, xóa hàng loạt khi hết TTL.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    user_id    TEXT,
    log_time   TIMESTAMP,
    log_id     UUID,
    action     TEXT,       -- LOGIN | LOGOUT | CHANGE_PIN | TRANSFER | UPDATE_PROFILE
    resource   TEXT,       -- endpoint hoặc resource bị tác động
    ip_address TEXT,
    user_agent TEXT,
    result     TEXT,       -- SUCCESS | FAILURE | BLOCKED
    risk_level TEXT,       -- LOW | MEDIUM | HIGH
    session_id TEXT,

    PRIMARY KEY ((user_id), log_time, log_id)
)
WITH CLUSTERING ORDER BY (log_time DESC, log_id ASC)
AND  default_time_to_live = 31536000
AND  compaction = {
    'class'                  : 'TimeWindowCompactionStrategy',
    'compaction_window_unit' : 'DAYS',
    'compaction_window_size' : 1
}
AND  compression = { 'sstable_compression': 'LZ4Compressor' }
AND  comment = 'Full audit trail for user and system actions — TTL 365 days';