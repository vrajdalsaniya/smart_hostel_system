export function notFound(req, _res, next) {
  const error = new Error(`Route ${req.method} ${req.originalUrl} was not found.`);
  error.status = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  const isDuplicate = error.code === 'ER_DUP_ENTRY';
  const isForeignKey = error.code === 'ER_ROW_IS_REFERENCED_2';
  const status = error.status || (isDuplicate ? 409 : isForeignKey ? 409 : 500);
  const message = isDuplicate ? 'A record with this value already exists.'
    : isForeignKey ? 'This record is still used elsewhere and cannot be removed.'
    : error.message || 'Something went wrong. Please try again.';
  if (status >= 500) console.error(error);
  res.status(status).json({ message, ...(process.env.NODE_ENV === 'development' && status >= 500 ? { detail: error.code } : {}) });
}
