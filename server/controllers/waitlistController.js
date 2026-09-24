import { pool, withTransaction } from '../config/db.js';
import { asyncHandler, httpError, required, roomStatus } from '../utils/http.js';
import { studentForUser } from './studentController.js';
import { notifyAdmins, createNotification } from '../services/notificationService.js';

export const listWaitlist = asyncHandler(async (req, res) => {
  const { status = 'Waiting', search = '' } = req.query;

  const [[bedSummary]] = await pool.execute(
    'SELECT COALESCE(SUM(capacity),0) AS total_capacity, COALESCE(SUM(occupied_beds),0) AS total_occupied, COALESCE(SUM(available_beds),0) AS total_available FROM rooms'
  );

  let sql = `
    SELECT 
      w.waitlist_id,
      w.student_id,
      w.preferred_block,
      w.status,
      w.notes,
      w.created_at,
      w.updated_at,
      s.full_name,
      s.mobile_number,
      s.user_id,
      u.email,
      p.profile_photo
    FROM waiting_list w
    JOIN students s ON s.student_id = w.student_id
    JOIN users u ON u.user_id = s.user_id
    JOIN profiles p ON p.user_id = s.user_id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'All') {
    sql += ' AND w.status = ?';
    params.push(status);
  }

  if (search) {
    sql += ' AND (s.full_name LIKE ? OR u.email LIKE ? OR s.mobile_number LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  sql += ' ORDER BY w.created_at ASC';

  const [rows] = await pool.execute(sql, params);

  let queueCounter = 1;
  const waitlist = rows.map(r => ({
    ...r,
    queue_position: r.status === 'Waiting' ? queueCounter++ : null
  }));

  const [[waitingSummary]] = await pool.execute(
    "SELECT COUNT(*) AS waiting_count FROM waiting_list WHERE status = 'Waiting'"
  );

  res.json({
    waitlist,
    summary: {
      waitingCount: Number(waitingSummary.waiting_count || 0),
      totalCapacity: Number(bedSummary.total_capacity || 0),
      totalOccupied: Number(bedSummary.total_occupied || 0),
      totalAvailable: Number(bedSummary.total_available || 0),
      isHostelFull: Number(bedSummary.total_available || 0) <= 0
    }
  });
});

export const getMyWaitlistStatus = asyncHandler(async (req, res) => {
  const student = await studentForUser(req.user.userId);

  const [rows] = await pool.execute(
    `SELECT w.waitlist_id, w.student_id, w.preferred_block, w.status, w.notes, w.created_at,
            s.full_name
     FROM waiting_list w
     JOIN students s ON s.student_id = w.student_id
     WHERE w.student_id = ? AND w.status IN ('Waiting', 'Offered')
     ORDER BY w.created_at DESC LIMIT 1`,
    [student.student_id]
  );

  const [[bedSummary]] = await pool.execute(
    'SELECT COALESCE(SUM(capacity),0) AS total_capacity, COALESCE(SUM(occupied_beds),0) AS total_occupied, COALESCE(SUM(available_beds),0) AS total_available FROM rooms'
  );

  if (!rows.length) {
    return res.json({
      waitlist: null,
      isHostelFull: Number(bedSummary.total_available || 0) <= 0,
      totalAvailable: Number(bedSummary.total_available || 0),
      totalCapacity: Number(bedSummary.total_capacity || 0),
      totalOccupied: Number(bedSummary.total_occupied || 0)
    });
  }

  const record = rows[0];

  const [[posResult]] = await pool.execute(
    "SELECT COUNT(*) + 1 AS position FROM waiting_list WHERE status = 'Waiting' AND created_at < ?",
    [record.created_at]
  );

  const [[totalWaiting]] = await pool.execute(
    "SELECT COUNT(*) AS total FROM waiting_list WHERE status = 'Waiting'"
  );

  res.json({
    waitlist: {
      ...record,
      queue_position: Number(posResult.position || 1),
      total_waiting: Number(totalWaiting.total || 1)
    },
    isHostelFull: Number(bedSummary.total_available || 0) <= 0,
    totalAvailable: Number(bedSummary.total_available || 0),
    totalCapacity: Number(bedSummary.total_capacity || 0),
    totalOccupied: Number(bedSummary.total_occupied || 0)
  });
});

export const addToWaitlist = asyncHandler(async (req, res) => {
  let { studentId, preferredBlock = '', notes = '' } = req.body;

  if (req.user.role === 'student') {
    const student = await studentForUser(req.user.userId);
    studentId = student.student_id;
  } else {
    required(studentId, 'Student');
  }

  const result = await withTransaction(async (db) => {
    const [[student]] = await db.execute(
      'SELECT student_id, full_name, user_id FROM students WHERE student_id = ? FOR UPDATE',
      [studentId]
    );
    if (!student) throw httpError(404, 'Student not found.');

    const [[activeAlloc]] = await db.execute(
      "SELECT allocation_id FROM room_allocations WHERE student_id = ? AND status = 'Active' FOR UPDATE",
      [studentId]
    );
    if (activeAlloc) {
      throw httpError(409, 'This student already has an active room allocation.');
    }

    const [[existingWait]] = await db.execute(
      "SELECT waitlist_id FROM waiting_list WHERE student_id = ? AND status IN ('Waiting', 'Offered') FOR UPDATE",
      [studentId]
    );
    if (existingWait) {
      throw httpError(409, 'This student is already in the waiting list.');
    }

    const [created] = await db.execute(
      'INSERT INTO waiting_list (student_id, preferred_block, notes, status) VALUES (?, ?, ?, "Waiting")',
      [studentId, preferredBlock ? String(preferredBlock).trim() : null, notes ? String(notes).trim() : null]
    );

    await db.execute(
      'INSERT INTO activities (user_id, activity_type, description) VALUES (?, ?, ?)',
      [student.user_id, 'waitlist_joined', `${student.full_name} joined the room waiting list`]
    );

    const [[pos]] = await db.execute(
      "SELECT COUNT(*) AS queue_pos FROM waiting_list WHERE status = 'Waiting'"
    );

    return { waitlistId: created.insertId, student, queuePos: pos.queue_pos };
  });

  notifyAdmins({
    title: 'New Student in Waiting Area',
    message: `${result.student.full_name} joined the waiting list at Queue #${result.queuePos}.`,
    type: 'room',
    link: '/admin/allocations'
  });

  createNotification({
    userId: result.student.user_id,
    title: 'Added to Hostel Waiting Area',
    message: `You are #${result.queuePos} in the waiting queue. We will notify you immediately when a bed is available.`,
    type: 'room',
    link: '/student/room'
  });

  res.status(201).json({
    message: 'Student added to waiting list successfully.',
    waitlistId: result.waitlistId,
    queuePosition: result.queuePos
  });
});

