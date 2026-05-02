// backend/src/controllers/accountController.js
const svc = require('../services/accountService');

exports.getAccount = async (req, res, next) => {
  try {
    const data = await svc.getById(req.params.accountId);
    if (!data) return res.status(404).json({ error: 'Account not found' });
    res.json(data);
  } catch (err) { next(err); }
};

exports.getAccountsByUser = async (req, res, next) => {
  try {
    const rows = await svc.getByUser(req.params.userId);
    res.json({ data: rows });
  } catch (err) { next(err); }
};

exports.getDailySummary = async (req, res, next) => {
  try {
    const { from, to, limit = 30 } = req.query;
    const rows = await svc.getSummary({ accountId: req.params.accountId, limit: parseInt(limit), from, to });
    res.json({ data: rows });
  } catch (err) { next(err); }
};

exports.getPaymentMethods = async (req, res, next) => {
  try {
    const rows = await svc.getPaymentMethods(req.params.accountId);
    res.json({ data: rows });
  } catch (err) { next(err); }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const rows = await svc.getNotifications(req.params.accountId);
    res.json({ data: rows });
  } catch (err) { next(err); }
};

exports.getFraudAlerts = async (req, res, next) => {
  try {
    const rows = await svc.getFraudAlerts(req.params.accountId);
    res.json({ data: rows });
  } catch (err) { next(err); }
};