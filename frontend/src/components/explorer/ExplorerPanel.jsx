import React, { useState, useCallback } from 'react';
import SearchBar from './SearchBar';
import FilterBar from './FilterBar';
import AccountCard from './AccountCard';
import TransactionTable from './TransactionTable';
import AlertsPanel from './AlertsPanel';
import * as api from '../../api/index';
import { formatVND } from '../../utils/format';
import StatCard from '../shared/StatCard';

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

      setAccount(accData);
      setAlerts(alertData?.alerts || []);

      // Transactions — dùng MV nếu filter theo type, dùng partition key nếu ALL
      let txnData;
      if (f.type && f.type !== 'ALL') {
        // Materialized View: transactions_by_type
        txnData = await api.getTransactionsByType(f.type, {
          limit: f.limit,
          ...(f.from && f.to ? { from: f.from, to: f.to + 'T23:59:59' } : {}),
        });
        setTxns(txnData.data || []);
      } else {
        // Partition Key read — O(1) trên node
        txnData = await api.getTransactions(id, {
          limit: f.limit,
          ...(f.from && f.to ? { from: f.from, to: f.to + 'T23:59:59' } : {}),
        });
        setTxns(txnData.data || []);
      }

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
    if (accountId) query(accountId, f);
  };

  // Summary stats từ txns hiện tại
  const totalDeposit  = txns.filter(t => t.type === 'DEPOSIT').reduce((s, t) => s + Number(t.amount), 0);
  const totalWithdraw = txns.filter(t => ['WITHDRAW','PAYMENT'].includes(t.type)).reduce((s, t) => s + Number(t.amount), 0);
  const successRate   = txns.length ? Math.round(txns.filter(t => t.status === 'SUCCESS').length / txns.length * 100) : 0;

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
      {account && <div style={styles.section}><AccountCard account={account} /></div>}

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