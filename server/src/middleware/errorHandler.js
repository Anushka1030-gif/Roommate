import config from '../config/index.js';

export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';

  if (config.nodeEnv !== 'test' && statusCode >= 500) {
    console.error(`[Error] ${errorCode}: ${message}`, err);
  }

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message,
    },
  });
}

export default errorHandler;
