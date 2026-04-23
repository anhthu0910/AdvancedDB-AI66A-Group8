// backend/src/app.js
const express = require('express');
const cors = require('cors');
const queryRoutes = require('./query/routes');
const { shutdown } = require('./shared/cassandra');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Cho phép Frontend (port 5173) gọi API
app.use(express.json()); // Parse request body dạng JSON

// Mount routes
app.use('/api', queryRoutes);

// Health check (tùy chọn)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Backend chạy tại http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api`);
});

// Graceful shutdown: đóng kết nối DB khi tắt server (Ctrl+C)
const gracefulShutdown = async (signal) => {
  console.log(`\n📥 Nhận tín hiệu ${signal}. Đang tắt server an toàn...`);
  server.close(async () => {
    await shutdown();
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));