const express = require('express');
const { connectCassandra, getClient } = require('./cassandra-client');
const { generateTransaction } = require('./data-generator');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3001;

const INSERT_QUERY = `
  INSERT INTO transactions (account_id, transaction_time, transaction_id, amount, currency, type, status, description)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

app.post('/api/transactions/bulk', async (req, res) => {
  try {
    let payload = req.body;

    // Nếu client không gửi data, tự sinh mock data theo query param ?count=100
    if (!Array.isArray(payload) || payload.length === 0) {
      const count = req.query.count ? parseInt(req.query.count) : 50;
      payload = generateTransaction(count);
    }

    const client = getClient();

    // Chuyển đổi sang định dạng batch của cassandra-driver
    const batchStatements = payload.map(tx => ({
      query: INSERT_QUERY,
      params: [
        tx.account_id,
        tx.transaction_time,
        tx.transaction_id,
        tx.amount,
        tx.currency,
        tx.type,
        tx.status,
        tx.description
      ]
    }));

    // Async write: dùng client.batch() tối ưu hơn Promise.all cho Cassandra
    await client.batch(batchStatements, { prepare: true });

    res.status(201).json({
      success: true,
      message: `Inserted ${payload.length} transactions`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Bulk insert failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ingestion' }));

async function start() {
  await connectCassandra();
  app.listen(PORT, () => console.log(`🚀 Ingestion Service running on http://localhost:${PORT}`));
}

start().catch(console.error);