import React from 'react';
import Badge from '../shared/Badge';
import { formatVND, formatTime, txnMeta, statusMeta } from '../../utils/format';

export default function TransactionTable({ rows, loading }) {
  if (!rows.length && !loading) return null;

  return (
    <div style={styles.wrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            {['txn_id', 'txn_time', 'type', 'amount', 'fee', 'status', 'channel', 'counterparty'].map(col => (
              <th key={col} style={styles.th}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const meta  = txnMeta(row.type);
            const sMeta = statusMeta(row.status);
            const amt   = Number(row.amount);
            return (
              <tr key={`${row.txn_id}-${i}`} className="animate-slide-row"
                  style={{ ...styles.tr, animationDelay: `${Math.min(i, 20) * 20}ms` }}>
                <td style={styles.td}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                    {String(row.txn_id).slice(0, 8)}…
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>
                    {formatTime(row.txn_time)}
                  </span>
                </td>
                <td style={styles.td}>
                  <Badge label={meta.label} color={meta.color} bg={meta.bg} />
                </td>
                <td style={{ ...styles.td, textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
                    color: meta.sign === '+' ? 'var(--green)' : meta.sign === '-' ? 'var(--red)' : 'var(--blue)' }}>
                    {meta.sign}{formatVND(amt)}
                  </span>
                </td>
                <td style={{ ...styles.td, textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                    {Number(row.fee) > 0 ? formatVND(row.fee) : '—'}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: sMeta.color }}>
                    {sMeta.label}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 3 }}>
                    {row.channel || '—'}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cyan-dim)' }}>
                    {row.counterparty_id || '—'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  wrap: { overflowX: 'auto', overflowY: 'auto', flex: 1 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: {
    padding: '8px 12px',
    textAlign: 'left',
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    fontWeight: 600,
    color: 'var(--text-dim)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    borderBottom: '1px solid var(--border-dim)',
    background: 'var(--bg-card)',
    position: 'sticky',
    top: 0,
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid var(--border-dim)',
    transition: 'background var(--dur-fast)',
    animation: 'slide-in-row 0.25s ease both',
  },
  td: {
    padding: '7px 12px',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  },
};