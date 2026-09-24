import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool, withTransaction } from '../config/db.js';
import { asyncHandler, httpError, isValidEmail, required, publicUserFields } from '../utils/http.js';
import { sendPasswordResetEmail } from '../services/mailer.js';
import { notifyAdmins, createNotification } from '../services/notificationService.js';

const tokenFor = (user) => jwt.sign({ userId: user.user_id, role: user.role }, process.env.JWT_SECRET || 'development-only-change-me', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const userById = async (db, userId) => {
  const [rows] = await db.execute(`SELECT ${publicUserFields} FROM users u JOIN profiles p ON p.user_id = u.user_id WHERE u.user_id = ?`, [userId]);
  return rows[0];
};

export const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, confirmPassword, mobile = '', address = '', guardianName = '', guardianContact = '' } = req.body;
  required(fullName, 'Full name'); required(email, 'Email'); required(password, 'Password');
  if (!isValidEmail(email)) throw httpError(400, 'Please enter a valid email address.');
  if (String(password).length < 8) throw httpError(400, 'Password must be at least 8 characters.');
  if (password !== confirmPassword) throw httpError(400, 'Passwords do not match.');
  const result = await withTransaction(async (db) => {
    const [existing] = await db.execute('SELECT user_id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length) throw httpError(409, 'An account with this email already exists.');
    const [user] = await db.execute('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', [email.trim().toLowerCase(), await bcrypt.hash(password, 12), 'student']);
    await db.execute('INSERT INTO profiles (user_id, full_name, email, mobile, address) VALUES (?, ?, ?, ?, ?)', [user.insertId, fullName.trim(), email.trim().toLowerCase(), mobile, address]);
    await db.execute('INSERT INTO students (user_id, full_name, mobile_number, address, guardian_name, guardian_contact) VALUES (?, ?, ?, ?, ?, ?)', [user.insertId, fullName.trim(), mobile, address, guardianName, guardianContact]);
    await db.execute('INSERT INTO activities (user_id, activity_type, description) VALUES (?, ?, ?)', [user.insertId, 'student_registered', `${fullName.trim()} registered as a student`]);
    return userById(db, user.insertId);
  });

  // Check if hostel is currently full and auto-enroll in waiting list
  const [[bedCheck]] = await pool.execute('SELECT COALESCE(SUM(available_beds),0) AS available FROM rooms');
  let waitlistPosition = null;
  if (Number(bedCheck.available) <= 0) {
    const [[studRow]] = await pool.execute('SELECT student_id FROM students WHERE user_id = ?', [result.user_id]);
    if (studRow) {
      await pool.execute(
        'INSERT INTO waiting_list (student_id, notes, status) VALUES (?, "Auto-waitlisted on registration (Hostel Full)", "Waiting")',
        [studRow.student_id]
      );
      const [[pos]] = await pool.execute("SELECT COUNT(*) AS pos FROM waiting_list WHERE status = 'Waiting'");
      waitlistPosition = pos.pos;
    }
  }

  notifyAdmins({
    title: waitlistPosition ? 'New Waitlisted Student' : 'New Student Registered',
    message: waitlistPosition
      ? `${fullName.trim()} registered. Hostel is full — student placed in Waiting Area (Queue #${waitlistPosition}).`
      : `${fullName.trim()} registered as a resident student.`,
    type: 'student',
    link: waitlistPosition ? '/admin/allocations?tab=waiting' : '/admin/students'
  });

  createNotification({
    userId: result.user_id,
    title: waitlistPosition ? 'Hostel Full · In Waiting Area' : 'Welcome to Smart Hostel!',
    message: waitlistPosition
      ? `Welcome, ${fullName.trim()}! The hostel is currently full, so you are #${waitlistPosition} in the waiting queue. We will notify you when a bed opens up.`
      : `Welcome, ${fullName.trim()}! Your account is active. Explore your resident portal.`,
    type: 'student',
    link: waitlistPosition ? '/student/room' : '/student/dashboard'
  });
  res.status(201).json({
    message: waitlistPosition
      ? `Registration complete. Hostel is full — you are #${waitlistPosition} in the waiting queue.`
      : 'Registration complete. Welcome to Smart Hostel!',
    token: tokenFor(result),
    user: result,
    waitlistPosition
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;
  required(email, 'Email'); required(password, 'Password'); required(role, 'Role');
  const [rows] = await pool.execute('SELECT user_id, email, password, role FROM users WHERE email = ?', [String(email).trim().toLowerCase()]);
  const account = rows[0];
  if (!account || account.role !== role || !(await bcrypt.compare(password, account.password))) throw httpError(401, 'Invalid email, password, or role.');
  const user = await userById(pool, account.user_id);
  res.json({ message: `Welcome back, ${user.full_name.split(' ')[0]}!`, token: tokenFor(account), user });
});

const RESET_WINDOW_MINUTES = 30;
const resetMessage = 'If an account matches those details, a password-reset link has been created.';

export const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  required(email, 'Email'); required(role, 'Role');
  if (!['student', 'admin'].includes(role)) throw httpError(400, 'Please choose a valid account type.');
  if (!isValidEmail(email)) throw httpError(400, 'Please enter a valid email address.');

  const [rows] = await pool.execute('SELECT user_id FROM users WHERE email=? AND role=?', [String(email).trim().toLowerCase(), role]);
  if (!rows[0]) return res.json({ message: resetMessage });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await pool.execute('DELETE FROM password_reset_tokens WHERE user_id=? OR expires_at < NOW()', [rows[0].user_id]);
  await pool.execute('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))', [rows[0].user_id, tokenHash, RESET_WINDOW_MINUTES]);

  const origin = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  const resetUrl = `${origin}/reset-password?token=${rawToken}&role=${role}`;
  const delivery = await sendPasswordResetEmail({ email: String(email).trim().toLowerCase(), role, resetUrl });
  const response = { message: resetMessage, emailSent: Boolean(delivery.sent) };
  if (delivery.previewUrl) response.previewUrl = delivery.previewUrl;
  // Demo accounts such as student@smarthostel.com have no real inbox, so local
  // development also returns the link for the recovery page.
  if (process.env.NODE_ENV !== 'production') response.resetUrl = resetUrl;
  res.json(response);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password, confirmPassword, role } = req.body;
  required(token, 'Reset token'); required(password, 'New password'); required(confirmPassword, 'Password confirmation'); required(role, 'Role');
  if (!['student', 'admin'].includes(role)) throw httpError(400, 'Please choose a valid account type.');
  if (String(password).length < 8) throw httpError(400, 'Password must be at least 8 characters.');
  if (password !== confirmPassword) throw httpError(400, 'Passwords do not match.');
  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const [rows] = await pool.execute(`SELECT prt.reset_id, prt.user_id FROM password_reset_tokens prt JOIN users u ON u.user_id=prt.user_id WHERE prt.token_hash=? AND prt.expires_at > NOW() AND prt.used_at IS NULL AND u.role=?`, [tokenHash, role]);
  if (!rows[0]) throw httpError(400, 'This password-reset link is invalid or has expired. Please request a new one.');
  await withTransaction(async (db) => {
    await db.execute('UPDATE users SET password=? WHERE user_id=?', [await bcrypt.hash(password, 12), rows[0].user_id]);
    await db.execute('UPDATE password_reset_tokens SET used_at=NOW() WHERE reset_id=?', [rows[0].reset_id]);
    await db.execute('DELETE FROM password_reset_tokens WHERE user_id=? AND reset_id<>?', [rows[0].user_id, rows[0].reset_id]);
  });
  res.json({ message: 'Your password has been reset. You can now sign in.' });
});

export const me = asyncHandler(async (req, res) => {
  const user = await userById(pool, req.user.userId);
  if (!user) throw httpError(401, 'Account not found.');
  res.json({ user });
});

export const logout = asyncHandler(async (_req, res) => res.status(204).end());
