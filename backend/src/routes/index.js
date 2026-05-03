const router  = require('express').Router();
const { body, param, query } = require('express-validator');

const txnCtrl       = require('../controllers/transactionController');
const accCtrl       = require('../controllers/accountController');
const ingestionCtrl = require('../controllers/ingestionController');

// ─── Health ───────────────────────────────────────────────────────────────────
router.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// ─── Accounts ────────────────────────────────────────────────────────────────
router.get('/accounts/:accountId',
  param('accountId').notEmpty(),
  accCtrl.getAccount);

router.get('/users/:userId/accounts',
  param('userId').notEmpty(),
  accCtrl.getAccountsByUser);

router.get('/accounts/:accountId/summary',   accCtrl.getDailySummary);
router.get('/accounts/:accountId/methods',   accCtrl.getPaymentMethods);
router.get('/accounts/:accountId/notifications', accCtrl.getNotifications);
router.get('/accounts/:accountId/alerts',    accCtrl.getFraudAlerts);

// ─── Transactions ────────────────────────────────────────────────────────────

// *** FIX: specific route MUST come before the :accountId wildcard ***
// Query qua Materialized View — theo loại giao dịch
router.get('/transactions/by-type/:type',
  param('type').isIn(['DEPOSIT', 'WITHDRAW', 'TRANSFER', 'PAYMENT', 'REFUND']),
  txnCtrl.getByType);

// Lịch sử theo account — Partition Key read O(1)
router.get('/transactions/:accountId',
  param('accountId').notEmpty(),
  query('limit').optional().isInt({ min: 1, max: 500 }),
  txnCtrl.getByAccount);

// Ghi 1 giao dịch
router.post('/transactions',
  body('accountId').notEmpty(),
  body('type').isIn(['DEPOSIT', 'WITHDRAW', 'TRANSFER', 'PAYMENT', 'REFUND']),
  body('amount').isNumeric(),
  txnCtrl.createOne);

// ─── Ingestion demo (REST) ────────────────────────────────────────────────────
router.post('/ingestion/batch', ingestionCtrl.writeBatch);

module.exports = router;