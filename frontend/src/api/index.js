import axios from 'axios';

const http = axios.create({
  baseURL: '/api',
  timeout: 10_000,
});

// ─── Accounts ────────────────────────────────────────────────────────────────
export const getAccount       = id          => http.get(`/accounts/${id}`).then(r => r.data);
export const getAccountsByUser = userId     => http.get(`/users/${userId}/accounts`).then(r => r.data);
export const getDailySummary  = (id, params) => http.get(`/accounts/${id}/summary`, { params }).then(r => r.data);
export const getPaymentMethods = id         => http.get(`/accounts/${id}/methods`).then(r => r.data);
export const getNotifications = (id, params)=> http.get(`/accounts/${id}/notifications`, { params }).then(r => r.data);
export const getFraudAlerts   = (id, params)=> http.get(`/accounts/${id}/alerts`, { params }).then(r => r.data);

// ─── Transactions ─────────────────────────────────────────────────────────────
export const getTransactions = (accountId, params) =>
  http.get(`/transactions/${accountId}`, { params }).then(r => r.data);

export const getTransactionsByType = (type, params) =>
  http.get(`/transactions/by-type/${type}`, { params }).then(r => r.data);

export const createTransaction = body =>
  http.post('/transactions', body).then(r => r.data);

// ─── Ingestion ────────────────────────────────────────────────────────────────
export const writeBatch = (batchSize = 50) =>
  http.post('/ingestion/batch', { batchSize }).then(r => r.data);

// ─── Health ───────────────────────────────────────────────────────────────────
export const getHealth = () => http.get('/health').then(r => r.data);