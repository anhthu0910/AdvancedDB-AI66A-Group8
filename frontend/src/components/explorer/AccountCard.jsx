import React from 'react';
import { formatVND, formatDate } from '../../utils/format';

const ACCOUNT_TYPE_COLOR = {
  CHECKING: 'var(--cyan)',
  SAVINGS:  'var(--green)',
  CREDIT:   'var(--orange)',
  WALLET:   'var(--purple)',
};

const STATUS_COLOR = {
  ACTIVE: 'var(--green)',
  FROZEN: 'var(--yellow)',
  CLOSED: 'var(--text-dim)',
};

export default function AccountCard({ account }) {
  if (!account) return null;
  const typeColor   = ACCOUNT_TYPE_COLOR[account.account_type] || 'var(--cyan)';
  const statusColor = STATUS_COLOR[account.status] || 'var(--text-dim)';

  return (
    <div style={styles.card} className="animate-fade-in">
      {/* Accent bar */}
      <div style={{ ...styles.accentBar, background: typeColor }} />

      <div style={styles.body}>
        <div style={styles.row}>
          <div>
            <div style={styles.accountId}>{account.account_id}</div>
            <div style={styles.userId}>user: {account.user_id}</div>
          </div>
          <div style={styles.right}>
            <span style={{ ...styles.typeBadge, color: typeColor, borderColor: typeColor + '40', background: typeColor + '12' }}>
              {account.account_type}
            </span>
            <span style={{ ...styles.statusDot, background: statusColor }} />
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: statusColor }}>{account.status}</span>
          </div>
        </div>

        <div style={styles.balanceRow}>
          <span style={styles.balanceLabel}>balance</span>
          <span style={{ ...styles.balance, color: typeColor }}>{formatVND(account.balance)}</span>
        </div>

        <div style={styles.meta}>
          <span style={styles.metaItem}><span style={styles.metaKey}>currency</span> {account.currency}</span>
          {account.credit_limit && (
            <span style={styles.metaItem}><span style={styles.metaKey}>limit</span> {formatVND(account.credit_limit)}</span>
          )}
          <span style={styles.metaItem}><span style={styles.metaKey}>opened</span> {formatDate(account.opened_at)}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    display: 'flex',
  },
  accentBar: { width: 3, flexShrink: 0 },
  body: { flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  accountId: { fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' },
  userId: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 2 },
  right: { display: 'flex', alignItems: 'center', gap: 6 },
  typeBadge: { fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 3, border: '1px solid' },
  statusDot: { width: 6, height: 6, borderRadius: '50%' },
  balanceRow: { display: 'flex', alignItems: 'baseline', gap: 10 },
  balanceLabel: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em' },
  balance: { fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700 },
  meta: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  metaItem: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' },
  metaKey: { color: 'var(--text-dim)', marginRight: 4 },
};