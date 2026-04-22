import { useState } from 'react';
import LogPanel from './components/LogPanel';
import StatementTable from './components/StatementTable';
import ThroughputChart from './components/ThroughputChart';

// 🎲 Mock data tĩnh cho Day 2-3
const MOCK_LOGS = Array.from({ length: 500 }, (_, i) => ({
  time: new Date(Date.now() - i * 1000).toLocaleTimeString(),
  level: i % 10 === 0 ? 'error' : 'info',
  message: `Processed Tx #${1000 + i} | Partition: ACC0${(i % 9) + 1} | Latency: ${Math.floor(Math.random() * 25)}ms`
}));

const MOCK_TRANSACTIONS = Array.from({ length: 20 }, (_, i) => ({
  time: new Date(Date.now() - i * 3600000),
  type: i % 2 === 0 ? 'CREDIT' : 'DEBIT',
  amount: (Math.random() * 3000 + 10).toFixed(2),
  currency: 'USD',
  status: i % 5 === 0 ? 'PENDING' : 'COMPLETED'
}));

export default function App() {
  const [logs] = useState(MOCK_LOGS);
  const [transactions] = useState(MOCK_TRANSACTIONS);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800">🏦 AdvancedDB Banking Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Week 1, Day 2-3 | Static UI & Virtualization Ready</p>
      </header>

      {/* Layout chính: 2 columns cho panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4" style={{ minHeight: '550px' }}>
        <div className="h-full">
          <LogPanel logs={logs} />
        </div>
        <div className="h-full">
          <StatementTable transactions={transactions} />
        </div>
      </div>

      {/* Chart nằm riêng bên dưới, không overlap */}
      <div className="mt-4">
        <ThroughputChart />
      </div>
    </div>
  );
}