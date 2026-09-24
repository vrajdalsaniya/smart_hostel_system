import { pool } from '../config/db.js';
import { asyncHandler, httpError, required, roomStatus } from '../utils/http.js';
import { notifyAdmins } from '../services/notificationService.js';

export const listRooms = asyncHandler(async (req, res) => {
  const { search = '', status = '', block = '' } = req.query;
  let sql = 'SELECT room_id, room_number, block, capacity, occupied_beds, available_beds, room_status, created_at FROM rooms WHERE 1=1'; const params = [];
  if (search) { sql += ' AND (room_number LIKE ? OR block LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (status) { sql += ' AND room_status=?'; params.push(status); }
  if (block) { sql += ' AND block=?'; params.push(block); }
  sql += ' ORDER BY block, room_number';
  const [rooms] = await pool.execute(sql, params);
  res.json({ rooms, total: rooms.length });
});

export const getRoom = asyncHandler(async (req, res) => {
  const [[room]] = await pool.execute('SELECT * FROM rooms WHERE room_id=?', [req.params.id]);
  if (!room) throw httpError(404, 'Room not found.');
  const [residents] = await pool.execute(`SELECT s.student_id, s.full_name, u.email, a.allocation_date FROM room_allocations a JOIN students s ON s.student_id=a.student_id JOIN users u ON u.user_id=s.user_id WHERE a.room_id=? AND a.status='Active' ORDER BY a.allocation_date`, [req.params.id]);
  res.json({ room, residents });
});

export const createRoom = asyncHandler(async (req, res) => {
  const { roomNumber, block, floor } = req.body;
  const floorVal = String(floor || block || '').trim();
  required(roomNumber, 'Room number');
  required(floorVal, 'Floor');

  const floorNum = Number(floorVal);
  if (!Number.isInteger(floorNum) || floorNum < 1 || floorNum > 5) {
    throw httpError(400, 'Floor must be between 1 and 5 (maximum 5 floors allowed).');
  }

  const [[{ count: floorCount }]] = await pool.execute(
    'SELECT COUNT(*) as count FROM rooms WHERE block = ?',
    [String(floorNum)]
  );
  if (floorCount >= 10) {
    throw httpError(400, `Floor ${floorNum} already has the maximum of 10 rooms (cannot exceed 10 rooms per floor).`);
  }

  const [[existingRoom]] = await pool.execute(
    'SELECT room_id FROM rooms WHERE block = ? AND room_number = ?',
    [String(floorNum), String(roomNumber).trim()]
  );
  if (existingRoom) {
    throw httpError(409, `Room ${roomNumber} already exists on Floor ${floorNum}.`);
  }

  const reqCap = Number(req.body.capacity);
  const total = Number.isInteger(reqCap) && reqCap >= 1 && reqCap <= 4 ? reqCap : 4;
  const [result] = await pool.execute(
    'INSERT INTO rooms (room_number,block,capacity,occupied_beds,available_beds,room_status) VALUES (?,?,?,?,?,?)',
    [String(roomNumber).trim(), String(floorNum), total, 0, total, 'Available']
  );
  const [[room]] = await pool.execute('SELECT * FROM rooms WHERE room_id=?', [result.insertId]);
  await pool.execute('INSERT INTO activities (user_id,activity_type,description) VALUES (?,?,?)', [req.user.userId, 'room_created', `Floor ${room.block} · Room ${room.room_number} was created`]);
  notifyAdmins({
    title: 'Room Created',
    message: `Floor ${room.block} · Room ${room.room_number} (Capacity: ${room.capacity}) was added.`,
    type: 'room',
    link: '/admin/rooms'
  });
  res.status(201).json({ message: 'Room added successfully.', room });
});

export const updateRoom = asyncHandler(async (req, res) => {
  const { roomNumber, block, floor } = req.body;
  const floorVal = String(floor || block || '').trim();
  required(roomNumber, 'Room number');
  required(floorVal, 'Floor');

  const [[existing]] = await pool.execute('SELECT * FROM rooms WHERE room_id=?', [req.params.id]);
  if (!existing) throw httpError(404, 'Room not found.');

  const floorNum = Number(floorVal);
  if (!Number.isInteger(floorNum) || floorNum < 1 || floorNum > 5) {
    throw httpError(400, 'Floor must be between 1 and 5 (maximum 5 floors allowed).');
  }

  const [[{ count: floorCount }]] = await pool.execute(
    'SELECT COUNT(*) as count FROM rooms WHERE block = ? AND room_id != ?',
    [String(floorNum), req.params.id]
  );
  if (floorCount >= 10) {
    throw httpError(400, `Floor ${floorNum} already has the maximum of 10 rooms (cannot exceed 10 rooms per floor).`);
  }

  const [[duplicate]] = await pool.execute(
    'SELECT room_id FROM rooms WHERE block = ? AND room_number = ? AND room_id != ?',
    [String(floorNum), String(roomNumber).trim(), req.params.id]
  );
  if (duplicate) {
    throw httpError(409, `Room ${roomNumber} already exists on Floor ${floorNum}.`);
  }

  const reqCap = Number(req.body.capacity);
  const total = Number.isInteger(reqCap) && reqCap >= 1 && reqCap <= 4 ? reqCap : (existing.capacity || 4);
  if (existing.occupied_beds > total) {
    throw httpError(400, `Cannot set capacity to ${total} because ${existing.occupied_beds} beds are currently occupied.`);
  }
  const available = total - existing.occupied_beds;
  await pool.execute(
    'UPDATE rooms SET room_number=?,block=?,capacity=?,available_beds=?,room_status=? WHERE room_id=?',
    [String(roomNumber).trim(), String(floorNum), total, available, roomStatus(total, existing.occupied_beds), req.params.id]
  );
  const [[room]] = await pool.execute('SELECT * FROM rooms WHERE room_id=?', [req.params.id]);
  res.json({ message: 'Room updated successfully.', room });
});

export const deleteRoom = asyncHandler(async (req, res) => {
  const [[room]] = await pool.execute('SELECT room_id, room_number, block, occupied_beds FROM rooms WHERE room_id=?', [req.params.id]);
  if (!room) throw httpError(404, 'Room not found.');
  if (room.occupied_beds > 0) throw httpError(409, 'This room has active residents and cannot be deleted.');
  await pool.execute('DELETE FROM rooms WHERE room_id=?', [req.params.id]);
  notifyAdmins({
    title: 'Room Removed',
    message: `Floor ${room.block} · Room ${room.room_number} was deleted.`,
    type: 'room',
    link: '/admin/rooms'
  });
  res.json({ message: 'Room removed successfully.' });
});