export const updateWaitlistStatus = asyncHandler(async (req, res) => {
  const waitlistId = Number(req.params.id);
  const { status, preferredBlock, notes } = req.body;

  const [[entry]] = await pool.execute(
    'SELECT w.*, s.full_name, s.user_id FROM waiting_list w JOIN students s ON s.student_id = w.student_id WHERE w.waitlist_id = ?',
    [waitlistId]
  );
  if (!entry) throw httpError(404, 'Waitlist entry not found.');

  const updates = [];
  const params = [];

  if (status) {
    if (!['Waiting', 'Offered', 'Allocated', 'Cancelled'].includes(status)) {
      throw httpError(400, 'Invalid status.');
    }
    updates.push('status = ?');
    params.push(status);
  }
  if (preferredBlock !== undefined) {
    updates.push('preferred_block = ?');
    params.push(preferredBlock ? String(preferredBlock).trim() : null);
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    params.push(notes ? String(notes).trim() : null);
  }

  if (updates.length) {
    params.push(waitlistId);
    await pool.execute(`UPDATE waiting_list SET ${updates.join(', ')} WHERE waitlist_id = ?`, params);
  }

  res.json({ message: 'Waitlist record updated successfully.' });
});

export const removeFromWaitlist = asyncHandler(async (req, res) => {
  const waitlistId = Number(req.params.id);
  const [[entry]] = await pool.execute(
    'SELECT w.*, s.full_name, s.user_id FROM waiting_list w JOIN students s ON s.student_id = w.student_id WHERE w.waitlist_id = ?',
    [waitlistId]
  );
  if (!entry) throw httpError(404, 'Waitlist entry not found.');

  await pool.execute('DELETE FROM waiting_list WHERE waitlist_id = ?', [waitlistId]);
  res.json({ message: 'Student removed from waiting list.' });
});

