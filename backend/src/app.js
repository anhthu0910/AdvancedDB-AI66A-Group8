require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const morgan     = require('morgan');

const cfg                  = require('./config/env');
const db                   = require('./db/client');
const routes               = require('./routes/index');
const errorHandler         = require('./middleware/errorHandler');
const { registerSocketHandlers } = require('./utils/socketHandler');

// ─── App ──────────────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan(cfg.server.env === 'development' ? 'dev' : 'combined'));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Socket.IO ────────────────────────────────────────────────────────────────
registerSocketHandlers(io);

// ─── Start ────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await db.connect();
    server.listen(cfg.server.port, () => {
      console.log(`[Server] Running on http://localhost:${cfg.server.port}`);
      console.log(`[Server] Env: ${cfg.server.env}`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM — shutting down');
  await db.disconnect();
  server.close(() => process.exit(0));
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT — shutting down');
  await db.disconnect();
  server.close(() => process.exit(0));
});

start();