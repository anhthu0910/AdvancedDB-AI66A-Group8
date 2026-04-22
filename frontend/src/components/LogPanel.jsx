import { FixedSizeList as List } from 'react-window';
import { Terminal } from 'lucide-react';

export default function LogPanel({ logs }) {
  // Component render từng dòng log (react-window sẽ gọi lặp lại)
  const LogRow = ({ index, style }) => {
    const log = logs[index];
    return (
      <div style={style} className="flex items-center px-3 text-xs font-mono border-b border-gray-800 bg-gray-950">
        <span className="text-gray-500 w-20 shrink-0">{log.time}</span>
        <span className="mx-2">{log.level === 'error' ? '❌' : '✅'}</span>
        <span className="text-gray-300 truncate">{log.message}</span>
      </div>
    );
  };

  return (
    <div className="bg-gray-950 text-white rounded-lg p-4 flex flex-col h-full border border-gray-800 shadow-lg">
      <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-300">
        <Terminal size={16} /> System Logs ({logs.length})
      </h2>
      <div className="flex-1 overflow-hidden rounded border border-gray-700 bg-black">
        {logs.length > 0 ? (
          <List
            height={480}          // Chiều cao vùng scroll (px)
            itemCount={logs.length}
            itemSize={32}         // Chiều cao 1 dòng phải khớp với CSS padding
            width="100%"
          >
            {LogRow}
          </List>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">No logs yet...</div>
        )}
      </div>
    </div>
  );
}