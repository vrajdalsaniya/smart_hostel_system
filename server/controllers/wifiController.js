import { pool } from '../config/db.js';
import { asyncHandler, httpError, required } from '../utils/http.js';
import { studentForUser } from './studentController.js';
import { notifyAdmins, createNotification } from '../services/notificationService.js';

const generateVoucherCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let p1 = '';
  for (let i = 0; i < 4; i++) p1 += chars.charAt(Math.floor(Math.random() * chars.length));
  const p2 = Math.floor(1000 + Math.random() * 9000);
  return `WIFI-${p1}-${p2}`;
};

const generateWifiPassword = () => {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `Hostel@${num}`;
};

const planSelect = `SELECT plan_id, name, price, validity_days, speed_mbps, data_quota_gb, is_unlimited, device_limit, description, status, created_at, updated_at FROM wifi_plans`;

const subSelect = `SELECT ws.subscription_id, ws.student_id, ws.plan_id, ws.amount_paid, ws.start_date, ws.end_date, 
  ws.payment_method, ws.payment_status, ws.status, ws.voucher_code, ws.wifi_username, ws.wifi_password, 
  ws.device_name, ws.device_mac, ws.created_at,
  s.full_name AS student_name, s.user_id, u.email AS student_email, s.mobile_number,
  p.name AS plan_name, p.speed_mbps, p.data_quota_gb, p.is_unlimited, p.device_limit
  FROM wifi_subscriptions ws
  JOIN students s ON s.student_id = ws.student_id
  JOIN users u ON u.user_id = s.user_id
  JOIN wifi_plans p ON p.plan_id = ws.plan_id`;

export const listPlans = asyncHandler(async (req, res) => {
  const { status } = req.query;
  let sql = planSelect;
  const params = [];
  if (req.user?.role === 'student') {
    sql += ' WHERE status = "Active"';
  } else if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }
  sql += ' ORDER BY price ASC';
  const [plans] = await pool.execute(sql, params);
  res.json({ plans });
});

