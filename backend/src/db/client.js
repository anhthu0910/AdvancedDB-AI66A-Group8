const cassandra = require('cassandra-driver');
const cfg       = require('../config/env');

// ─── Singleton client ────────────────────────────────────────────────────────
let _client = null;

function getClient() {
  if (_client) return _client;

  _client = new cassandra.Client({
    contactPoints: [`${cfg.cassandra.host}:${cfg.cassandra.port}`],
    localDataCenter: cfg.cassandra.dc,
    keyspace: cfg.cassandra.keyspace,

    // Retry policy: thử lại tối đa 3 lần khi node tạm thời không phản hồi
    policies: {
      retry: new cassandra.policies.retry.RetryPolicy(),
    },

    // Pool mỗi host: 2 connection, mỗi connection 2048 request song song
    // Phù hợp ingestion ~500 tx/s trên môi trường dev single-node
    pooling: {
      coreConnectionsPerHost: {
        [cassandra.types.distance.local]:  2,
        [cassandra.types.distance.remote]: 1,
      },
    },

    // Prepared statement cache tự động theo driver — KHÔNG cần manual cache
    // Driver tự detect và reuse prepared statement ID
    queryOptions: {
      consistency: cassandra.types.consistencies.localOne,
      prepare:     true,   // mặc định dùng prepared statement cho mọi query
    },
  });

  return _client;
}

// ─── Kết nối và kiểm tra keyspace ────────────────────────────────────────────
async function connect() {
  const client = getClient();
  await client.connect();
  console.log(`[Cassandra] Connected — keyspace: ${cfg.cassandra.keyspace} | DC: ${cfg.cassandra.dc}`);
  return client;
}

async function disconnect() {
  if (_client) {
    await _client.shutdown();
    _client = null;
    console.log('[Cassandra] Disconnected');
  }
}

// ─── Helper: execute với prepared statement (tự retry on timeout) ─────────────
async function execute(query, params = [], options = {}) {
  const client = getClient();
  return client.execute(query, params, { prepare: true, ...options });
}

// ─── Helper: batch — dùng UNLOGGED cho cùng partition, LOGGED cho multi-partition
// Lưu ý: Cassandra batch KHÔNG tăng throughput — chỉ dùng để atomic write
// nhiều row cùng partition. Ingestion bulk nên dùng Promise.all thay batch.
async function batch(queries, options = {}) {
  const client = getClient();
  return client.batch(queries, { prepare: true, ...options });
}

// ─── Stream: dùng cho query trả về hàng nghìn row (tránh OOM) ────────────────
function stream(query, params = []) {
  const client = getClient();
  return client.stream(query, params, { prepare: true, autoPage: true });
}

module.exports = { getClient, connect, disconnect, execute, batch, stream };