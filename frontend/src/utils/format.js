import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export const formatVND = (amount) => {
  const n = Number(amount);
  if (isNaN(n)) return '—';
  return n.toLocaleString('vi-VN') + ' ₫';
};

export const formatAmount = (amount) => {
  const n = Number(amount);
  if (isNaN(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ₫`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K ₫`;
  return `${n} ₫`;
};

export const formatTime = (ts) => {
  if (!ts) return '—';
  try { return format(new Date(ts), 'HH:mm:ss dd/MM/yy'); }
  catch { return '—'; }
};

export const formatDate = (ts) => {
  if (!ts) return '—';
  try { return format(new Date(ts), 'dd/MM/yyyy'); }
  catch { return '—'; }
};

export const fromNow = (ts) => {
  if (!ts) return '—';
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: vi }); }
  catch { return '—'; }
};

// Transaction type — màu & label
export const TXN_META = {
  DEPOSIT:  { label: 'DEPOSIT',  color: 'var(--green)',  bg: 'var(--green-dim)',  sign: '+' },
  WITHDRAW: { label: 'WITHDRAW', color: 'var(--red)',    bg: 'var(--red-dim)',    sign: '-' },
  TRANSFER: { label: 'TRANSFER', color: 'var(--blue)',   bg: 'var(--blue-dim)',   sign: '↔' },
  PAYMENT:  { label: 'PAYMENT',  color: 'var(--orange)', bg: 'var(--orange-dim)', sign: '-' },
  REFUND:   { label: 'REFUND',   color: 'var(--purple)', bg: 'var(--purple-dim)', sign: '+' },
};

export const STATUS_META = {
  SUCCESS:  { label: 'SUCCESS',  color: 'var(--green)' },
  PENDING:  { label: 'PENDING',  color: 'var(--yellow)' },
  FAILED:   { label: 'FAILED',   color: 'var(--red)' },
  REVERSED: { label: 'REVERSED', color: 'var(--purple)' },
};

export const SEVERITY_META = {
  LOW:      { color: 'var(--blue)' },
  MEDIUM:   { color: 'var(--yellow)' },
  HIGH:     { color: 'var(--orange)' },
  CRITICAL: { color: 'var(--red)' },
};

export const txnMeta   = t => TXN_META[t]    || { label: t, color: 'var(--text-dim)', bg: 'transparent', sign: '' };
export const statusMeta = s => STATUS_META[s] || { label: s, color: 'var(--text-dim)' };