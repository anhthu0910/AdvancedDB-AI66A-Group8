// ============================================================
// src/utils/socketHandler.js
// Socket.IO: quản lý luồng giao dịch real-time cho demo UI
//
// Events từ client → server:
//   stream:start  { batchSize, intervalMs }  — bắt đầu sinh giao dịch
//   stream:stop                              — dừng luồng
//
// Events từ server → client:
//   stream:tick   { written, tps, elapsed_ms, items[] }  — mỗi batch xong
//   stream:error  { message }
// ============================================================

const ingestionService = require('../services/ingestionService');

// Map socket.id → AbortController để dừng stream
const activeStreams = new Map();

function registerSocketHandlers(io) {
  io.on('connection', socket => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on('stream:start', async ({ batchSize = 50, intervalMs = 100 } = {}) => {
      // Dừng stream cũ nếu client đang chạy
      stopStream(socket.id);

      const controller = new AbortController();
      activeStreams.set(socket.id, controller);

      console.log(`[Socket] Stream start — id:${socket.id} | batch:${batchSize} | interval:${intervalMs}ms`);

      ingestionService.startStream({
        batchSize,
        intervalMs,
        signal: controller.signal,
        onBatch: result => {
          socket.emit('stream:tick', {
            written    : result.written,
            tps        : result.tps,
            elapsed_ms : result.elapsed_ms,
            // Gửi tối đa 20 item mẫu để UI hiển thị log — không gửi hết tránh bandwidth
            items      : result.items.slice(0, 20).map(t => ({
              txn_id     : t.txn_id?.toString(),
              account_id : t.account_id,
              type       : t.type,
              amount     : t.amount?.toString(),
              status     : t.status,
              channel    : t.channel,
              txn_time   : t.txn_time,
            })),
          });
        },
      }).catch(err => {
        socket.emit('stream:error', { message: err.message });
      });
    });

    socket.on('stream:stop', () => {
      stopStream(socket.id);
      console.log(`[Socket] Stream stopped: ${socket.id}`);
    });

    socket.on('disconnect', () => {
      stopStream(socket.id);
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });
}

function stopStream(socketId) {
  const controller = activeStreams.get(socketId);
  if (controller) {
    controller.abort();
    activeStreams.delete(socketId);
  }
}

module.exports = { registerSocketHandlers };