export const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function required(value, label) {
  if (value === undefined || value === null || String(value).trim() === '') throw httpError(400, `${label} is required.`);
  return value;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

export const roomStatus = (capacity, occupied) => occupied === 0 ? 'Available' : occupied >= capacity ? 'Full' : 'Partially Occupied';
export const publicUserFields = 'u.user_id, u.email, u.role, p.full_name, p.mobile, p.address, p.profile_photo';
