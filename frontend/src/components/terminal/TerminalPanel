import React, { useRef, useEffect, useState } from 'react';
import { useIngestionStream } from '../../hooks/useSocket';
import StatCard from '../shared/StatCard';
import Spinner from '../shared/Spinner';

const PRESETS = [
  { label: 'Slow  (100/s)',  batchSize: 10,  intervalMs: 100 },
  { label: 'Normal (500/s)', batchSize: 50,  intervalMs: 100 },
  { label: 'Fast  (1k/s)',   batchSize: 100, intervalMs: 100 },
];

export default function TerminalPanel() {
  const { isStreaming, tps, totalWritten, logLines, start, stop } = useIngestionStream();
  const [preset, setPreset] = useState(1);
  const logRef = useRef(null);

  // Auto-scroll khi có log mới
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [logLines.length]);

  const handleToggle = () => {
    if (isStreaming) stop();
    else start(PRESETS[preset]);
  };

  return (
    <div style={styles.panel}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.termDots}>
            <span style={{ ...styles.dot, background: '#ff5f57' }} />
            <span style={{ ...styles.dot, background: '#febc2e' }} />
            <span style={{ ...styles.dot, background: '#28c840' }} />
          </div>
          <span style={styles.termTitle}>cassandra@ledger:~$</span>
          {isStreaming && (
            <span style={styles.blinkCursor}>█</span>
          )}
        </div>
        <div style={styles.liveTag}>
          <span style={{ ...styles.liveDot, background: isStreaming ? 'var(--green)' : 'var(--text-dim)' }} />
          <span style={{ color: isStreaming ? 'var(--green)' : 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            {isStreaming ? 'LIVE' : 'IDLE'}
          </span>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={styles.statsRow}>
        <StatCard
          label="Throughput"
          value={isStreaming ? `${tps.toLocaleString()}` : '—'}
          sub="tx / second"
          accent={isStreaming ? 'var(--cyan)' : undefined}
        />
        <StatCard
          label="Total Written"
          value={totalWritten.toLocaleString()}
          sub="transactions"
        />
        <StatCard
          label="Cassandra"
          value="ledger"
          sub="keyspace · local"
        />
      </div>

      {/* ── Controls ── */}
      <div style={styles.controls}>
        <div style={styles.presetGroup}>
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => setPreset(i)}
              disabled={isStreaming}
              style={{
                ...styles.presetBtn,
                ...(preset === i ? styles.presetActive : {}),
                opacity: isStreaming ? 0.4 : 1,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button onClick={handleToggle} style={{ ...styles.mainBtn, ...(isStreaming ? styles.stopBtn : styles.startBtn) }}>
          {isStreaming ? (
            <><Spinner size={12} /> Dừng luồng</>
          ) : (
            <><span style={styles.playIcon}>▶</span> Tạo luồng giao dịch</>
          )}
        </button>
      </div>

      {/* ── Log terminal ── */}
      <div style={styles.logWrap} ref={logRef}>
        {logLines.length === 0 ? (
          <div style={styles.emptyLog}>
            <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {isStreaming ? 'Đang khởi tạo stream...' : '# Nhấn "Tạo luồng giao dịch" để bắt đầu'}
            </span>
          </div>
        ) : (
          logLines.map((line, i) => (
            <div
              key={i}
              style={{
                ...styles.logLine,
                animation: i < 10 ? `slide-in-row 0.25s ease both` : undefined,
                animationDelay: i < 10 ? `${i * 15}ms` : undefined,
              }}
            >
              <span style={styles.lineNum}>{String(logLines.length - i).padStart(4, ' ')}</span>
              <span style={styles.lineContent}>{line}</span>
            </div>
          ))
        )}
      </div>

      {/* ── Footer note ── */}
      <div style={styles.footer}>
        <span style={{ color: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
          Promise.all parallel write · prepared statements · partition key: account_id
        </span>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: '1px solid var(--border-dim)',
    background: 'var(--bg-card)',
    flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  termDots: { display: 'flex', gap: 5 },
  dot: { width: 10, height: 10, borderRadius: '50%', display: 'block' },
  termTitle: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.02em' },
  blinkCursor: { fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--cyan)', animation: 'blink 1s step-end infinite' },
  liveTag: { display: 'flex', alignItems: 'center', gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: '50%', animation: 'pulse-dot 1.5s ease-in-out infinite' },

  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    padding: '12px 16px',
    flexShrink: 0,
    borderBottom: '1px solid var(--border-dim)',
  },

  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: '1px solid var(--border-dim)',
    gap: 12,
    flexShrink: 0,
  },
  presetGroup: { display: 'flex', gap: 4 },
  presetBtn: {
    padding: '4px 10px',
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
    background: 'transparent',
    border: '1px solid var(--border-dim)',
    borderRadius: 4,
    color: 'var(--text-dim)',
    cursor: 'pointer',
    transition: 'all var(--dur-fast)',
  },
  presetActive: {
    background: 'var(--cyan-trace)',
    border: '1px solid var(--cyan-dim)',
    color: 'var(--cyan)',
  },
  mainBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 16px',
    borderRadius: 6,
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    transition: 'all var(--dur-fast)',
    letterSpacing: '0.03em',
  },
  startBtn: {
    background: 'var(--cyan)',
    color: '#000',
    boxShadow: '0 0 12px rgba(0,212,255,0.4)',
  },
  stopBtn: {
    background: 'var(--red-dim)',
    color: 'var(--red)',
    border: '1px solid var(--red)',
  },
  playIcon: { fontSize: 9 },

  logWrap: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    lineHeight: 1.7,
    background: 'var(--bg-void)',
  },
  emptyLog: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: 32,
  },
  logLine: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 12,
    padding: '1px 16px',
    transition: 'background var(--dur-fast)',
  },
  lineNum: { color: 'var(--text-dim)', fontSize: 10, userSelect: 'none', flexShrink: 0, width: 28, textAlign: 'right' },
  lineContent: { color: 'var(--text-mono)', whiteSpace: 'nowrap' },

  footer: {
    padding: '6px 16px',
    borderTop: '1px solid var(--border-dim)',
    background: 'var(--bg-card)',
    flexShrink: 0,
  },
};