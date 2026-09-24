import { pool } from '../config/db.js';
import { asyncHandler, httpError, required } from '../utils/http.js';
import { studentForUser } from './studentController.js';
import { notifyAdmins, createNotification } from '../services/notificationService.js';

const feeSelect = `SELECT f.fee_id,f.student_id,f.fee_amount,f.penalty_amount,f.penalty_reason,f.due_date,f.payment_date,f.payment_method,f.payment_status,f.description,f.created_at,(f.fee_amount + f.penalty_amount) AS total_amount,s.full_name,s.user_id FROM fees f JOIN students s ON s.student_id=f.student_id`;

export const listFees = asyncHandler(async (req, res) => {
  const { search = '', status = '', method = '', from = '', to = '', overdue = '', has_penalty = '' } = req.query;
  const values = []; let sql = feeSelect + ' WHERE 1=1';
  if (req.user.role === 'student') { const student = await studentForUser(req.user.userId); sql += ' AND f.student_id=?'; values.push(student.student_id); }
  if (search) { sql += ' AND s.full_name LIKE ?'; values.push(`%${search}%`); }
  if (status) { sql += ' AND f.payment_status=?'; values.push(status); }
  if (method) { sql += ' AND f.payment_method=?'; values.push(method); }
  if (from) { sql += ' AND f.payment_date>=?'; values.push(from); }
  if (to) { sql += ' AND f.payment_date<=?'; values.push(to); }
  if (has_penalty === 'true') { sql += ' AND f.penalty_amount > 0'; }
  if (overdue === 'true') { sql += " AND f.payment_status='Pending' AND f.due_date IS NOT NULL AND f.due_date < CURDATE()"; }
  sql += ' ORDER BY f.created_at DESC';
  const [fees] = await pool.execute(sql, values);
  res.json({ fees });
});

function normaliseFee(payload) {
  const {
    studentId,
    feeAmount,
    penaltyAmount = 0,
    penaltyReason = '',
    dueDate = null,
    paymentDate = null,
    paymentMethod = null,
    paymentStatus = 'Pending',
    description = ''
  } = payload;
  required(studentId, 'Student'); required(feeAmount, 'Fee amount');
  const amount = Number(feeAmount);
  if (!Number.isFinite(amount) || amount <= 0) throw httpError(400, 'Fee amount must be greater than zero.');
  const penalty = Number(penaltyAmount || 0);
  if (!Number.isFinite(penalty) || penalty < 0) throw httpError(400, 'Penalty amount cannot be negative.');
  if (!['Paid', 'Pending'].includes(paymentStatus)) throw httpError(400, 'Invalid fee status.');
  if (paymentStatus === 'Paid' && (!paymentDate || !paymentMethod)) throw httpError(400, 'Payment date and payment method are required for paid fees.');
  if (paymentMethod && !['Cash', 'Online'].includes(paymentMethod)) throw httpError(400, 'Invalid payment method.');
  return {
    studentId: Number(studentId),
    amount,
    penaltyAmount: penalty,
    penaltyReason: penalty > 0 ? String(penaltyReason || '').trim() : (penaltyReason ? String(penaltyReason).trim() : null),
    dueDate: dueDate || null,
    paymentDate: paymentStatus === 'Paid' ? paymentDate : null,
    paymentMethod: paymentStatus === 'Paid' ? paymentMethod : null,
    paymentStatus,
    description: String(description || '').trim()
  };
}

