import React from 'react';

export default function Badge({ label, color, bg }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 600,
      color: color || 'var(--text-primary)',
      background: bg || 'var(--bg-card)',
      padding: '2px 8px',
      borderRadius: 12,
      border: `1px solid ${color || 'var(--border-dim)'}`,
      display: 'inline-block'
    }}>
      {label}
    </span>
  );
}
