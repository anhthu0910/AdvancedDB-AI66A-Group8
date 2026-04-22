import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';

// Mock data cho Day 2-3 (chưa gọi API thật)
const mockData = Array.from({ length: 20 }, (_, i) => ({
  time: `${i}s`,
  throughput: Math.floor(Math.random() * 120) + 80
}));

export default function ThroughputChart() {
  return (
    <div className="bg-white rounded-lg p-4 mt-4 border border-gray-200 shadow-sm">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-700">
        <Activity size={16} /> Throughput (tx/s) - Placeholder
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockData}>
            <defs>
              <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Area type="monotone" dataKey="throughput" stroke="#3b82f6" fill="url(#colorTx)" name="Transactions/sec" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}