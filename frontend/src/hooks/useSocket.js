import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

// Kết nối Socket.IO đến backend (qua Vite proxy)
let _socket = null;
function getSocket() {
  if (!_socket) {
    _socket = io('/', { path: '/socket.io', transports: ['websocket'] });
  }
  return _socket;
}

/**
 * useIngestionStream
 * Quản lý stream giao dịch real-time qua Socket.IO
 *
 * Trả về:
 *   isStreaming  — đang chạy hay không
 *   tps          — throughput hiện tại (tx/s)
 *   totalWritten — tổng số GD đã ghi từ lúc start
 *   logLines     — mảng string log mới nhất (max 200 dòng)
 *   latestItems  — batch items mới nhất để hiển thị
 *   start(opts)  — bắt đầu stream
 *   stop()       — dừng stream
 */
export function useIngestionStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [tps,         setTps]         = useState(0);
  const [totalWritten,setTotalWritten]= useState(0);
  const [logLines,    setLogLines]    = useState([]);
  const [latestItems, setLatestItems] = useState([]);
  const totalRef = useRef(0);

  useEffect(() => {
    const socket = getSocket();

    const onTick = ({ written, tps, items }) => {
      totalRef.current += written;
      setTps(tps);
      setTotalWritten(totalRef.current);
      setLatestItems(items);

      // Sinh log lines từ items nhận được
      const newLines = items.map(t => {
        const time = new Date(t.txn_time).toLocaleTimeString('vi-VN', { hour12: false });
        const amt  = Number(t.amount).toLocaleString('vi-VN');
        return `[${time}] ${t.txn_id?.slice(0,8)}… ${t.account_id.padEnd(10)} ${t.type.padEnd(9)} ${amt.padStart(14)} VND  ${t.status}  ${t.channel}`;
      });

      setLogLines(prev => {
        const next = [...newLines, ...prev];
        return next.slice(0, 200); // giữ tối đa 200 dòng
      });
    };

    const onError = ({ message }) => {
      setLogLines(prev => [`[ERROR] ${message}`, ...prev]);
      setIsStreaming(false);
    };

    socket.on('stream:tick',  onTick);
    socket.on('stream:error', onError);

    return () => {
      socket.off('stream:tick',  onTick);
      socket.off('stream:error', onError);
    };
  }, []);

  const start = useCallback(({ batchSize = 50, intervalMs = 100 } = {}) => {
    totalRef.current = 0;
    setTotalWritten(0);
    setLogLines([]);
    setTps(0);
    setIsStreaming(true);
    getSocket().emit('stream:start', { batchSize, intervalMs });
  }, []);

  const stop = useCallback(() => {
    setIsStreaming(false);
    getSocket().emit('stream:stop');
  }, []);

  return { isStreaming, tps, totalWritten, logLines, latestItems, start, stop };
}