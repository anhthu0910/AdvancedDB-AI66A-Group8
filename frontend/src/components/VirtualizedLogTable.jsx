// frontend/src/components/VirtualizedLogTable.jsx
import { useState, useEffect, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { accountAPI } from '../services/api';

const Row = ({ index, style, data }) => {
  const { items } = data;
  const tx = items[index];
  
  return (
    <div style={style} className="px-4 py-2 hover:bg-gray-50 border-b border-gray-100">
      <div className="flex justify-between text-sm">
        <span className="font-mono text-gray-600">
          {new Date(tx.transaction_time).toLocaleTimeString()}
        </span>
        <span className={`px-2 py-0.5 rounded text-xs ${
          tx.type === 'transfer' ? 'bg-blue-100 text-blue-800' :
          tx.type === 'deposit' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {tx.type}
        </span>
        <span className={`font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()} VND
        </span>
      </div>
      <div className="text-xs text-gray-500 truncate">{tx.description}</div>
    </div>
  );
};

export default function VirtualizedLogTable({ accountId, dateRange }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Gọi API khi accountId hoặc dateRange thay đổi
  useEffect(() => {
    if (!accountId) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const filters = {};
        if (dateRange?.from) filters.from = dateRange.from;
        if (dateRange?.to) filters.to = dateRange.to;
        
        const result = await accountAPI.getTransactions(accountId, filters);
        setTransactions(result.data || []);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load transactions');
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [accountId, dateRange]);

  // Memoize row data để tối ưu re-render
  const rowData = useMemo(() => ({ items: transactions }), [transactions]);

  if (loading) return <div className="p-8 text-center text-gray-500">🔄 Đang tải giao dịch...</div>;
  if (error) return <div className="p-8 text-center text-red-500">❌ Lỗi: {error}</div>;
  if (transactions.length === 0) return <div className="p-8 text-center text-gray-400">📭 Không có giao dịch</div>;

  return (
    <div className="h-full border rounded-lg overflow-hidden">
      <List
        height={600} // Adjust based on your layout
        itemCount={transactions.length}
        itemSize={80} // Height of each row
        width="100%"
        itemData={rowData}
      >
        {Row}
      </List>
      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t">
        Hiển thị {transactions.length} giao dịch • Account: {accountId}
      </div>
    </div>
  );
}