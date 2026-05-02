import React from 'react';
import TerminalPanel from '../components/terminal/TerminalPanel';
import ExplorerPanel from '../components/explorer/ExplorerPanel';

export default function TransactionExplorer() {
  return (
    <div style={styles.root}>
      {/* ── Top bar ── */}
      <header style={styles.topBar}>
        <div style={styles.logo}>
          <span style={styles.logoMark}>◈</span>
          <span style={styles.logoText}>Financial Ledger</span>
          <span style={styles.logoBadge}>Cassandra · Column-Family</span>
        </div>
        <nav style={styles.nav}>
          <span style={styles.navItem}>Transaction Explorer</span>
          <div style={styles.dbIndicator}>
            <span style={styles.dbDot} />
            <span style={styles.dbLabel}>ledger · datacenter1</span>
          </div>
        </nav>
      </header>

      {/* ── Split layout ── */}
      <main style={styles.main}>
        {/* Left: Terminal / Ingestion */}
        <div style={styles.leftPane}>
          <TerminalPanel />
        </div>

        {/* Divider */}
        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <div style={styles.dividerIcon}>⇄</div>
          <div style={styles.dividerLine} />
        </div>

        {/* Right: Explorer / Query */}
        <div style={styles.rightPane}>
          <ExplorerPanel />
        </div>
      </main>
    </div>
  );
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
  },

  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: 48,
    background: 'var(--bg-card)',
    borderBottom: '1px solid var(--border-dim)',
    flexShrink: 0,
    zIndex: 10,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10 },
  logoMark: { fontSize: 18, color: 'var(--cyan)', filter: 'drop-shadow(0 0 8px var(--cyan))' },
  logoText: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' },
  logoBadge: {
    fontSize: 9,
    fontFamily: 'var(--font-mono)',
    color: 'var(--cyan-dim)',
    background: 'var(--cyan-trace)',
    border: '1px solid var(--cyan-dim)',
    padding: '2px 8px',
    borderRadius: 12,
    letterSpacing: '0.04em',
  },
  nav: { display: 'flex', alignItems: 'center', gap: 20 },
  navItem: { fontSize: 12, color: 'var(--cyan)', fontWeight: 500, borderBottom: '1px solid var(--cyan)', paddingBottom: 2 },
  dbIndicator: { display: 'flex', alignItems: 'center', gap: 6 },
  dbDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: 'var(--green)',
    boxShadow: '0 0 6px var(--green)',
    animation: 'pulse-dot 2s ease-in-out infinite',
  },
  dbLabel: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' },

  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    padding: '14px 16px',
    gap: 0,
  },

  leftPane: {
    flex: '0 0 48%',
    overflow: 'hidden',
    minWidth: 0,
  },
  rightPane: {
    flex: '0 0 48%',
    overflow: 'hidden',
    minWidth: 0,
  },
  divider: {
    flex: '0 0 4%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '0 4px',
  },
  dividerLine: {
    flex: 1,
    width: 1,
    background: 'linear-gradient(to bottom, transparent, var(--border-mid), transparent)',
    maxHeight: 200,
  },
  dividerIcon: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'var(--text-dim)',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-dim)',
    borderRadius: 4,
    padding: '4px 6px',
    userSelect: 'none',
  },
};