import React from 'react';
import { SEVERITY_META, formatTime } from '../../utils/format';

export default function AlertsPanel({ alerts }) {
  if (!alerts?.length) return null;
  return (
    <div style={styles.wrap}>
      <span style={styles.title}>⚠ Fraud Alerts ({alerts.length})</span>
      <div style={styles.list}>
        {alerts.map((a, i) => {
          const meta = SEVERITY_META[a.severity] || { color: 'var(--text-dim)' };
          return (
            <div key={i} style={{ ...styles.alert, borderColor: meta.color + '50', background: meta.color + '0a' }}>
              <span style={{ ...styles.sev, color: meta.color }}>{a.severity}</span>
              <span style={styles.rule}>{a.rule_name}</span>
              <span style={styles.time}>{formatTime(a.detected_at)}</span>
              <span style={{ ...styles.status, color: a.status === 'OPEN' ? 'var(--red)' : 'var(--text-dim)' }}>{a.status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  wrap: { padding: '8px 14px', borderBottom: '1px solid var(--border-dim)', flexShrink: 0 },
  title: { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--yellow)', letterSpacing: '0.06em', marginBottom: 6, display: 'block' },
  list: { display: 'flex', flexDirection: 'column', gap: 3 },
  alert: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '5px 10px',
    borderRadius: 5,
    border: '1px solid',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
  },
  sev:    { fontWeight: 700, width: 52, flexShrink: 0 },
  rule:   { color: 'var(--text-secondary)', flex: 1 },
  time:   { color: 'var(--text-dim)' },
  status: { fontWeight: 600 },
};