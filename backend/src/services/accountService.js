const db = require('../db/client');
const Q  = require('../db/queries');

async function getById(accountId) {
  const result = await db.execute(Q.GET_ACCOUNT, [accountId]);
  return result.rows[0] || null;
}

async function getByUser(userId) {
  const result = await db.execute(Q.GET_ACCOUNTS_BY_USER, [userId]);
  return result.rows;
}

async function getSummary({ accountId, limit = 30, from, to }) {
  if (from && to) {
    const result = await db.execute(Q.GET_DAILY_SUMMARY_RANGE, [accountId, from, to]);
    return result.rows;
  }
  const result = await db.execute(Q.GET_DAILY_SUMMARY, [accountId, limit]);
  return result.rows;
}

async function getPaymentMethods(accountId) {
  const result = await db.execute(Q.GET_PAYMENT_METHODS, [accountId]);
  return result.rows;
}

async function getNotifications(accountId, limit = 20) {
  const result = await db.execute(Q.GET_NOTIFICATIONS, [accountId, limit]);
  return result.rows;
}

async function getFraudAlerts(accountId, limit = 20) {
  const result = await db.execute(Q.GET_FRAUD_ALERTS, [accountId, limit]);
  return result.rows;
}

module.exports = { getById, getByUser, getSummary, getPaymentMethods, getNotifications, getFraudAlerts };