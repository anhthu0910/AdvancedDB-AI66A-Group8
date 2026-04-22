module.exports = {
  CASSANDRA: {
    // Nếu chạy Node trên host máy thật: '127.0.0.1'
    // Nếu chạy Node trong cùng docker network với container: 'cassandra'
    contactPoints: [process.env.CASSANDRA_HOST || '127.0.0.1'],
    localDataCenter: process.env.CASSANDRA_DC || 'datacenter1',
    keyspace: process.env.CASSANDRA_KEYSPACE || 'banking',
    auth: undefined // Không bật authentication
  },
  TABLE: 'transactions',
  // Thứ tự này sẽ tự động mapping vào INSERT statement & prepared parameters
  COLUMNS: ['account_id', 'transaction_time', 'transaction_id', 'amount', 'currency', 'type', 'status', 'description'],
  
  // ⚡ Tuning đạt 100 TPS trên local
  CONCURRENCY_LIMIT: 50,
  MAX_REQUEST_SIZE: 2000
};