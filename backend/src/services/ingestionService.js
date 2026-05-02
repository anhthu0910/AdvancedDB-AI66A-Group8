// ============================================================
// src/services/ingestionService.js
// Sinh và ghi liên tục giao dịch ngẫu nhiên — dùng cho demo UI
// Mục tiêu throughput: ~500 tx/giây
// ============================================================

const cassandra   = require('cassandra-driver');
const { v4: uuidv4 } = require('uuid');
const { faker }   = require('@faker-js/faker/locale/vi');
const db          = require('../db/client');
const Q           = require('../db/queries');

const toUuid = str => cassandra.types.Uuid.fromString(str);
const toBD   = n   => cassandra.types.BigDecimal.fromNumber(Number(n));
const pick   = arr => arr[Math.floor(Math.random() * arr.length)];

const TXN_TYPES    = ['DEPOSIT', 'WITHDRAW', 'TRANSFER', 'PAYMENT', 'REFUND'];
const TXN_CHANNELS = ['ATM', 'MOBILE', 'WEB', 'POS', 'API'];

// Cache danh sách account_id để tạo giao dịch thực tế
let _accountIds = [];
async function loadAccountIds() {
  if (_accountIds.length > 0) return _accountIds;
  const result = await db.execute('SELECT account_id FROM accounts LIMIT 500', [], { prepare: false });
  _accountIds = result.rows.map(r => r.account_id);
  return _accountIds;
}

// ─── Tạo và ghi 1 batch txn ──────────────────────────────────────────────────
// Ghi BATCH_SIZE giao dịch song song, đo throughput thực tế
async function writeBatch(batchSize = 50) {
  const accountIds = await loadAccountIds();
  if (!accountIds.length) throw new Error('Không có account trong DB — chạy seed trước');

  const txnTime = new Date();
  const items   = [];

  for (let i = 0; i < batchSize; i++) {
    const accountId = pick(accountIds);
    const type      = pick(TXN_TYPES);
    items.push({
      account_id      : accountId,
      txn_time        : new Date(txnTime.getTime() + i), // mili giây khác nhau
      txn_id          : toUuid(uuidv4()),
      type,
      amount          : toBD(Math.round(Math.random() * 10_000_000)),
      balance_after   : toBD(Math.round(Math.random() * 50_000_000)),
      counterparty_id : type === 'TRANSFER' ? pick(accountIds) : null,
      status          : pick(['SUCCESS', 'SUCCESS', 'PENDING', 'FAILED']),
      channel         : pick(TXN_CHANNELS),
      description     : faker.finance.transactionDescription(),
      fee             : toBD(pick([0, 1100, 3300, 5500])),
      ref_code        : `REF${Date.now()}${i}`,
    });
  }

  const t0 = Date.now();
  // Promise.all: mỗi query dùng connection pool riêng → parallel write thực sự
  await Promise.all(items.map(t =>
    db.execute(Q.INSERT_TXN, [
      t.account_id, t.txn_time, t.txn_id,
      t.type, t.amount, t.balance_after, t.counterparty_id,
      t.status, t.channel, t.description, t.fee, t.ref_code,
    ])
  ));

  const elapsed = Date.now() - t0;
  const tps     = Math.round((batchSize / elapsed) * 1000);

  return { written: batchSize, elapsed_ms: elapsed, tps, items };
}

// ─── Stream không giới hạn — dùng từ Socket.IO handler ──────────────────────
// intervalMs: khoảng cách giữa các batch
// batchSize:  số txn mỗi batch
// onBatch(result): callback nhận kết quả mỗi batch để emit lên socket
async function startStream({ intervalMs = 100, batchSize = 50, onBatch, signal }) {
  while (!signal?.aborted) {
    try {
      const result = await writeBatch(batchSize);
      onBatch && onBatch(result);
    } catch (err) {
      console.error('[Ingestion] Lỗi ghi batch:', err.message);
    }
    await sleep(intervalMs);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { writeBatch, startStream, loadAccountIds };