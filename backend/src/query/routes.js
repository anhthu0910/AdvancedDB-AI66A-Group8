// backend/src/query/routes.js
const express = require('express');
const router = express.Router();
const { getClient } = require('../shared/cassandra');

// GET /api/accounts/:accountId/transactions
router.get('/accounts/:accountId/transactions', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { type, from, to, limit = 50 } = req.query;
    
    const client = await getClient();
    
    // Build dynamic query with filters
    let query = `SELECT transaction_id, transaction_time, type, amount, description 
                 FROM transactions WHERE account_id = ?`;
    const params = [accountId];
    
    if (from) {
      query += ` AND transaction_time >= ?`;
      params.push(new Date(from));
    }
    if (to) {
      query += ` AND transaction_time <= ?`;
      params.push(new Date(to));
    }
    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }
    
    query += ` ORDER BY transaction_time DESC LIMIT ?`;
    params.push(parseInt(limit));
    
    const result = await client.execute(query, params, { prepare: true });
    
    // Format response
    const transactions = result.rows.map(row => ({
      transaction_id: row.transaction_id,
      transaction_time: row.transaction_time,
      type: row.type,
      amount: parseFloat(row.amount),
      description: row.description
    }));
    
    res.json({
      success: true,
      data: transactions,
      meta: {
        count: transactions.length,
        accountId,
        filters: { type, from, to, limit }
      }
    });
    
  } catch (err) {
    console.error('[Query Error]', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Internal server error' 
    });
  }
});

module.exports = router;