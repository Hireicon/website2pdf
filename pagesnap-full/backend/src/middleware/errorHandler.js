const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational === true;

  // Log non-operational errors (unexpected bugs) at error level
  if (!isOperational) {
    logger.error('Unexpected error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.debug('Operational error', { message: err.message, statusCode });
  }

  res.status(statusCode).json({
    error: isOperational ? err.message : 'An unexpected error occurred',
    code: err.code || undefined,
  });
}

module.exports = { errorHandler };
