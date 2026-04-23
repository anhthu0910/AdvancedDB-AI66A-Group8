// backend/ingestion/testInsert.js
const { getClient } = require('../shared/cassandra');
const { v4: uuidv4 } = require('uuid');

async function testBulkInsert(count = 100) {
  const client = await getClient();
  const start = performance.now();
  
  const queries = Array.from({ length: count }, () => ({
    query: `INSERT INTO transactions (account_id, transaction_time, transaction_id, type, amount, description) 
            VALUES (?, ?, ?, ?, ?, ?)`,
    params: ['ACC_001', new Date(), uuidv4(), 'transfer', +(Math.random() * 1000).toFixed(2), 'Mock data']
  }));

  // Async parallel execution (tối ưu throughput)
  await Promise.all(queries.map(q => client.execute(q.query, q.params, { prepare: true })));
  
  console.log(`✅ Inserted ${count} records in ${(performance.now() - start).toFixed(2)}ms`);
}

testBulkInsert().catch(console.error).finally(() => require('../shared/cassandra').shutdown());