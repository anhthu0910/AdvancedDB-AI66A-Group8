// backend/shared/cassandra.js
const cassandra = require('cassandra-driver');
require('dotenv').config();

let client = null;

const getClient = async () => {
  if (!client) {
    client = new cassandra.Client({
      contactPoints: [process.env.CASSANDRA_HOST || '127.0.0.1'],
      localDataCenter: process.env.CASSANDRA_DC || 'datacenter1',
      keyspace: process.env.CASSANDRA_KEYSPACE || 'advanced_db',
      pooling: { heartBeatInterval: 30000 },
      policies: {
        reconnection: new cassandra.policies.reconnection.ExponentialReconnectionPolicy(1000, 10000, false)
      }
    });
    await client.connect();
    console.log('✅ Cassandra connected successfully');
  }
  return client;
};

const shutdown = async () => {
  if (client) {
    await client.shutdown();
    console.log('🔌 Cassandra connection closed');
  }
};

module.exports = { getClient, shutdown };