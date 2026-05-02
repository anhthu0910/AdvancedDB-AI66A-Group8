// ============================================================
// src/seed/index.js
// Sinh dữ liệu lớn cho tất cả 10 bảng
//
// Chạy: node src/seed/index.js
//   hoặc với tham số: node src/seed/index.js --users=200 --accounts=600 --txns=50000
// ============================================================

require('dotenv').config();
const { faker }   = require('@faker-js/faker/locale/vi');
const { v4: uuidv4, v1: uuidv1 } = require('uuid');
const cassandra   = require('cassandra-driver');
const db          = require('../db/client');
const Q           = require('../db/queries');

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v] = a.slice(2).split('='); return [k, parseInt(v)]; })
);

const CFG = {
  USERS        : args.users    || 50,
  ACCOUNTS     : args.accounts || 150,   // ~3 per user
  TXN_PER_ACC  : args.txns    ? Math.ceil(args.txns / (args.accounts || 150)) : 200,
  CONCURRENCY  : 200,   // Promise.all batch size — tăng nếu Cassandra chịu được
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const rand  = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;
const now   = () => new Date();
const daysAgo = n => new Date(Date.now() - n * 86_400_000);

// Cassandra UUID từ string uuid
const toUuid = str => cassandra.types.Uuid.fromString(str);
const newUuid = () => toUuid(uuidv4());
// TimeUUID không cần ở đây vì bảng dùng TIMESTAMP + UUID riêng

// Batch Promise.all theo chunk để tránh quá tải
async function batchRun(items, fn, label) {
  let done = 0;
  for (let i = 0; i < items.length; i += CFG.CONCURRENCY) {
    const chunk = items.slice(i, i + CFG.CONCURRENCY);
    await Promise.all(chunk.map(fn));
    done += chunk.length;
    process.stdout.write(`\r  [${label}] ${done}/${items.length}`);
  }
  console.log(`  ✓ ${label}: ${done} rows`);
}

// ─── Generators ──────────────────────────────────────────────────────────────

function makeUser(i) {
  const userId = `USR${String(i).padStart(5, '0')}`;
  return {
    user_id    : userId,
    full_name  : faker.person.fullName(),
    email      : faker.internet.email(),
    phone      : `09${faker.string.numeric(8)}`,
    kyc_status : pick(['PENDING', 'VERIFIED', 'VERIFIED', 'VERIFIED', 'REJECTED']),
    tier       : pick(['STANDARD', 'STANDARD', 'PREMIUM', 'VIP']),
    created_at : faker.date.between({ from: daysAgo(730), to: now() }),
    updated_at : now(),
    metadata   : { country: 'VN', source: 'mobile_app' },
  };
}

function makeAccount(userId, accIndex) {
  const accId = `ACC${String(accIndex).padStart(6, '0')}`;
  const type  = pick(['CHECKING', 'SAVINGS', 'WALLET', 'CREDIT']);
  return {
    account_id   : accId,
    user_id      : userId,
    account_type : type,
    balance      : rand(100_000, 50_000_000),
    currency     : pick(['VND', 'VND', 'VND', 'USD', 'EUR']),
    status       : pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'FROZEN', 'CLOSED']),
    credit_limit : type === 'CREDIT' ? rand(5_000_000, 50_000_000) : null,
    opened_at    : faker.date.between({ from: daysAgo(730), to: now() }),
  };
}

const TXN_TYPES    = ['DEPOSIT', 'WITHDRAW', 'TRANSFER', 'PAYMENT', 'REFUND'];
const TXN_CHANNELS = ['ATM', 'MOBILE', 'WEB', 'POS', 'API'];
const TXN_STATUSES = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'PENDING', 'FAILED'];

