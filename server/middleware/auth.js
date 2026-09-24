import jwt from 'jsonwebtoken';
import { httpError } from '../utils/http.js';

export function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(httpError(401, 'Authentication required.'));
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'development-only-change-me');
    next();
  } catch { next(httpError(401, 'Your session has expired. Please sign in again.')); }
}

export const allowRoles = (...roles) => (req, _res, next) => roles.includes(req.user?.role)
  ? next()
  : next(httpError(403, 'You do not have permission to access this resource.'));

export const authorize = allowRoles;
