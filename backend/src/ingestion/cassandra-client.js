const cassandra = require('cassandra-driver');

let client = null;

async function connectCassandra() {
  if (client && client.isClosed === false) return client;

  client = new cassandra.Client({
    contactPoints: ['127.0.0.1'], // Nếu Cassandra chạy Docker, đảm bảo đã map port -p 9042:9042
    localDataCenter: 'datacenter1', // Mặc định của Cassandra 4.x+ Docker image
    keyspace: 'banking',
    pooling: {
      coreConnectionsPerHost: { local: 4 }, // Tối ưu connection pool cho local test
    },
    socketOptions: { connectTimeout: 10000, readTimeout: 30000 }
  });

  await client.connect();
  console.log('✅ Connected to Cassandra keyspace: banking');
  return client;
}

module.exports = { connectCassandra, getClient: () => client };