import { CreditCard, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export default function StatementTable({ transactions }) {
  return (
    <div className="bg-white rounded-lg p-4 flex flex-col h-full border border-gray-200 shadow-sm">
      <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-700">
        <CreditCard size={16} /> Account Statement
      </h2>
      <div className="overflow-auto flex-1">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead className="bg-gray-50 sticky top-0 shadow-sm">
            <tr>
              <th className="p-2 border-b text-gray-600 font-medium">Time</th>
              <th className="p-2 border-b text-gray-600 font-medium">Type</th>
              <th className="p-2 border-b text-gray-600 font-medium">Amount</th>
              <th className="p-2 border-b text-gray-600 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, i) => (
              <tr key={i} className="border-b hover:bg-gray-50 transition-colors">
                <td className="p-2 text-gray-500">{new Date(tx.time).toLocaleString()}</td>
                <td className="p-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                    tx.type === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {tx.type === 'CREDIT' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                    {tx.type}
                  </span>
                </td>
                <td className={`p-2 font-mono font-medium ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'CREDIT' ? '+' : '-'}{tx.amount} {tx.currency}
                </td>
                <td className="p-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    tx.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                    tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tx.status}
                  </span>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr><td colSpan="4" className="p-4 text-center text-gray-400">No transactions found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}