function makeTxn(accountId, allAccountIds, index) {
  const type      = pick(TXN_TYPES);
  const amount    = rand(10_000, 20_000_000);
  const txnTime   = faker.date.between({ from: daysAgo(365), to: now() });
  const txnId     = newUuid();
  return {
    account_id      : accountId,
    txn_time        : txnTime,
    txn_id          : txnId,
    type,
    amount          : cassandra.types.BigDecimal.fromNumber(amount),
    balance_after   : cassandra.types.BigDecimal.fromNumber(rand(0, 50_000_000)),
    counterparty_id : type === 'TRANSFER' ? pick(allAccountIds) : null,
    status          : pick(TXN_STATUSES),
    channel         : pick(TXN_CHANNELS),
    description     : faker.finance.transactionDescription(),
    fee             : cassandra.types.BigDecimal.fromNumber(pick([0, 1100, 3300, 5500, 11000])),
    ref_code        : `REF${faker.string.alphanumeric(10).toUpperCase()}`,
  };
}

function makePaymentMethod(accountId) {
  const type = pick(['DEBIT_CARD', 'CREDIT_CARD', 'E_WALLET', 'BANK_TRANSFER']);
  return {
    account_id    : accountId,
    method_id     : newUuid(),
    method_type   : type,
    masked_number : type !== 'E_WALLET' ? `****${faker.string.numeric(4)}` : null,
    provider      : pick(['VISA', 'MASTERCARD', 'JCB', 'MOMO', 'VNPAY']),
    status        : pick(['ACTIVE', 'ACTIVE', 'BLOCKED', 'EXPIRED']),
    linked_at     : faker.date.recent({ days: 365 }),
    expires_at    : faker.date.future({ years: 3 }),
  };
}

function makeCardUsage(methodId) {
  return {
    method_id     : methodId,
    used_at       : faker.date.recent({ days: 90 }),
    log_id        : newUuid(),
    merchant_name : faker.company.name(),
    merchant_code : faker.string.alphanumeric(6).toUpperCase(),
    country_code  : pick(['VN', 'VN', 'VN', 'US', 'SG', 'JP']),
    amount        : cassandra.types.BigDecimal.fromNumber(rand(10_000, 5_000_000)),
    currency      : pick(['VND', 'USD']),
    approval_code : faker.string.alphanumeric(6).toUpperCase(),
    is_online     : faker.datatype.boolean(),
    device_id     : `DEV_${faker.string.alphanumeric(8)}`,
  };
}

function makeDailySummary(accountId, dateStr) {
  const deposit  = rand(0, 10_000_000);
  const withdraw = rand(0, 5_000_000);
  return {
    account_id         : accountId,
    summary_date       : dateStr,
    total_txn_count    : Math.floor(rand(1, 30)),
    total_deposit      : cassandra.types.BigDecimal.fromNumber(deposit),
    total_withdraw     : cassandra.types.BigDecimal.fromNumber(withdraw),
    total_transfer_out : cassandra.types.BigDecimal.fromNumber(rand(0, 3_000_000)),
    total_transfer_in  : cassandra.types.BigDecimal.fromNumber(rand(0, 3_000_000)),
    total_payment      : cassandra.types.BigDecimal.fromNumber(rand(0, 2_000_000)),
    total_fee          : cassandra.types.BigDecimal.fromNumber(rand(0, 100_000)),
    opening_balance    : cassandra.types.BigDecimal.fromNumber(rand(500_000, 30_000_000)),
    closing_balance    : cassandra.types.BigDecimal.fromNumber(rand(500_000, 30_000_000)),
    computed_at        : now(),
  };
}

const NOTIF_TYPES = ['TXN_SUCCESS', 'LOW_BALANCE', 'PROMO', 'SECURITY_ALERT'];
function makeNotification(accountId) {
  const type = pick(NOTIF_TYPES);
  return {
    account_id : accountId,
    sent_at    : faker.date.recent({ days: 30 }),
    notif_id   : newUuid(),
    channel    : pick(['PUSH', 'SMS', 'EMAIL', 'IN_APP']),
    type,
    title      : type === 'TXN_SUCCESS' ? 'Giao dịch thành công'
               : type === 'LOW_BALANCE' ? 'Số dư thấp'
               : type === 'PROMO'       ? 'Ưu đãi dành cho bạn'
               : 'Cảnh báo bảo mật',
    body       : faker.lorem.sentence(),
    is_read    : faker.datatype.boolean(),
    ref_txn_id : faker.datatype.boolean() ? newUuid() : null,
  };
}

