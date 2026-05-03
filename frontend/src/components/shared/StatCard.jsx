import React from 'react';

export default function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-dim)',
      padding: '12px 16px',
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }}>
      <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 600, color: accent || 'var(--text-primary)' }}>{value}</span>
      {sub && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{sub}</span>}
    </div>
  );
}
