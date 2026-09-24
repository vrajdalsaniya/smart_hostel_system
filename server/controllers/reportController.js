import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';

const range = (column, query) => {
  const clauses = [], params = [];
  if (query.from) { clauses.push(`${column} >= ?`); params.push(query.from); }
  if (query.to) { clauses.push(`${column} <= ?`); params.push(query.to); }
  return { clause: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '', params };
};

export const studentReport = asyncHandler(async (_req, res) => {
  const [rows] = await pool.execute(`SELECT s.student_id,s.full_name,u.email,s.mobile_number,r.room_number,r.block FROM students s JOIN users u ON u.user_id=s.user_id LEFT JOIN room_allocations a ON a.student_id=s.student_id AND a.status='Active' LEFT JOIN rooms r ON r.room_id=a.room_id ORDER BY s.full_name`);
  res.json({ title: 'Student Report', columns: ['Student ID','Name','Email','Mobile','Room'], rows: rows.map(r => [r.student_id,r.full_name,r.email,r.mobile_number || '—',r.room_number ? `${r.block}-${r.room_number}` : 'Unallocated']) });
});
export const feeReport = asyncHandler(async (req, res) => {
  const r = range('f.payment_date', req.query);
  const [rows] = await pool.execute(`SELECT f.fee_id,s.full_name,f.fee_amount,f.penalty_amount,f.due_date,f.payment_date,f.payment_method,f.payment_status FROM fees f JOIN students s ON s.student_id=f.student_id${r.clause} ORDER BY f.created_at DESC`, r.params);
  res.json({
    title: 'Fee Report',
    columns: ['ID','Student','Base Fee','Penalty','Total','Due Date','Payment Date','Method','Status'],
    rows: rows.map(x => [
      x.fee_id,
      x.full_name,
      `₹${Number(x.fee_amount).toLocaleString('en-IN')}`,
      Number(x.penalty_amount) > 0 ? `₹${Number(x.penalty_amount).toLocaleString('en-IN')}` : '—',
      `₹${(Number(x.fee_amount) + Number(x.penalty_amount)).toLocaleString('en-IN')}`,
      x.due_date || '—',
      x.payment_date || '—',
      x.payment_method || '—',
      x.payment_status
    ])
  });
});
export const complaintReport = asyncHandler(async (req, res) => {
  const r = range('c.complaint_date', req.query);
  const [rows] = await pool.execute(`SELECT c.complaint_id,s.full_name,c.complaint_description,c.complaint_date,c.status FROM complaints c JOIN students s ON s.student_id=c.student_id${r.clause} ORDER BY c.complaint_date DESC`, r.params);
  res.json({ title: 'Complaint Report', columns: ['ID','Student','Description','Date','Status'], rows: rows.map(x => [x.complaint_id,x.full_name,x.complaint_description,x.complaint_date,x.status]) });
});
export const roomReport = asyncHandler(async (_req, res) => {
  const [rows] = await pool.execute('SELECT room_id,block,room_number,capacity,occupied_beds,available_beds,room_status FROM rooms ORDER BY block,room_number');
  res.json({ title: 'Room Occupancy Report', columns: ['Room','Capacity','Occupied','Available','Status'], rows: rows.map(x => [`${x.block}-${x.room_number}`,x.capacity,x.occupied_beds,x.available_beds,x.room_status]) });
});
export const allocationReport = asyncHandler(async (_req, res) => {
  const [rows] = await pool.execute(`SELECT a.allocation_id,s.full_name,r.block,r.room_number,a.allocation_date,a.status FROM room_allocations a JOIN students s ON s.student_id=a.student_id JOIN rooms r ON r.room_id=a.room_id ORDER BY a.created_at DESC`);
  res.json({ title: 'Room Allocation Report', columns: ['ID','Student','Room','Allocated','Status'], rows: rows.map(x => [x.allocation_id,x.full_name,`${x.block}-${x.room_number}`,x.allocation_date,x.status]) });
});
export const wifiReport = asyncHandler(async (req, res) => {
  const r = range('ws.start_date', req.query);
  const [rows] = await pool.execute(`SELECT ws.subscription_id, s.full_name, p.name AS plan_name, ws.amount_paid, ws.start_date, ws.end_date, ws.voucher_code, ws.payment_method, ws.status 
    FROM wifi_subscriptions ws 
    JOIN students s ON s.student_id = ws.student_id 
    JOIN wifi_plans p ON p.plan_id = ws.plan_id${r.clause} 
    ORDER BY ws.created_at DESC`, r.params);
  res.json({
    title: 'Wi-Fi Subscription Report',
    columns: ['ID', 'Student', 'Plan', 'Amount', 'Start Date', 'End Date', 'Voucher', 'Method', 'Status'],
    rows: rows.map(x => [x.subscription_id, x.full_name, x.plan_name, `₹${Number(x.amount_paid).toLocaleString('en-IN')}`, x.start_date || '—', x.end_date || '—', x.voucher_code, x.payment_method, x.status])
  });
});

