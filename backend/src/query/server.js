const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cassandra = require('cassandra-driver');

const app = express();
const PORT = process.env.PORT || 3002; // Dùng port khác Ingestion (3001)

// 1. Kết nối Cassandra (Singleton + Pool)
let client = null;
async function connectDB() {
  if (client && !client.isClosed) return client;
  client = new cassandra.Client({
    contactPoints: ['127.0.0.1'],
    localDataCenter: 'datacenter1',
    keyspace: 'banking',
    pooling: { coreConnectionsPerHost: { local: 2 } }
  });
  await client.connect();
  console.log('✅ Query Service connected to Cassandra');
  return client;
}

// 2. Swagger Auto-Docs
const swaggerDefinition = {
  openapi: '3.0.0',
  info: { title: 'Query API', version: '1.0.0', description: 'API đọc giao dịch theo account' },
  servers: [{ url: `http://localhost:${PORT}` }]
};
const options = { swaggerDefinition, apis: ['./server.js'] };
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerJsdoc(options)));

// 3. 🎯 Query Endpoint
/**
 * @openapi
 * /api/accounts/{id}/transactions:
 *   get:
 *     summary: Lấy danh sách giao dịch của tài khoản
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Mã tài khoản (partition key)
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: ['CREDIT', 'DEBIT'] }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Trả về danh sách giao dịch
 */
app.get('/api/accounts/:id/transactions', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, from, to, limit = 50 } = req.query;

    // ⚠️ CQL BẮT BUỘC có partition key trong WHERE
    let query = `SELECT * FROM transactions WHERE account_id = ?`;
    const params = [id];

    // 🔍 Filter theo khoảng thời gian (clustering key)
    if (from || to) {
      query += ` AND transaction_time >= ? AND transaction_time <= ?`;
      // Driver tự chuyển Date object sang timestamp của Cassandra
      params.push(from ? new Date(from) : new Date('1970-01-01'));
      params.push(to ? new Date(to) : new Date());
    }

    query += ` LIMIT ?`;
    params.push(parseInt(limit, 10));

    // Execute query đã prepare
    const result = await client.execute(query, params, { prepare: true });

    // 🧠 Filter type trong memory (giải pháp tạm thời Day 2-3)
    let transactions = result.rows;
    if (type) {
      transactions = transactions.filter(tx => tx.type === type.toUpperCase());
    }

    res.json({
      success: true,
      account_id: id,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'query' }));

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Query Service running on http://localhost:${PORT}`);
    console.log(`📖 Swagger UI: http://localhost:${PORT}/api-docs`);
  });
}

start().catch(console.error);