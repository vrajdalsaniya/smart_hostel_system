import { pool } from '../config/db.js';
import { asyncHandler, httpError, required } from '../utils/http.js';
import { studentForUser } from './studentController.js';
import { notifyAdmins, createNotification } from '../services/notificationService.js';

const complaintSelect = `SELECT c.complaint_id,c.student_id,c.complaint_description,c.complaint_date,c.status,c.created_at,s.full_name,s.user_id FROM complaints c JOIN students s ON s.student_id=c.student_id`;

export const listComplaints = asyncHandler(async (req, res) => {
  const { search = '', status = '', from = '', to = '' } = req.query;
  let sql = complaintSelect + ' WHERE 1=1'; const params = [];
  if (req.user.role === 'student') { const student = await studentForUser(req.user.userId); sql += ' AND c.student_id=?'; params.push(student.student_id); }
  if (search) { sql += ' AND (s.full_name LIKE ? OR c.complaint_description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (status) { sql += ' AND c.status=?'; params.push(status); }
  if (from) { sql += ' AND c.complaint_date>=?'; params.push(from); }
  if (to) { sql += ' AND c.complaint_date<=?'; params.push(to); }
  sql += ' ORDER BY c.created_at DESC'; const [complaints] = await pool.execute(sql, params);
  res.json({ complaints });
});

export const createComplaint = asyncHandler(async (req, res) => {
  const { description, studentId } = req.body; required(description, 'Complaint description');
  let student;
  if (req.user.role === 'student') student = await studentForUser(req.user.userId);
  else {
    const [rows] = await pool.execute('SELECT student_id,full_name,user_id FROM students WHERE student_id=?', [Number(studentId)]);
    student = rows[0];
  }
  if (!student) throw httpError(404, 'Student not found.');
  const [result] = await pool.execute('INSERT INTO complaints (student_id,complaint_description,complaint_date,status) VALUES (?,?,CURDATE(),"Pending")', [student.student_id, String(description).trim()]);
  await pool.execute('INSERT INTO activities (user_id,activity_type,description) VALUES (?,?,?)', [req.user.userId, 'complaint_submitted', `${student.full_name} submitted a complaint`]);
  const [[complaint]] = await pool.execute(`${complaintSelect} WHERE c.complaint_id=?`, [result.insertId]);
  notifyAdmins({
    title: 'New Complaint Filed',
    message: `${student.full_name}: "${String(description).trim().slice(0, 60)}"`,
    type: 'complaint',
    link: '/admin/complaints'
  });
  if (student.user_id) {
    createNotification({
      userId: student.user_id,
      title: 'Complaint Registered',
      message: 'Your complaint has been submitted and is currently Pending review.',
      type: 'complaint',
      link: '/student/complaints'
    });
  }
  res.status(201).json({ message: 'Complaint submitted successfully.', complaint });
});

export const updateComplaint = asyncHandler(async (req, res) => {
  const [[existing]] = await pool.execute('SELECT * FROM complaints WHERE complaint_id=?', [req.params.id]);
  if (!existing) throw httpError(404, 'Complaint not found.');
  const own = req.user.role === 'student' && (await studentForUser(req.user.userId)).student_id === existing.student_id;
  if (req.user.role === 'student' && !own) throw httpError(403, 'You can only update your own complaint.');
  if (req.user.role === 'student') {
    required(req.body.description, 'Complaint description');
    if (existing.status !== 'Pending') throw httpError(409, 'Only pending complaints can be edited.');
    await pool.execute('UPDATE complaints SET complaint_description=? WHERE complaint_id=?', [String(req.body.description).trim(), req.params.id]);
  } else {
    const { status, description = existing.complaint_description } = req.body;
    if (!['Pending', 'In Progress', 'Resolved'].includes(status)) throw httpError(400, 'Please select a valid complaint status.');
    await pool.execute('UPDATE complaints SET status=?,complaint_description=? WHERE complaint_id=?', [status, String(description).trim(), req.params.id]);
    if (status === 'Resolved') await pool.execute('INSERT INTO activities (user_id,activity_type,description) VALUES (?,?,?)', [req.user.userId, 'complaint_resolved', 'A complaint was marked as resolved']);
  }
  const [[complaint]] = await pool.execute(`${complaintSelect} WHERE c.complaint_id=?`, [req.params.id]);
  if (req.user.role === 'admin') {
    notifyAdmins({
      title: `Complaint ${complaint.status}`,
      message: `Complaint for ${complaint.full_name} was marked as ${complaint.status}.`,
      type: 'complaint',
      link: '/admin/complaints'
    });
    if (complaint.user_id) {
      createNotification({
        userId: complaint.user_id,
        title: `Complaint Status: ${complaint.status}`,
        message: `Your complaint is now marked as "${complaint.status}".`,
        type: 'complaint',
        link: '/student/complaints'
      });
    }
  }
  res.json({ message: 'Complaint updated successfully.', complaint });
});

export const deleteComplaint = asyncHandler(async (req, res) => {
  const [[existing]] = await pool.execute('SELECT student_id FROM complaints WHERE complaint_id=?', [req.params.id]);
  if (!existing) throw httpError(404, 'Complaint not found.');
  if (req.user.role === 'student' && (await studentForUser(req.user.userId)).student_id !== existing.student_id) throw httpError(403, 'You can only delete your own complaint.');
  await pool.execute('DELETE FROM complaints WHERE complaint_id=?', [req.params.id]);
  res.json({ message: 'Complaint deleted.' });
});