export const createPlan = asyncHandler(async (req, res) => {
  const { name, price, validityDays, speedMbps, dataQuotaGb, isUnlimited, deviceLimit = 2, description = '', status = 'Active' } = req.body;
  required(name, 'Plan name');
  required(price, 'Price in Rupees');
  required(validityDays, 'Validity duration');
  required(speedMbps, 'Speed in Mbps');

  const p = Number(price);
  const v = Number(validityDays);
  const s = Number(speedMbps);
  const d = Number(deviceLimit) || 2;
  const quota = isUnlimited ? null : (dataQuotaGb ? Number(dataQuotaGb) : null);
  const unlimited = Boolean(isUnlimited || !quota);

  if (p < 0) throw httpError(400, 'Price must be 0 or greater.');
  if (v <= 0) throw httpError(400, 'Validity days must be at least 1.');
  if (s <= 0) throw httpError(400, 'Speed must be at least 1 Mbps.');

  const [result] = await pool.execute(
    `INSERT INTO wifi_plans (name, price, validity_days, speed_mbps, data_quota_gb, is_unlimited, device_limit, description, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name.trim(), p, v, s, quota, unlimited, d, description.trim(), status]
  );

  const [[created]] = await pool.execute(`${planSelect} WHERE plan_id = ?`, [result.insertId]);
  res.status(201).json({ message: 'Wi-Fi plan created successfully.', plan: created });
});

export const updatePlan = asyncHandler(async (req, res) => {
  const planId = Number(req.params.id);
  const { name, price, validityDays, speedMbps, dataQuotaGb, isUnlimited, deviceLimit = 2, description = '', status = 'Active' } = req.body;
  required(name, 'Plan name');
  required(price, 'Price');

  const [[existing]] = await pool.execute('SELECT plan_id FROM wifi_plans WHERE plan_id = ?', [planId]);
  if (!existing) throw httpError(404, 'Wi-Fi plan not found.');

  const p = Number(price);
  const v = Number(validityDays);
  const s = Number(speedMbps);
  const d = Number(deviceLimit) || 2;
  const quota = isUnlimited ? null : (dataQuotaGb ? Number(dataQuotaGb) : null);
  const unlimited = Boolean(isUnlimited || !quota);

  await pool.execute(
    `UPDATE wifi_plans SET name=?, price=?, validity_days=?, speed_mbps=?, data_quota_gb=?, is_unlimited=?, device_limit=?, description=?, status=?
     WHERE plan_id=?`,
    [name.trim(), p, v, s, quota, unlimited, d, description.trim(), status, planId]
  );

  const [[updated]] = await pool.execute(`${planSelect} WHERE plan_id = ?`, [planId]);
  res.json({ message: 'Wi-Fi plan updated successfully.', plan: updated });
});

export const deletePlan = asyncHandler(async (req, res) => {
  const planId = Number(req.params.id);
  const [[activeSubs]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM wifi_subscriptions WHERE plan_id = ? AND status = "Active"',
    [planId]
  );

  if (activeSubs?.total > 0) {
    await pool.execute('UPDATE wifi_plans SET status = "Inactive" WHERE plan_id = ?', [planId]);
    return res.json({ message: 'Plan has active subscribers, so it has been set to Inactive instead of deleting.' });
  }

  const [result] = await pool.execute('DELETE FROM wifi_plans WHERE plan_id = ?', [planId]);
  if (!result.affectedRows) throw httpError(404, 'Plan not found.');
  res.json({ message: 'Wi-Fi plan deleted successfully.' });
});

export const listSubscriptions = asyncHandler(async (req, res) => {
  const { search = '', status = '', planId = '' } = req.query;
  const values = [];
  let sql = subSelect + ' WHERE 1=1';

  // Mark expired subscriptions automatically
  await pool.execute('UPDATE wifi_subscriptions SET status="Expired" WHERE end_date < CURRENT_DATE() AND status="Active"');

  if (req.user.role === 'student') {
    const student = await studentForUser(req.user.userId);
    sql += ' AND ws.student_id = ?';
    values.push(student.student_id);
  } else {
    if (search) {
      sql += ' AND (s.full_name LIKE ? OR ws.voucher_code LIKE ? OR u.email LIKE ? OR ws.device_name LIKE ?)';
      const like = `%${search}%`;
      values.push(like, like, like, like);
    }
    if (planId) {
      sql += ' AND ws.plan_id = ?';
      values.push(Number(planId));
    }
  }

  if (status) {
    sql += ' AND ws.status = ?';
    values.push(status);
  }

  sql += ' ORDER BY ws.created_at DESC';
  const [subscriptions] = await pool.execute(sql, values);
  res.json({ subscriptions });
});

export const getActiveSubscription = asyncHandler(async (req, res) => {
  let studentId = req.query.studentId;
  if (req.user.role === 'student') {
    const student = await studentForUser(req.user.userId);
    studentId = student.student_id;
  } else if (!studentId) {
    throw httpError(400, 'Student ID is required.');
  }

  await pool.execute('UPDATE wifi_subscriptions SET status="Expired" WHERE end_date < CURRENT_DATE() AND status="Active"');

  const [rows] = await pool.execute(
    `${subSelect} WHERE ws.student_id = ? AND ws.status = 'Active' ORDER BY ws.end_date DESC LIMIT 1`,
    [studentId]
  );

  const active = rows[0] || null;
  let remainingDays = 0;
  if (active) {
    const now = new Date();
    const end = new Date(active.end_date);
    remainingDays = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }

  res.json({
    activeSubscription: active,
    hasActive: Boolean(active),
    remainingDays,
    ssid: 'SmartHostel_5G',
    secondarySsid: 'SmartHostel_2.4G',
    gatewayIp: '192.168.1.1',
    dns: '1.1.1.1, 8.8.8.8'
  });
});

export const subscribePlan = asyncHandler(async (req, res) => {
  const { planId, paymentMethod = 'Online', deviceName = 'Primary Device', deviceMac = '' } = req.body;
  required(planId, 'Wi-Fi plan');

  let studentId = req.body.studentId;
  let userRecordId = req.user.userId;

  if (req.user.role === 'student') {
    const student = await studentForUser(req.user.userId);
    studentId = student.student_id;
  } else {
    required(studentId, 'Student ID');
    const [[targetStudent]] = await pool.execute('SELECT user_id, full_name FROM students WHERE student_id=?', [studentId]);
    if (!targetStudent) throw httpError(404, 'Student not found.');
    userRecordId = targetStudent.user_id;
  }

  const [[plan]] = await pool.execute('SELECT * FROM wifi_plans WHERE plan_id = ? AND status = "Active"', [planId]);
  if (!plan) throw httpError(404, 'Active Wi-Fi plan not found.');

  // Check if student already has an active subscription; if so, expire it or extend from end date
  const [existingActive] = await pool.execute(
    'SELECT subscription_id, end_date FROM wifi_subscriptions WHERE student_id = ? AND status = "Active"',
    [studentId]
  );

  let startDate = new Date();
  if (existingActive.length > 0 && new Date(existingActive[0].end_date) > new Date()) {
    startDate = new Date(existingActive[0].end_date);
  }

  const endDate = new Date(startDate.getTime() + plan.validity_days * 24 * 60 * 60 * 1000);
  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);

  const [[student]] = await pool.execute('SELECT full_name FROM students WHERE student_id=?', [studentId]);
  const safeName = (student?.full_name || 'resident').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  const username = `stu_${safeName}_${studentId}`;
  const password = generateWifiPassword();
  const voucher = generateVoucherCode();

  if (existingActive.length > 0) {
    for (const oldSub of existingActive) {
      await pool.execute('UPDATE wifi_subscriptions SET status="Expired" WHERE subscription_id=?', [oldSub.subscription_id]);
    }
  }

  const [result] = await pool.execute(
    `INSERT INTO wifi_subscriptions 
      (student_id, plan_id, amount_paid, start_date, end_date, payment_method, payment_status, status, voucher_code, wifi_username, wifi_password, device_name, device_mac)
     VALUES (?, ?, ?, ?, ?, ?, 'Paid', 'Active', ?, ?, ?, ?, ?)`,
    [studentId, plan.plan_id, plan.price, startStr, endStr, paymentMethod, voucher, username, password, deviceName, deviceMac || null]
  );

  await pool.execute(
    'INSERT INTO activities (user_id, activity_type, description) VALUES (?, ?, ?)',
    [userRecordId, 'wifi_subscription', `${student?.full_name || 'Student'} subscribed to ${plan.name} Wi-Fi plan (₹${Number(plan.price).toLocaleString('en-IN')})`]
  );

  const [[created]] = await pool.execute(`${subSelect} WHERE ws.subscription_id = ?`, [result.insertId]);
  notifyAdmins({
    title: 'Wi-Fi Subscription Activated',
    message: `${student?.full_name || 'Student'} activated ${plan.name} Wi-Fi (₹${Number(plan.price).toLocaleString('en-IN')}).`,
    type: 'wifi',
    link: '/admin/wifi'
  });
  if (userRecordId) {
    createNotification({
      userId: userRecordId,
      title: 'Wi-Fi Plan Activated',
      message: `Your ${plan.name} Wi-Fi plan is active! Voucher code: ${voucher}.`,
      type: 'wifi',
      link: '/student/wifi'
    });
  }
  res.status(201).json({ message: 'Wi-Fi plan activated successfully!', subscription: created });
});

export const updateSubscriptionStatus = asyncHandler(async (req, res) => {
  const subId = Number(req.params.id);
  const { status, paymentStatus, endDate } = req.body;

  const [[sub]] = await pool.execute('SELECT * FROM wifi_subscriptions WHERE subscription_id = ?', [subId]);
  if (!sub) throw httpError(404, 'Subscription not found.');

  const newStatus = status || sub.status;
  const newPayment = paymentStatus || sub.payment_status;
  const newEndDate = endDate || sub.end_date;

  await pool.execute(
    'UPDATE wifi_subscriptions SET status = ?, payment_status = ?, end_date = ? WHERE subscription_id = ?',
    [newStatus, newPayment, newEndDate, subId]
  );

  const [[updated]] = await pool.execute(`${subSelect} WHERE ws.subscription_id = ?`, [subId]);
  if (updated && updated.user_id && newStatus !== sub.status) {
    createNotification({
      userId: updated.user_id,
      title: 'Wi-Fi Subscription Status',
      message: `Your ${updated.plan_name} Wi-Fi subscription is now ${newStatus}.`,
      type: 'wifi',
      link: '/student/wifi'
    });
  }
  res.json({ message: 'Subscription status updated.', subscription: updated });
});

export const updateRegisteredDevice = asyncHandler(async (req, res) => {
  const subId = Number(req.params.id);
  const { deviceName, deviceMac } = req.body;
  required(deviceName, 'Device name');

  let studentId;
  if (req.user.role === 'student') {
    const student = await studentForUser(req.user.userId);
    studentId = student.student_id;
    const [[check]] = await pool.execute('SELECT subscription_id FROM wifi_subscriptions WHERE subscription_id=? AND student_id=?', [subId, studentId]);
    if (!check) throw httpError(403, 'You do not own this subscription.');
  }

  await pool.execute(
    'UPDATE wifi_subscriptions SET device_name = ?, device_mac = ? WHERE subscription_id = ?',
    [deviceName.trim(), deviceMac ? deviceMac.trim() : null, subId]
  );

  const [[updated]] = await pool.execute(`${subSelect} WHERE ws.subscription_id = ?`, [subId]);
  res.json({ message: 'Device information updated.', subscription: updated });
});

export const regenerateVoucher = asyncHandler(async (req, res) => {
  const subId = Number(req.params.id);

  if (req.user.role === 'student') {
    const student = await studentForUser(req.user.userId);
    const [[check]] = await pool.execute('SELECT subscription_id FROM wifi_subscriptions WHERE subscription_id=? AND student_id=?', [subId, student.student_id]);
    if (!check) throw httpError(403, 'Permission denied.');
  }

  const newVoucher = generateVoucherCode();
  const newPassword = generateWifiPassword();

  await pool.execute(
    'UPDATE wifi_subscriptions SET voucher_code = ?, wifi_password = ? WHERE subscription_id = ?',
    [newVoucher, newPassword, subId]
  );

  const [[updated]] = await pool.execute(`${subSelect} WHERE ws.subscription_id = ?`, [subId]);
  res.json({ message: 'New Wi-Fi voucher and password generated.', subscription: updated });
});

export const getHotspots = asyncHandler(async (_req, res) => {
  const hotspots = [
    { id: 'ap-1', name: 'Block A - 1st Floor AP', band: 'Dual-Band 2.4 / 5 GHz', status: 'Online', signal: 98, channel: 36, connected: 42, location: 'Corridor A-1' },
    { id: 'ap-2', name: 'Block A - 2nd Floor AP', band: 'Dual-Band 2.4 / 5 GHz', status: 'Online', signal: 94, channel: 44, connected: 36, location: 'Corridor A-2' },
    { id: 'ap-3', name: 'Block B - Central Hub', band: 'Dual-Band 2.4 / 5 GHz', status: 'Online', signal: 91, channel: 149, connected: 28, location: 'Lounge B' },
    { id: 'ap-4', name: 'Hostel Library & Study Hall', band: 'Ultra-Fast 5 GHz MIMO', status: 'Online', signal: 100, channel: 161, connected: 55, location: 'Ground Floor Library' },
    { id: 'ap-5', name: 'Mess & Dining Hall', band: 'Wide-Range 2.4 GHz', status: 'Online', signal: 89, channel: 6, connected: 21, location: 'Cafeteria Wing' },
    { id: 'ap-6', name: 'Block C - Common Room', band: '5 GHz High Throughput', status: 'Online', signal: 96, channel: 153, connected: 17, location: 'Recreation Area' }
  ];
  res.json({ hotspots });
});

export const getWifiStats = asyncHandler(async (_req, res) => {
  const [[activeSubs]] = await pool.execute('SELECT COUNT(*) AS total FROM wifi_subscriptions WHERE status="Active"');
  const [[revenue]] = await pool.execute('SELECT COALESCE(SUM(amount_paid), 0) AS total FROM wifi_subscriptions WHERE payment_status="Paid"');
  const [[totalPlans]] = await pool.execute('SELECT COUNT(*) AS total FROM wifi_plans WHERE status="Active"');
  const [[expiringSoon]] = await pool.execute('SELECT COUNT(*) AS total FROM wifi_subscriptions WHERE status="Active" AND end_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 5 DAY)');

  res.json({
    activeSubscribers: activeSubs.total,
    totalRevenue: Number(revenue.total),
    activePlans: totalPlans.total,
    expiringSoon: expiringSoon.total,
    hotspotsTotal: 6,
    hotspotsOnline: 6
  });
});
