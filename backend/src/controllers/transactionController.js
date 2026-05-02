// backend/src/controllers/transactionController.js
const { validationResult } = require('express-validator');
const svc = require('../services/transactionService');

exports.getByAccount = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { accountId } = req.params;
    const { limit = 50, from, to } = req.query;
    const rows = await svc.getByAccount({ accountId, limit: parseInt(limit), from, to });
    res.json({ accountId, count: rows.length, data: rows });
  } catch (err) { next(err); }
};

exports.getByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { limit = 50, from, to } = req.query;
    const rows = await svc.getByType({ type, limit: parseInt(limit), from, to });
    res.json({ type, count: rows.length, data: rows });
  } catch (err) { next(err); }
};

exports.createOne = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const result = await svc.insertOne(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
};