const RULES     = ['velocity_3min', 'geo_anomaly', 'large_amount', 'night_txn', 'new_device'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
function makeFraudAlert(accountId) {
  return {
    account_id  : accountId,
    detected_at : faker.date.recent({ days: 180 }),
    alert_id    : newUuid(),
    txn_id      : newUuid(),
    rule_name   : pick(RULES),
    severity    : pick(SEVERITIES),
    status      : pick(['OPEN', 'INVESTIGATING', 'CLOSED', 'FALSE_POSITIVE']),
    reason      : faker.lorem.sentence(),
    score       : Math.round(Math.random() * 100) / 100,
  };
}

const ACTIONS = ['LOGIN', 'LOGOUT', 'CHANGE_PIN', 'TRANSFER', 'UPDATE_PROFILE', 'VIEW_STATEMENT'];
function makeAuditLog(userId) {
  return {
    user_id    : userId,
    log_time   : faker.date.recent({ days: 365 }),
    log_id     : newUuid(),
    action     : pick(ACTIONS),
    resource   : `/api/${pick(['auth', 'accounts', 'transactions', 'users'])}/${pick(['login', 'transfer', 'profile'])}`,
    ip_address : faker.internet.ip(),
    user_agent : faker.internet.userAgent(),
    result     : pick(['SUCCESS', 'SUCCESS', 'FAILURE', 'BLOCKED']),
    risk_level : pick(['LOW', 'LOW', 'MEDIUM', 'HIGH']),
    session_id : `sess_${faker.string.alphanumeric(12)}`,
  };
}

// ─── Insert helpers (gọi db.execute trực tiếp với mảng params) ───────────────

const ins = {
  user: u => db.execute(Q.INSERT_USER, [
    u.user_id, u.full_name, u.email, u.phone,
    u.kyc_status, u.tier, u.created_at, u.updated_at, u.metadata,
  ]),

  account: a => db.execute(Q.INSERT_ACCOUNT, [
    a.account_id, a.user_id, a.account_type,
    a.balance, a.currency, a.status, a.credit_limit, a.opened_at,
  ]),

  txn: t => db.execute(Q.INSERT_TXN, [
    t.account_id, t.txn_time, t.txn_id,
    t.type, t.amount, t.balance_after, t.counterparty_id,
    t.status, t.channel, t.description, t.fee, t.ref_code,
  ]),

  paymentMethod: m => db.execute(Q.INSERT_PAYMENT_METHOD, [
    m.account_id, m.method_id, m.method_type, m.masked_number,
    m.provider, m.status, m.linked_at, m.expires_at,
  ]),

  cardUsage: c => db.execute(Q.INSERT_CARD_USAGE, [
    c.method_id, c.used_at, c.log_id, c.merchant_name, c.merchant_code,
    c.country_code, c.amount, c.currency, c.approval_code, c.is_online, c.device_id,
  ]),

  dailySummary: s => db.execute(Q.UPSERT_DAILY_SUMMARY, [
    s.account_id, s.summary_date,
    s.total_txn_count, s.total_deposit, s.total_withdraw,
    s.total_transfer_out, s.total_transfer_in, s.total_payment,
    s.total_fee, s.opening_balance, s.closing_balance, s.computed_at,
  ]),

  notification: n => db.execute(Q.INSERT_NOTIFICATION, [
    n.account_id, n.sent_at, n.notif_id, n.channel,
    n.type, n.title, n.body, n.is_read, n.ref_txn_id,
  ]),

  fraudAlert: f => db.execute(Q.INSERT_FRAUD_ALERT, [
    f.account_id, f.detected_at, f.alert_id, f.txn_id,
    f.rule_name, f.severity, f.status, f.reason, f.score,
  ]),

  auditLog: l => db.execute(Q.INSERT_AUDIT_LOG, [
    l.user_id, l.log_time, l.log_id, l.action, l.resource,
    l.ip_address, l.user_agent, l.result, l.risk_level, l.session_id,
  ]),
};

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  Financial Ledger — Seed Generator   ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`  Users: ${CFG.USERS} | Accounts: ${CFG.ACCOUNTS} | Txns/acc: ${CFG.TXN_PER_ACC}`);
  console.log('');

  await db.connect();
  const t0 = Date.now();

  // 1. Users
  const users = Array.from({ length: CFG.USERS }, (_, i) => makeUser(i + 1));
  await batchRun(users, ins.user, 'users');

  // 2. Accounts — phân bổ đều cho users
  const accounts = [];
  for (let i = 0; i < CFG.ACCOUNTS; i++) {
    const user = users[i % users.length];
    accounts.push(makeAccount(user.user_id, i + 1));
  }
  await batchRun(accounts, ins.account, 'accounts');

  const allAccountIds = accounts.map(a => a.account_id);

  // 3. Transactions
  const txns = [];
  for (const acc of accounts) {
    for (let i = 0; i < CFG.TXN_PER_ACC; i++) {
      txns.push(makeTxn(acc.account_id, allAccountIds, i));
    }
  }
  await batchRun(txns, ins.txn, 'transactions');

  // 4. Payment Methods (1-3 per account)
  const methods = [];
  for (const acc of accounts) {
    const count = Math.ceil(Math.random() * 3);
    for (let i = 0; i < count; i++) methods.push(makePaymentMethod(acc.account_id));
  }
  await batchRun(methods, ins.paymentMethod, 'payment_methods');

  // 5. Card Usage (5-15 per method)
  const usages = [];
  for (const m of methods) {
    const count = Math.floor(rand(5, 15));
    for (let i = 0; i < count; i++) usages.push(makeCardUsage(m.method_id));
  }
  await batchRun(usages, ins.cardUsage, 'card_usage_log');

  // 6. Daily Summary — 30 ngày gần nhất cho mỗi account
  const summaries = [];
  for (const acc of accounts) {
    for (let d = 0; d < 30; d++) {
      const date = new Date(Date.now() - d * 86_400_000);
      const dateStr = date.toISOString().slice(0, 10);
      summaries.push(makeDailySummary(acc.account_id, dateStr));
    }
  }
  await batchRun(summaries, ins.dailySummary, 'account_daily_summary');

  // 7. Notifications (3-8 per account)
  const notifs = [];
  for (const acc of accounts) {
    const count = Math.floor(rand(3, 8));
    for (let i = 0; i < count; i++) notifs.push(makeNotification(acc.account_id));
  }
  await batchRun(notifs, ins.notification, 'notifications');

  // 8. Fraud Alerts (0-3 per account, random)
  const alerts = [];
  for (const acc of accounts) {
    if (Math.random() < 0.3) {
      const count = Math.floor(rand(1, 3));
      for (let i = 0; i < count; i++) alerts.push(makeFraudAlert(acc.account_id));
    }
  }
  await batchRun(alerts, ins.fraudAlert, 'fraud_alerts');

  // 9. Audit Logs — theo user (5-20 per user)
  const auditLogs = [];
  for (const u of users) {
    const count = Math.floor(rand(5, 20));
    for (let i = 0; i < count; i++) auditLogs.push(makeAuditLog(u.user_id));
  }
  await batchRun(auditLogs, ins.auditLog, 'audit_logs');

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('');
  console.log(`✅ Seed hoàn tất trong ${elapsed}s`);
  console.log(`   Tổng rows ước tính: ${
    users.length + accounts.length + txns.length + methods.length +
    usages.length + summaries.length + notifs.length + alerts.length + auditLogs.length
  }`);

  await db.disconnect();
}

main().catch(err => {
  console.error('[Seed] Lỗi:', err.message);
  process.exit(1);
});