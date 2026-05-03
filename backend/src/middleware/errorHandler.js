// backend/src/middleware/errorHandler.js
module.exports = function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  console.error(`[Error] ${status} — ${message}`);
  res.status(status).json({ error: message });
};