const cassandra = require('cassandra-driver');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/client');
const Q  = require('../db/queries');

const toUuid = str => cassandra.types.Uuid.fromString(str);
const toBD   = n   => cassandra.types.BigDecimal.fromNumber(Number(n));

// ─── Lấy lịch sử giao dịch theo account ────────────────────────────────────
async function getByAccount({ accountId, limit = 50, from, to }) {
  if (from && to) {
    const result = await db.execute(Q.GET_TXN_BY_ACCOUNT_TIME_RANGE, [
      accountId,
      new Date(from),
      new Date(to),
      limit,
    ]);
    return result.rows;
  }
  const result = await db.execute(Q.GET_TXN_BY_ACCOUNT, [accountId, limit]);
  return result.rows;
}

// ─── Lấy giao dịch qua MV (theo loại) ───────────────────────────────────────
async function getByType({ type, limit = 50, from, to }) {
  if (from && to) {
    const result = await db.execute(Q.GET_TXN_BY_TYPE_AND_TIME, [
      type, new Date(from), new Date(to), limit,
    ]);
    return result.rows;
  }
  const result = await db.execute(Q.GET_TXN_BY_TYPE, [type, limit]);
  return result.rows;
}

// ─── Ghi 1 giao dịch ────────────────────────────────────────────────────────
async function insertOne({ accountId, type, amount, channel, description, counterpartyId, fee = 0 }) {
  const txnId   = toUuid(uuidv4());
  const txnTime = new Date();

  await db.execute(Q.INSERT_TXN, [
    accountId,
    txnTime,
    txnId,
    type,
    toBD(amount),
    toBD(0),          // balance_after: để service cao hơn tính
    counterpartyId || null,
    'PENDING',
    channel || 'API',
    description || '',
    toBD(fee),
    `REF${Date.now()}`,
  ]);

  // Ghi event khởi tạo
  await db.execute(Q.INSERT_TXN_EVENT, [
    txnId,
    txnTime,
    toUuid(uuidv4()),
    'STATUS_CHANGE',
    null,
    'PENDING',
    'system',
    'Transaction created',
    {},
  ]);

  return { txnId: txnId.toString(), txnTime, status: 'PENDING' };
}

// ─── Ingestion stream — ghi hàng loạt bằng Promise.all (KHÔNG dùng batch) ──
// Cassandra batch không tăng throughput; Promise.all tận dụng connection pool
async function insertBulk(items) {
  const results = await Promise.all(items.map(item => insertOne(item)));
  return results;
}

module.exports = { getByAccount, getByType, insertOne, insertBulk };