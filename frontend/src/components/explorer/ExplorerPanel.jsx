import React, { useState, useCallback, useEffect } from 'react';
import SearchBar from './SearchBar';
import FilterBar from './FilterBar';
import AccountCard from './AccountCard';
import TransactionTable from './TransactionTable';
import AlertsPanel from './AlertsPanel';
import * as api from '../../api/index';
import { formatVND } from '../../utils/format';
import StatCard from '../shared/StatCard';
import { useIngestionStream } from '../../hooks/useSocket';

const defaultFilters = {
  type:  'ALL',
  limit: 50,
  from:  '',
  to:    '',
};

export default function ExplorerPanel() {
  const [accountId, setAccountId]   = useState('');
  const [account,   setAccount]     = useState(null);
  const [txns,      setTxns]        = useState([]);
  const [alerts,    setAlerts]      = useState([]);
  const [filters,   setFilters]     = useState(defaultFilters);
  const [loading,   setLoading]     = useState(false);
  const [queryMs,   setQueryMs]     = useState(null);
  const [error,     setError]       = useState('');
  const [currentBalance, setCurrentBalance] = useState(0);

  const { latestItems } = useIngestionStream();

  // Cập nhật balance realtime dựa trên giao dịch mới từ stream
  useEffect(() => {
    if (!accountId || !account) return;

    const relevantTxns = latestItems.filter(t => t.account_id === accountId && t.status === 'SUCCESS');

    setCurrentBalance(prev => {
      let newBalance = prev;
      relevantTxns.forEach(t => {
        const amt = Number(t.amount);
        switch (t.type) {
          case 'DEPOSIT':
          case 'REFUND':
            newBalance += amt;
            break;
          case 'WITHDRAW':
          case 'TRANSFER':
          case 'PAYMENT':
            newBalance -= amt;
            break;
        }
      });
      return newBalance;
    });
  }, [latestItems, accountId, account]);

  const query = useCallback(async (id, f = filters) => {
    if (!id) return;
    setLoading(true);
    setError('');
    const t0 = performance.now();

    try {
      // Parallel: account info + transactions + alerts
      const [accData, alertData] = await Promise.all([
        api.getAccount(id).catch(() => null),
        api.getFraudAlerts(id, { limit: 10 }).catch(() => ({ alerts: [] })),
      ]);

      if (!accData) {
        setAccount(null);
        setAlerts([]);
        setTxns([]);
        setError(`Tài khoản ${id} không tồn tại`);
        setQueryMs(null);
        setLoading(false);
        return;
      }

      setAccount(accData);
      setCurrentBalance(Number(accData.balance));
      setAlerts(alertData?.alerts || []);

      // Transactions — luôn query theo account_id để giữ đúng context
      const txnData = await api.getTransactions(id, {
        limit: f.limit,
        ...(f.type && f.type !== 'ALL' ? { type: f.type } : {}),
        ...(f.from && f.to ? { from: f.from, to: f.to } : {}),
      });
      setTxns(txnData.data || []);

      setQueryMs(Math.round(performance.now() - t0));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setTxns([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleSearch = (id) => {
    setAccountId(id);
    query(id, filters);
  };

  const handleFilterChange = (f) => {
    setFilters(f);
    if (accountId) {
      setTxns([]); // Clear txns trước khi query mới
      query(accountId, f);
    }
  };

  // Summary stats từ txns hiện tại
  const totalDeposit  = txns.filter(t => t.type === 'DEPOSIT').reduce((s, t) => s + Number(t.amount), 0);
  const totalWithdraw = txns.filter(t => ['WITHDRAW','PAYMENT'].includes(t.type)).reduce((s, t) => s + Number(t.amount), 0);
  const successRate   = txns.length ? Math.round(txns.filter(t => t.status === 'SUCCESS').length / txns.length * 100) : 0;

  // Tạo account object với balance realtime
  const accountWithRealtimeBalance = account ? { ...account, balance: currentBalance } : null;

  return (
    <div style={styles.panel}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Transaction Explorer</div>
          <div style={styles.subtitle}>Partition Key read · Materialized View filter</div>
        </div>
        {queryMs !== null && (
          <div style={styles.queryTime}>
            <span style={styles.queryDot} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--green)' }}>
              {queryMs}ms
            </span>
          </div>
        )}
      </div>

      {/* ── Search ── */}
      <div style={styles.section}>
        <SearchBar onSearch={handleSearch} loading={loading} />
      </div>

      {error && (
        <div style={styles.error}>{error}</div>
      )}

      {/* ── Account card ── */}
      {accountWithRealtimeBalance && <div style={styles.section}><AccountCard account={accountWithRealtimeBalance} /></div>}

      {/* ── Mini stats ── */}
      {txns.length > 0 && (
        <div style={styles.statsGrid}>
          <StatCard label="Transactions" value={txns.length} sub={`limit: ${filters.limit}`} />
          <StatCard label="Inflow"       value={formatVND(totalDeposit)}  accent="var(--green)" />
          <StatCard label="Outflow"      value={formatVND(totalWithdraw)} accent="var(--red)" />
          <StatCard label="Success rate" value={`${successRate}%`}         accent={successRate > 80 ? 'var(--green)' : 'var(--yellow)'} />
        </div>
      )}

      {/* ── Filters ── */}
      {accountId && (
        <div style={styles.section}>
          <FilterBar filters={filters} onChange={handleFilterChange} />
        </div>
      )}

      {/* ── Alerts strip ── */}
      {alerts.length > 0 && <AlertsPanel alerts={alerts} />}

      {/* ── Table ── */}
      <div style={styles.tableWrap}>
        {loading && !txns.length ? (
          <div style={styles.loadingMsg}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
              Querying Cassandra…
            </span>
          </div>
        ) : txns.length > 0 ? (
          <TransactionTable rows={txns} loading={loading} />
        ) : accountId && !loading ? (
          <div style={styles.loadingMsg}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
              # Không có giao dịch phù hợp
            </span>
          </div>
        ) : !accountId ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>⬡</div>
            <div style={styles.emptyText}>Nhập account_id để truy vấn sao kê</div>
            <div style={styles.emptyHint}>Dữ liệu được gom cụm theo Partition Key → đọc O(1)</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-dim)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '14px 18px 12px',
    borderBottom: '1px solid var(--border-dim)',
    background: 'var(--bg-card)',
    flexShrink: 0,
  },
  title: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' },
  subtitle: { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginTop: 2 },
  queryTime: { display: 'flex', alignItems: 'center', gap: 5, background: 'var(--green-dim)', border: '1px solid var(--green)', padding: '4px 10px', borderRadius: 20 },
  queryDot: { width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' },

  section: { padding: '10px 14px', flexShrink: 0, borderBottom: '1px solid var(--border-dim)' },
  error: { margin: '0 14px', padding: '8px 12px', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--red)', flexShrink: 0 },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 6,
    padding: '8px 14px',
    borderBottom: '1px solid var(--border-dim)',
    flexShrink: 0,
  },

  tableWrap: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  loadingMsg: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 24 },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 10, padding: 32 },
  emptyIcon: { fontSize: 40, color: 'var(--border-mid)', lineHeight: 1 },
  emptyText: { fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 },
  emptyHint: { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' },
};