import bcrypt from 'bcryptjs';
import { pool, withTransaction } from '../config/db.js';
import { asyncHandler, httpError, isValidEmail, required, publicUserFields } from '../utils/http.js';
import { notifyAdmins, createNotification } from '../services/notificationService.js';

const baseSelect = `SELECT s.student_id, s.full_name, s.mobile_number, s.address, s.guardian_name, s.guardian_contact, s.created_at, u.user_id, u.email, u.role, p.profile_photo, r.room_number, r.block, a.allocation_id FROM students s JOIN users u ON u.user_id = s.user_id JOIN profiles p ON p.user_id = s.user_id LEFT JOIN room_allocations a ON a.student_id = s.student_id AND a.status = 'Active' LEFT JOIN rooms r ON r.room_id = a.room_id`;

export const listStudents = asyncHandler(async (req, res) => {
  const { search = '', block = '', unallocated = '' } = req.query;
  let sql = baseSelect + ' WHERE 1=1'; const params = [];
  if (search) { sql += ' AND (s.full_name LIKE ? OR u.email LIKE ? OR s.mobile_number LIKE ?)'; const like = `%${search}%`; params.push(like, like, like); }
  if (block) { sql += ' AND r.block = ?'; params.push(block); }
  if (unallocated === 'true') sql += ' AND r.room_id IS NULL';
  sql += ' ORDER BY s.created_at DESC';
  const [students] = await pool.execute(sql, params);
  res.json({ students, total: students.length });
});

export const getStudent = asyncHandler(async (req, res) => {
  const studentId = Number(req.params.id);
  const [students] = await pool.execute(`${baseSelect} WHERE s.student_id=?`, [studentId]);
  if (!students[0]) throw httpError(404, 'Student not found.');
  const [[fees], [complaints]] = await Promise.all([
    pool.execute('SELECT fee_id, fee_amount, payment_date, payment_method, payment_status, description FROM fees WHERE student_id=? ORDER BY created_at DESC', [studentId]),
    pool.execute('SELECT complaint_id, complaint_description, complaint_date, status FROM complaints WHERE student_id=? ORDER BY created_at DESC', [studentId])
  ]);
  res.json({ student: students[0], fees, complaints });
});

export const createStudent = asyncHandler(async (req, res) => {
  const { fullName, email, password, mobile = '', address = '', guardianName = '', guardianContact = '' } = req.body;
  required(fullName, 'Full name'); required(email, 'Email'); required(password, 'Initial password');
  if (!isValidEmail(email)) throw httpError(400, 'Please enter a valid email address.');
  if (String(password).length < 8) throw httpError(400, 'Initial password must be at least 8 characters.');
  const student = await withTransaction(async (db) => {
    const normalizedEmail = email.trim().toLowerCase();
    const [user] = await db.execute('INSERT INTO users (email,password,role) VALUES (?, ?, "student")', [normalizedEmail, await bcrypt.hash(password, 12)]);
    await db.execute('INSERT INTO profiles (user_id,full_name,email,mobile,address) VALUES (?,?,?,?,?)', [user.insertId, fullName.trim(), normalizedEmail, mobile, address]);
    const [created] = await db.execute('INSERT INTO students (user_id,full_name,mobile_number,address,guardian_name,guardian_contact) VALUES (?,?,?,?,?,?)', [user.insertId, fullName.trim(), mobile, address, guardianName, guardianContact]);
    await db.execute('INSERT INTO activities (user_id,activity_type,description) VALUES (?,?,?)', [user.insertId, 'student_added', `${fullName.trim()} was added by an administrator`]);
    return created.insertId;
  });
  req.params.id = student;
  const [rows] = await pool.execute(`${baseSelect} WHERE s.student_id=?`, [student]);
  notifyAdmins({
    title: 'Student Added',
    message: `${fullName.trim()} was added by an administrator.`,
    type: 'student',
    link: '/admin/students'
  });
  createNotification({
    userId: rows[0].user_id,
    title: 'Welcome to Smart Hostel!',
    message: `Hello ${fullName.trim()}, your resident student account has been created.`,
    type: 'student',
    link: '/student/dashboard'
  });
  res.status(201).json({ message: 'Student created successfully.', student: rows[0] });
});

export const updateStudent = asyncHandler(async (req, res) => {
  const studentId = Number(req.params.id);
  const { fullName, email, mobile = '', address = '', guardianName = '', guardianContact = '' } = req.body;
  required(fullName, 'Full name'); required(email, 'Email');
  if (!isValidEmail(email)) throw httpError(400, 'Please enter a valid email address.');
  await withTransaction(async (db) => {
    const [found] = await db.execute('SELECT user_id FROM students WHERE student_id=?', [studentId]);
    if (!found[0]) throw httpError(404, 'Student not found.');
    const userId = found[0].user_id, normalizedEmail = email.trim().toLowerCase();
    await db.execute('UPDATE users SET email=? WHERE user_id=?', [normalizedEmail, userId]);
    await db.execute('UPDATE profiles SET full_name=?, email=?, mobile=?, address=? WHERE user_id=?', [fullName.trim(), normalizedEmail, mobile, address, userId]);
    await db.execute('UPDATE students SET full_name=?, mobile_number=?, address=?, guardian_name=?, guardian_contact=? WHERE student_id=?', [fullName.trim(), mobile, address, guardianName, guardianContact, studentId]);
  });
  const [rows] = await pool.execute(`${baseSelect} WHERE s.student_id=?`, [studentId]);
  res.json({ message: 'Student details updated.', student: rows[0] });
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const studentId = Number(req.params.id);
  const [[student]] = await pool.execute('SELECT user_id FROM students WHERE student_id=?', [studentId]);
  if (!student) throw httpError(404, 'Student not found.');
  const [[active]] = await pool.execute("SELECT allocation_id FROM room_allocations WHERE student_id=? AND status='Active'", [studentId]);
  if (active) throw httpError(409, 'Vacate this student’s active room allocation before deleting the record.');
  await pool.execute('DELETE FROM users WHERE user_id=?', [student.user_id]);
  res.json({ message: 'Student removed successfully.' });
});

export const studentForUser = async (userId) => {
  const [rows] = await pool.execute('SELECT student_id, full_name FROM students WHERE user_id=?', [userId]);
  return rows[0];
};
