import { pool, withTransaction } from '../config/db.js';
import { asyncHandler, httpError, required, roomStatus } from '../utils/http.js';
import { studentForUser } from './studentController.js';
import { notifyAdmins, createNotification } from '../services/notificationService.js';

const allocationSelect = `SELECT a.allocation_id,a.allocation_date,a.status,a.vacated_at,s.student_id,s.full_name,s.user_id,r.room_id,r.room_number,r.block,r.capacity,r.occupied_beds,r.available_beds FROM room_allocations a JOIN students s ON s.student_id=a.student_id JOIN rooms r ON r.room_id=a.room_id`;

export const listAllocations = asyncHandler(async (req, res) => {
  if (req.user.role === 'student') {
    const student = await studentForUser(req.user.userId);
    const [allocations] = await pool.execute(`${allocationSelect} WHERE a.student_id=? ORDER BY a.created_at DESC`, [student.student_id]);
    return res.json({ allocations });
  }
  const [allocations] = await pool.execute(`${allocationSelect} ORDER BY FIELD(a.status,'Active','Vacated'), a.created_at DESC`);
  res.json({ allocations });
});

export const createAllocation = asyncHandler(async (req, res) => {
  const { studentId, roomId, allocationDate } = req.body;
  required(studentId, 'Student'); required(roomId, 'Room');
  let studentUserId = null;
  const allocation = await withTransaction(async (db) => {
    const [[student]] = await db.execute('SELECT student_id,full_name,user_id FROM students WHERE student_id=? FOR UPDATE', [studentId]);
    if (!student) throw httpError(404, 'Student not found.');
    studentUserId = student.user_id;
    const [[current]] = await db.execute("SELECT allocation_id FROM room_allocations WHERE student_id=? AND status='Active' FOR UPDATE", [studentId]);
    if (current) throw httpError(409, 'This student already has an active room allocation.');
    const [[room]] = await db.execute('SELECT * FROM rooms WHERE room_id=? FOR UPDATE', [roomId]);
    if (!room) throw httpError(404, 'Room not found.');
    if (room.available_beds < 1) throw httpError(409, 'Room is already full. Please select another available room.');
    const [created] = await db.execute('INSERT INTO room_allocations (student_id,room_id,allocation_date,status) VALUES (?,?,?,"Active")', [studentId, roomId, allocationDate || new Date().toISOString().slice(0, 10)]);
    const occupied = room.occupied_beds + 1;
    await db.execute('UPDATE rooms SET occupied_beds=?,available_beds=?,room_status=? WHERE room_id=?', [occupied, room.capacity - occupied, roomStatus(room.capacity, occupied), roomId]);
    await db.execute(
      "UPDATE waiting_list SET status = 'Allocated' WHERE student_id = ? AND status IN ('Waiting', 'Offered')",
      [studentId]
    );
    await db.execute('INSERT INTO activities (user_id,activity_type,description) VALUES (?,?,?)', [student.user_id, 'room_allocated', `${student.full_name} was allocated to Floor ${room.block} · Room ${room.room_number}`]);
    return created.insertId;
  });
  const [[record]] = await pool.execute(`${allocationSelect} WHERE a.allocation_id=?`, [allocation]);
  notifyAdmins({
    title: 'Room Allocated',
    message: `${record.full_name} was allocated to Floor ${record.block} · Room ${record.room_number}.`,
    type: 'room',
    link: '/admin/allocations'
  });
  if (studentUserId) {
    createNotification({
      userId: studentUserId,
      title: 'Room Allocated',
      message: `You have been allocated to Floor ${record.block} · Room ${record.room_number}.`,
      type: 'room',
      link: '/student/room'
    });
  }
  res.status(201).json({ message: 'Room allocated successfully.', allocation: record });
});

export const deleteAllocation = asyncHandler(async (req, res) => {
  let vacatedInfo = null;
  await withTransaction(async (db) => {
    const [[allocation]] = await db.execute(`${allocationSelect} WHERE a.allocation_id=? FOR UPDATE`, [req.params.id]);
    if (!allocation) throw httpError(404, 'Allocation not found.');
    if (allocation.status !== 'Active') throw httpError(409, 'This allocation has already been vacated.');
    vacatedInfo = allocation;
    const [[room]] = await db.execute('SELECT * FROM rooms WHERE room_id=? FOR UPDATE', [allocation.room_id]);
    const occupied = Math.max(0, room.occupied_beds - 1);
    await db.execute("UPDATE room_allocations SET status='Vacated',vacated_at=CURDATE() WHERE allocation_id=?", [req.params.id]);
    await db.execute('UPDATE rooms SET occupied_beds=?,available_beds=?,room_status=? WHERE room_id=?', [occupied, room.capacity - occupied, roomStatus(room.capacity, occupied), room.room_id]);
    await db.execute('INSERT INTO activities (user_id,activity_type,description) VALUES (?,?,?)', [allocation.user_id, 'room_vacated', `${allocation.full_name} vacated room Floor ${room.block} · Room ${room.room_number}`]);
  });
  if (vacatedInfo) {
    notifyAdmins({
      title: 'Room Vacated',
      message: `${vacatedInfo.full_name} vacated room Floor ${vacatedInfo.block} · Room ${vacatedInfo.room_number}.`,
      type: 'room',
      link: '/admin/allocations'
    });
    if (vacatedInfo.user_id) {
      createNotification({
        userId: vacatedInfo.user_id,
        title: 'Room Vacated',
        message: `Your allocation for room Floor ${vacatedInfo.block} · Room ${vacatedInfo.room_number} has been vacated.`,
        type: 'room',
        link: '/student/room'
      });
    }

    // Check if students are in the waiting queue and notify
    const [waitingStudents] = await pool.execute(
      `SELECT w.waitlist_id, s.full_name, s.user_id 
       FROM waiting_list w 
       JOIN students s ON s.student_id = w.student_id 
       WHERE w.status = 'Waiting' 
       ORDER BY w.created_at ASC 
       LIMIT 1`
    );
    if (waitingStudents.length) {
      const nextCandidate = waitingStudents[0];
      notifyAdmins({
        title: 'Bed Available · Waiting List Alert',
        message: `Bed freed in Floor ${vacatedInfo.block} · Room ${vacatedInfo.room_number}. Next in waiting queue: ${nextCandidate.full_name} (Queue #1).`,
        type: 'room',
        link: '/admin/allocations?tab=waiting'
      });
      createNotification({
        userId: nextCandidate.user_id,
        title: 'Hostel Bed Now Available!',
        message: `A bed has opened up in Floor ${vacatedInfo.block} · Room ${vacatedInfo.room_number}! You are next in line in the waiting area.`,
        type: 'room',
        link: '/student/room'
      });
    }
  }
  res.json({ message: 'Allocation vacated and room availability updated.' });
});
