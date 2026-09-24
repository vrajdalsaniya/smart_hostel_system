import { pool } from '../config/db.js';
import { asyncHandler, httpError, required } from '../utils/http.js';
import { studentForUser } from './studentController.js';
import { notifyAdmins, createNotification } from '../services/notificationService.js';

const feedbackSelect = `SELECT f.feedback_id,f.student_id,f.feedback_message,f.feedback_date,f.created_at,s.full_name FROM feedback f JOIN students s ON s.student_id=f.student_id`;

export const listFeedback = asyncHandler(async (req, res) => {
  const { search = '', from = '', to = '' } = req.query;
  let sql = feedbackSelect + ' WHERE 1=1'; const params = [];
  if (req.user.role === 'student') { const student = await studentForUser(req.user.userId); sql += ' AND f.student_id=?'; params.push(student.student_id); }
  if (search) { sql += ' AND (s.full_name LIKE ? OR f.feedback_message LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (from) { sql += ' AND f.feedback_date>=?'; params.push(from); }
  if (to) { sql += ' AND f.feedback_date<=?'; params.push(to); }
  sql += ' ORDER BY f.created_at DESC'; const [feedback] = await pool.execute(sql, params);
  res.json({ feedback });
});

export const createFeedback = asyncHandler(async (req, res) => {
  const { message } = req.body; required(message, 'Feedback message');
  const student = await studentForUser(req.user.userId);
  const [result] = await pool.execute('INSERT INTO feedback (student_id,feedback_message,feedback_date) VALUES (?,?,CURDATE())', [student.student_id, String(message).trim()]);
  await pool.execute('INSERT INTO activities (user_id,activity_type,description) VALUES (?,?,?)', [req.user.userId, 'feedback_submitted', `${student.full_name} shared feedback`]);
  const [[feedback]] = await pool.execute(`${feedbackSelect} WHERE f.feedback_id=?`, [result.insertId]);
  notifyAdmins({
    title: 'New Feedback Received',
    message: `${student.full_name}: "${String(message).trim().slice(0, 60)}"`,
    type: 'feedback',
    link: '/admin/feedback'
  });
  createNotification({
    userId: req.user.userId,
    title: 'Feedback Received',
    message: 'Thank you for your valuable feedback to the hostel team!',
    type: 'feedback',
    link: '/student/feedback'
  });
  res.status(201).json({ message: 'Thank you for your feedback!', feedback });
});

export const deleteFeedback = asyncHandler(async (req, res) => {
  const [[existing]] = await pool.execute('SELECT student_id FROM feedback WHERE feedback_id=?', [req.params.id]);
  if (!existing) throw httpError(404, 'Feedback not found.');
  if (req.user.role === 'student' && (await studentForUser(req.user.userId)).student_id !== existing.student_id) throw httpError(403, 'You can only delete your own feedback.');
  await pool.execute('DELETE FROM feedback WHERE feedback_id=?', [req.params.id]);
  res.json({ message: 'Feedback removed.' });
});
