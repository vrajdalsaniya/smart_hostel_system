import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';
import { studentForUser } from './studentController.js';

const scalar = async (sql, params = []) => (await pool.execute(sql, params))[0][0];

export const adminDashboard = asyncHandler(async (_req, res) => {
  const [students, rooms, bedSummary, feeSummary, complaintSummary, activities, waiting] = await Promise.all([
    scalar('SELECT COUNT(*) AS total FROM students'),
    scalar('SELECT COUNT(*) AS total FROM rooms'),
    scalar('SELECT COALESCE(SUM(available_beds),0) AS available,COALESCE(SUM(occupied_beds),0) AS occupied FROM rooms'),
    scalar("SELECT COALESCE(SUM(CASE WHEN payment_status='Paid' THEN (fee_amount + penalty_amount) ELSE 0 END),0) AS collected,COALESCE(SUM(CASE WHEN payment_status='Pending' THEN (fee_amount + penalty_amount) ELSE 0 END),0) AS pending,COALESCE(SUM(penalty_amount),0) AS total_penalties,COALESCE(SUM(payment_status='Paid'),0) AS paid_count,COALESCE(SUM(payment_status='Pending'),0) AS pending_count FROM fees"),
    scalar("SELECT COALESCE(SUM(status='Pending'),0) AS pending,COALESCE(SUM(status='In Progress'),0) AS in_progress,COALESCE(SUM(status='Resolved'),0) AS resolved FROM complaints"),
    pool.execute('SELECT activity_id,activity_type,description,created_at FROM activities ORDER BY created_at DESC LIMIT 8').then(([rows]) => rows),
    scalar("SELECT COUNT(*) AS waiting_count FROM waiting_list WHERE status = 'Waiting'")
  ]);
  const isHostelFull = Number(bedSummary.available) <= 0;
  res.json({
    stats: {
      totalStudents: students.total,
      totalRooms: rooms.total,
      availableBeds: Number(bedSummary.available),
      occupiedBeds: Number(bedSummary.occupied),
      pendingFees: Number(feeSummary.pending),
      pendingComplaints: complaintSummary.pending,
      totalPenalties: Number(feeSummary.total_penalties),
      waitingCount: Number(waiting.waiting_count || 0),
      isHostelFull
    },
    occupancy: [{ name: 'Occupied', value: Number(bedSummary.occupied) }, { name: 'Available', value: Number(bedSummary.available) }],
    fees: [{ name: 'Paid', value: Number(feeSummary.collected) }, { name: 'Pending', value: Number(feeSummary.pending) }],
    complaints: [{ name: 'Pending', value: Number(complaintSummary.pending) }, { name: 'In Progress', value: Number(complaintSummary.in_progress) }, { name: 'Resolved', value: Number(complaintSummary.resolved) }],
    activities
  });
});

export const studentDashboard = asyncHandler(async (req, res) => {
  const student = await studentForUser(req.user.userId);
  const [allocation, feeSummary, complaintSummary, recent, bedSummary] = await Promise.all([
    pool.execute(`SELECT r.room_id,r.room_number,r.block,r.capacity,r.occupied_beds,r.available_beds,r.room_status FROM room_allocations a JOIN rooms r ON r.room_id=a.room_id WHERE a.student_id=? AND a.status='Active'`, [student.student_id]).then(([rows]) => rows[0] || null),
    scalar("SELECT COALESCE(SUM(fee_amount + penalty_amount),0) AS total,COALESCE(SUM(CASE WHEN payment_status='Paid' THEN (fee_amount + penalty_amount) ELSE 0 END),0) AS paid,COALESCE(SUM(CASE WHEN payment_status='Pending' THEN (fee_amount + penalty_amount) ELSE 0 END),0) AS pending,COALESCE(SUM(penalty_amount),0) AS total_penalties FROM fees WHERE student_id=?", [student.student_id]),
    scalar("SELECT COALESCE(SUM(status='Pending'),0) AS pending,COALESCE(SUM(status='In Progress'),0) AS in_progress,COALESCE(SUM(status='Resolved'),0) AS resolved FROM complaints WHERE student_id=?", [student.student_id]),
    pool.execute(`SELECT description,created_at FROM activities WHERE user_id=? ORDER BY created_at DESC LIMIT 6`, [req.user.userId]).then(([rows]) => rows),
    scalar('SELECT COALESCE(SUM(available_beds),0) AS available FROM rooms')
  ]);

  let waitlistInfo = null;
  if (!allocation) {
    const [waitRows] = await pool.execute(
      `SELECT w.waitlist_id, w.preferred_block, w.status, w.created_at, w.notes
       FROM waiting_list w
       WHERE w.student_id = ? AND w.status IN ('Waiting', 'Offered')
       ORDER BY w.created_at DESC LIMIT 1`,
      [student.student_id]
    );
    if (waitRows.length) {
      const [[posResult]] = await pool.execute(
        "SELECT COUNT(*) + 1 AS position FROM waiting_list WHERE status = 'Waiting' AND created_at < ?",
        [waitRows[0].created_at]
      );
      waitlistInfo = {
        ...waitRows[0],
        queue_position: Number(posResult.position || 1)
      };
    }
  }

  res.json({
    student,
    allocation,
    waitlist: waitlistInfo,
    isHostelFull: Number(bedSummary.available) <= 0,
    fees: Object.fromEntries(Object.entries(feeSummary).map(([k,v]) => [k,Number(v)])),
    complaints: complaintSummary,
    activities: recent
  });
});

