// ============================================================
// src/db/queries.js
// Tập trung toàn bộ CQL query — dễ review, dễ test
// Tên column khớp CHÍNH XÁC với schema.cql
// ============================================================

const Q = {};

// ─── USERS ───────────────────────────────────────────────────────────────────
Q.INSERT_USER = `
  INSERT INTO users
    (user_id, full_name, email, phone, kyc_status, tier, created_at, metadata)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

Q.GET_USER = `SELECT * FROM users WHERE user_id = ?`;

Q.LIST_USERS = `SELECT user_id, full_name, email, kyc_status, tier, created_at FROM users`;

// ─── ACCOUNTS ────────────────────────────────────────────────────────────────
Q.INSERT_ACCOUNT = `
  INSERT INTO accounts
    (account_id, user_id, account_type, balance, currency, status, credit_limit, opened_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

Q.GET_ACCOUNT = `SELECT * FROM accounts WHERE account_id = ?`;

// Dùng Secondary Index accounts_by_user (indexes.cql)
Q.GET_ACCOUNTS_BY_USER = `SELECT * FROM accounts WHERE user_id = ?`;

Q.UPDATE_ACCOUNT_BALANCE = `
  UPDATE accounts SET balance = ?, updated_at = ? WHERE account_id = ?`;

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
Q.INSERT_TXN = `
  INSERT INTO transactions
    (account_id, txn_time, txn_id,
     type, amount, balance_after, counterparty_id,
     status, channel, description, fee, ref_code)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

// Lấy lịch sử theo account — sử dụng Partition Key, đọc O(1) trên 1 node
Q.GET_TXN_BY_ACCOUNT = `
  SELECT * FROM transactions
  WHERE account_id = ?
  LIMIT ?`;

// Range query theo thời gian — Clustering Key hỗ trợ range scan hiệu quả
Q.GET_TXN_BY_ACCOUNT_TIME_RANGE = `
  SELECT * FROM transactions
  WHERE account_id = ?
    AND txn_time >= ?
    AND txn_time <= ?
  LIMIT ?`;

// Query qua Materialized View transactions_by_type (mv_setup.cql)
Q.GET_TXN_BY_TYPE = `
  SELECT * FROM transactions_by_type
  WHERE type = ?
  LIMIT ?`;

Q.GET_TXN_BY_TYPE_AND_TIME = `
  SELECT * FROM transactions_by_type
  WHERE type = ?
    AND txn_time >= ?
    AND txn_time <= ?
  LIMIT ?`;

// ─── TRANSACTION EVENTS ───────────────────────────────────────────────────────
Q.INSERT_TXN_EVENT = `
  INSERT INTO transaction_events
    (txn_id, event_time, event_id, event_type, old_status, new_status, actor, note, payload)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

Q.GET_TXN_EVENTS = `
  SELECT * FROM transaction_events
  WHERE txn_id = ?`;

// ─── PAYMENT METHODS ──────────────────────────────────────────────────────────
Q.INSERT_PAYMENT_METHOD = `
  INSERT INTO payment_methods
    (account_id, method_id, method_type, masked_number, provider, status, linked_at, expires_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

Q.GET_PAYMENT_METHODS = `
  SELECT * FROM payment_methods
  WHERE account_id = ?`;

// ─── CARD USAGE LOG ───────────────────────────────────────────────────────────
Q.INSERT_CARD_USAGE = `
  INSERT INTO card_usage_log
    (method_id, used_at, log_id, merchant_name, merchant_code,
     country_code, amount, currency, approval_code, is_online, device_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

Q.GET_CARD_USAGE = `
  SELECT * FROM card_usage_log
  WHERE method_id = ?
  LIMIT ?`;

// ─── ACCOUNT DAILY SUMMARY ────────────────────────────────────────────────────
Q.UPSERT_DAILY_SUMMARY = `
  INSERT INTO account_daily_summary
    (account_id, summary_date,
     total_txn_count, total_deposit, total_withdraw,
     total_transfer_out, total_transfer_in, total_payment,
     total_fee, opening_balance, closing_balance, computed_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

Q.GET_DAILY_SUMMARY = `
  SELECT * FROM account_daily_summary
  WHERE account_id = ?
  LIMIT ?`;

Q.GET_DAILY_SUMMARY_RANGE = `
  SELECT * FROM account_daily_summary
  WHERE account_id = ?
    AND summary_date >= ?
    AND summary_date <= ?`;

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
Q.INSERT_NOTIFICATION = `
  INSERT INTO notifications
    (account_id, sent_at, notif_id, channel, type, title, body, is_read, ref_txn_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

Q.GET_NOTIFICATIONS = `
  SELECT * FROM notifications
  WHERE account_id = ?
  LIMIT ?`;

// ─── FRAUD ALERTS ─────────────────────────────────────────────────────────────
Q.INSERT_FRAUD_ALERT = `
  INSERT INTO fraud_alerts
    (account_id, detected_at, alert_id, txn_id, rule_name,
     severity, status, reason, score)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

Q.GET_FRAUD_ALERTS = `
  SELECT * FROM fraud_alerts
  WHERE account_id = ?
  LIMIT ?`;

// Dùng Secondary Index fraud_by_severity (indexes.cql)
// LUÔN kèm account_id để tránh scatter-gather
Q.GET_FRAUD_BY_SEVERITY = `
  SELECT * FROM fraud_alerts
  WHERE account_id = ?
    AND severity = ?`;

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
Q.INSERT_AUDIT_LOG = `
  INSERT INTO audit_logs
    (user_id, log_time, log_id, action, resource,
     ip_address, user_agent, result, risk_level, session_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

Q.GET_AUDIT_LOGS = `
  SELECT * FROM audit_logs
  WHERE user_id = ?
  LIMIT ?`;

module.exports = Q;