export const createFee = asyncHandler(async (req, res) => {
  const fee = normaliseFee(req.body);
  const [[student]] = await pool.execute('SELECT student_id,user_id,full_name FROM students WHERE student_id=?', [fee.studentId]);
  if (!student) throw httpError(404, 'Student not found.');
  const totalAmount = fee.amount + fee.penaltyAmount;
  const [result] = await pool.execute(
    'INSERT INTO fees (student_id,fee_amount,penalty_amount,penalty_reason,due_date,payment_date,payment_method,payment_status,description) VALUES (?,?,?,?,?,?,?,?,?)',
    [fee.studentId, fee.amount, fee.penaltyAmount, fee.penaltyReason, fee.dueDate, fee.paymentDate, fee.paymentMethod, fee.paymentStatus, fee.description]
  );
  const penaltyText = fee.penaltyAmount > 0 ? ` (+₹${fee.penaltyAmount.toLocaleString('en-IN')} penalty: ${fee.penaltyReason || 'Fine'})` : '';
  await pool.execute('INSERT INTO activities (user_id,activity_type,description) VALUES (?,?,?)', [student.user_id, 'fee_recorded', `${fee.paymentStatus} fee of ₹${fee.amount.toLocaleString('en-IN')}${penaltyText} recorded for ${student.full_name}`]);
  const [[created]] = await pool.execute(`${feeSelect} WHERE f.fee_id=?`, [result.insertId]);
  notifyAdmins({
    title: fee.penaltyAmount > 0 ? 'Fee & Penalty Recorded' : 'Fee Recorded',
    message: `${fee.paymentStatus} fee of ₹${fee.amount.toLocaleString('en-IN')}${penaltyText} recorded for ${student.full_name}. Total: ₹${totalAmount.toLocaleString('en-IN')}.`,
    type: 'fee',
    link: '/admin/fees'
  });
  createNotification({
    userId: student.user_id,
    title: fee.penaltyAmount > 0 ? 'Fee & Penalty Notice' : 'Fee Update',
    message: `${fee.paymentStatus} fee of ₹${fee.amount.toLocaleString('en-IN')}${penaltyText} recorded for your hostel account. Total payable: ₹${totalAmount.toLocaleString('en-IN')}.`,
    type: 'fee',
    link: '/student/fees'
  });
  res.status(201).json({ message: 'Fee record saved successfully.', fee: created });
});

export const updateFee = asyncHandler(async (req, res) => {
  const fee = normaliseFee(req.body);
  const [[existing]] = await pool.execute('SELECT fee_id FROM fees WHERE fee_id=?', [req.params.id]);
  if (!existing) throw httpError(404, 'Fee record not found.');
  await pool.execute(
    'UPDATE fees SET student_id=?,fee_amount=?,penalty_amount=?,penalty_reason=?,due_date=?,payment_date=?,payment_method=?,payment_status=?,description=? WHERE fee_id=?',
    [fee.studentId, fee.amount, fee.penaltyAmount, fee.penaltyReason, fee.dueDate, fee.paymentDate, fee.paymentMethod, fee.paymentStatus, fee.description, req.params.id]
  );
  const [[updated]] = await pool.execute(`${feeSelect} WHERE f.fee_id=?`, [req.params.id]);
  const penaltyNotice = Number(updated.penalty_amount) > 0 ? ` (incl. ₹${Number(updated.penalty_amount).toLocaleString('en-IN')} penalty)` : '';
  notifyAdmins({
    title: 'Fee Updated',
    message: `Fee record for ${updated.full_name} updated to ${updated.payment_status} (Total: ₹${Number(updated.total_amount).toLocaleString('en-IN')}${penaltyNotice}).`,
    type: 'fee',
    link: '/admin/fees'
  });
  if (updated.user_id) {
    createNotification({
      userId: updated.user_id,
      title: 'Fee Payment Updated',
      message: `Your fee record (Total: ₹${Number(updated.total_amount).toLocaleString('en-IN')}${penaltyNotice}) is now marked as ${updated.payment_status}.`,
      type: 'fee',
      link: '/student/fees'
    });
  }
  res.json({ message: 'Fee record updated.', fee: updated });
});

export const deleteFee = asyncHandler(async (req, res) => {
  const [result] = await pool.execute('DELETE FROM fees WHERE fee_id=?', [req.params.id]);
  if (!result.affectedRows) throw httpError(404, 'Fee record not found.');
  res.json({ message: 'Fee record deleted.' });
});
