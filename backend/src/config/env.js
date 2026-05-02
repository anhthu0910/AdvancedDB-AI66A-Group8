// backend/src/config/env.js
module.exports = {
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    env:  process.env.NODE_ENV || 'development',
  },
  cassandra: {
    host:     process.env.CASSANDRA_HOST     || '127.0.0.1',
    port:     parseInt(process.env.CASSANDRA_PORT, 10) || 9042,
    keyspace: process.env.CASSANDRA_KEYSPACE || 'ledger',
    dc:       process.env.CASSANDRA_DC       || 'datacenter1',
  },
};