import React, { useState } from 'react';
import Spinner from '../shared/Spinner';

export default function SearchBar({ onSearch, loading }) {
  const [value, setValue] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const v = value.trim().toUpperCase();
    if (v) onSearch(v);
  };

  return (
    <form onSubmit={submit} style={styles.form}>
      <div style={styles.inputWrap}>
        <span style={styles.prefix}>account_id =</span>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="ACC000001"
          style={styles.input}
          spellCheck={false}
          autoComplete="off"
        />
        {loading && <div style={styles.spinnerWrap}><Spinner size={14} /></div>}
      </div>
      <button type="submit" disabled={loading || !value.trim()} style={styles.btn}>
        QUERY
      </button>
    </form>
  );
}

const styles = {
  form: { display: 'flex', gap: 8, alignItems: 'stretch' },
  inputWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg-void)',
    border: '1px solid var(--border-mid)',
    borderRadius: 'var(--radius-md)',
    padding: '0 12px',
    gap: 8,
    transition: 'border-color var(--dur-fast)',
    ':focus-within': { borderColor: 'var(--cyan)' },
  },
  prefix: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan-dim)', flexShrink: 0 },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    color: 'var(--text-primary)',
    padding: '10px 0',
    letterSpacing: '0.04em',
  },
  spinnerWrap: { flexShrink: 0 },
  btn: {
    padding: '0 20px',
    background: 'var(--cyan)',
    color: '#000',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    transition: 'all var(--dur-fast)',
    boxShadow: '0 0 12px rgba(0,212,255,0.3)',
  },
};