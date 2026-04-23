// backend/query/testRead.js
const { getClient } = require('../shared/cassandra');

async function testQuery() {
  const client = await getClient();
  const start = performance.now();
  
  const result = await client.execute(
    `SELECT transaction_id, transaction_time, type, amount FROM transactions 
     WHERE account_id = ? AND transaction_time > ? 
     ORDER BY transaction_time DESC LIMIT 20`,
    ['ACC_001', new Date(Date.now() - 86400000)],
    { prepare: true }
  );
  
  console.log(`✅ Fetched ${result.rowLength} rows in ${(performance.now() - start).toFixed(2)}ms`);
  console.log('Sample:', result.rows[0]);
}

testQuery().catch(console.error).finally(() => require('../shared/cassandra').shutdown());