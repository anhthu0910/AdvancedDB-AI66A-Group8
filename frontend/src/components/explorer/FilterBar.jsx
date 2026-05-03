import React from 'react';

const TYPES = ['ALL', 'DEPOSIT', 'WITHDRAW', 'TRANSFER', 'PAYMENT', 'REFUND'];
const TYPE_COLORS = {
  DEPOSIT:  'var(--green)',
  WITHDRAW: 'var(--red)',
  TRANSFER: 'var(--blue)',
  PAYMENT:  'var(--orange)',
  REFUND:   'var(--purple)',
  ALL:      'var(--cyan)',
};

export default function FilterBar({ filters, onChange }) {
  const { type, limit, from, to } = filters;

  return (
    <div style={styles.bar}>
      {/* Type filter */}
      <div style={styles.group}>
        <span style={styles.label}>type</span>
        <div style={styles.pills}>
          {TYPES.map(t => {
            const active = type === t;
            const color = TYPE_COLORS[t] || 'var(--text-dim)';
            return (
              <button key={t} onClick={() => onChange({ ...filters, type: t })}
                style={{
                  ...styles.pill,
                  color: active ? (t === 'ALL' ? '#000' : color) : 'var(--text-dim)',
                  background: active ? (t === 'ALL' ? 'var(--cyan)' : color + '20') : 'transparent',
                  borderColor: active ? color : 'var(--border-dim)',
                  boxShadow: active && t !== 'ALL' ? `0 0 8px ${color}40` : 'none',
                }}>
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div style={styles.divider} />

      {/* Time range */}
      <div style={styles.group}>
        <span style={styles.label}>from</span>
        <input type="date" value={from} onChange={e => onChange({ ...filters, from: e.target.value })} style={styles.dateInput} />
        <span style={styles.label}>to</span>
        <input type="date" value={to} onChange={e => onChange({ ...filters, to: e.target.value })} style={styles.dateInput} />
      </div>

      <div style={styles.divider} />

      {/* Limit */}
      <div style={styles.group}>
        <span style={styles.label}>limit</span>
        {[20, 50, 100, 200].map(n => (
          <button key={n} onClick={() => onChange({ ...filters, limit: n })}
            style={{
              ...styles.pill,
              color: limit === n ? 'var(--cyan)' : 'var(--text-dim)',
              background: limit === n ? 'var(--cyan-trace)' : 'transparent',
              borderColor: limit === n ? 'var(--cyan-dim)' : 'var(--border-dim)',
            }}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-dim)',
    borderRadius: 'var(--radius-md)',
    flexWrap: 'wrap',
  },
  group: { display: 'flex', alignItems: 'center', gap: 6 },
  label: { fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' },
  pills: { display: 'flex', gap: 4 },
  pill: {
    padding: '3px 9px',
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
    fontWeight: 500,
    borderRadius: 4,
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 120ms',
    letterSpacing: '0.04em',
  },
  divider: { width: 1, height: 20, background: 'var(--border-dim)', flexShrink: 0 },
  dateInput: {
    background: 'var(--bg-void)',
    border: '1px solid var(--border-dim)',
    borderRadius: 4,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    padding: '3px 7px',
    outline: 'none',
    cursor: 'pointer',
  },
};