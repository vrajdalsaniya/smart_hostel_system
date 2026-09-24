import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { asyncHandler, httpError, isValidEmail, required, publicUserFields } from '../utils/http.js';

async function profile(userId) {
  const [rows] = await pool.execute(`SELECT ${publicUserFields} FROM users u JOIN profiles p ON p.user_id=u.user_id WHERE u.user_id=?`, [userId]);
  return rows[0];
}

export const getProfile = asyncHandler(async (req, res) => res.json({ profile: await profile(req.user.userId) }));
export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, email, mobile = '', address = '' } = req.body;
  required(fullName, 'Full name'); required(email, 'Email');
  if (!isValidEmail(email)) throw httpError(400, 'Please enter a valid email address.');
  const normalized = email.trim().toLowerCase();
  await pool.execute('UPDATE users SET email=? WHERE user_id=?', [normalized, req.user.userId]);
  await pool.execute('UPDATE profiles SET full_name=?,email=?,mobile=?,address=? WHERE user_id=?', [fullName.trim(), normalized, mobile, address, req.user.userId]);
  const table = req.user.role === 'student' ? 'students' : 'admins';
  const id = req.user.role === 'student' ? 'user_id' : 'user_id';
  await pool.execute(`UPDATE ${table} SET full_name=?,mobile_number=? WHERE ${id}=?`, [fullName.trim(), mobile, req.user.userId]);
  res.json({ message: 'Profile updated successfully.', profile: await profile(req.user.userId) });
});
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  required(currentPassword, 'Current password'); required(newPassword, 'New password'); required(confirmPassword, 'Password confirmation');
  if (String(newPassword).length < 8) throw httpError(400, 'New password must be at least 8 characters.');
  if (newPassword !== confirmPassword) throw httpError(400, 'New passwords do not match.');
  const [[account]] = await pool.execute('SELECT password FROM users WHERE user_id=?', [req.user.userId]);
  if (!(await bcrypt.compare(currentPassword, account.password))) throw httpError(400, 'Your current password is incorrect.');
  await pool.execute('UPDATE users SET password=? WHERE user_id=?', [await bcrypt.hash(newPassword, 12), req.user.userId]);
  res.json({ message: 'Password changed successfully.' });
});
export const updatePhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw httpError(400, 'Please select a profile image.');
  const profilePhoto = `/uploads/${req.file.filename}`;
  await pool.execute('UPDATE profiles SET profile_photo=? WHERE user_id=?', [profilePhoto, req.user.userId]);
  res.json({ message: 'Profile photo updated.', profile: await profile(req.user.userId) });
});
