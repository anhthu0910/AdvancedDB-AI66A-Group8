// backend/src/controllers/ingestionController.js
const svc = require('../services/ingestionService');

exports.writeBatch = async (req, res, next) => {
  try {
    const { batchSize = 50 } = req.body;
    const result = await svc.writeBatch(parseInt(batchSize));
    res.json(result);
  } catch (err) { next(err); }
};