export const allocateFromWaitlist = asyncHandler(async (req, res) => {
  const { waitlistId, roomId, allocationDate } = req.body;
  required(waitlistId, 'Waitlist ID');
  required(roomId, 'Room');

  let studentInfo = null;
  let roomInfo = null;
  let allocationId = null;

  await withTransaction(async (db) => {
    const [[waitEntry]] = await db.execute(
      `SELECT w.*, s.full_name, s.user_id 
       FROM waiting_list w 
       JOIN students s ON s.student_id = w.student_id 
       WHERE w.waitlist_id = ? FOR UPDATE`,
      [waitlistId]
    );
    if (!waitEntry) throw httpError(404, 'Waitlist entry not found.');
    studentInfo = waitEntry;

    const [[current]] = await db.execute(
      "SELECT allocation_id FROM room_allocations WHERE student_id = ? AND status = 'Active' FOR UPDATE",
      [waitEntry.student_id]
    );
    if (current) throw httpError(409, 'This student already has an active room allocation.');

    const [[room]] = await db.execute('SELECT * FROM rooms WHERE room_id = ? FOR UPDATE', [roomId]);
    if (!room) throw httpError(404, 'Room not found.');
    if (room.available_beds < 1) {
      throw httpError(409, 'Selected room is full. Please pick another available room.');
    }
    roomInfo = room;

    const [createdAlloc] = await db.execute(
      'INSERT INTO room_allocations (student_id, room_id, allocation_date, status) VALUES (?, ?, ?, "Active")',
      [waitEntry.student_id, roomId, allocationDate || new Date().toISOString().slice(0, 10)]
    );
    allocationId = createdAlloc.insertId;

    const occupied = room.occupied_beds + 1;
    await db.execute(
      'UPDATE rooms SET occupied_beds = ?, available_beds = ?, room_status = ? WHERE room_id = ?',
      [occupied, room.capacity - occupied, roomStatus(room.capacity, occupied), roomId]
    );

    await db.execute(
      "UPDATE waiting_list SET status = 'Allocated' WHERE waitlist_id = ?",
      [waitlistId]
    );

    await db.execute(
      'INSERT INTO activities (user_id, activity_type, description) VALUES (?, ?, ?)',
      [waitEntry.user_id, 'room_allocated', `${waitEntry.full_name} allocated to Floor ${room.block} · Room ${room.room_number} from waiting area`]
    );
  });

  notifyAdmins({
    title: 'Room Allocated From Waiting Area',
    message: `${studentInfo.full_name} was allocated to Floor ${roomInfo.block} · Room ${roomInfo.room_number} from the waiting area.`,
    type: 'room',
    link: '/admin/allocations'
  });

  createNotification({
    userId: studentInfo.user_id,
    title: 'Room Allocated!',
    message: `Great news! You have been allocated to Floor ${roomInfo.block} · Room ${roomInfo.room_number} from the waiting area.`,
    type: 'room',
    link: '/student/room'
  });

  res.status(201).json({
    message: `${studentInfo.full_name} has been allocated to Floor ${roomInfo.block} · Room ${roomInfo.room_number}.`,
    allocationId
  });
});
