import { pool } from '../config/db.js';

/**
 * Creates a single notification for a specific user.
 */
export async function createNotification({ userId, title, message, type = 'info', link = null }) {
  if (!userId) return null;
  try {
    const [result] = await pool.execute(
      'INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at) VALUES (?, ?, ?, ?, ?, FALSE, NOW())',
      [userId, String(title).slice(0, 150), String(message).slice(0, 255), type, link || null]
    );
    return result.insertId;
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    return null;
  }
}

export const notifyUser = createNotification;

/**
 * Sends a notification to all admin users.
 */
export async function notifyAdmins({ title, message, type = 'info', link = null }) {
  try {
    const [admins] = await pool.execute('SELECT user_id FROM users WHERE role="admin"');
    if (!admins.length) return;
    const values = [];
    const placeholders = admins.map(a => {
      values.push(a.user_id, String(title).slice(0, 150), String(message).slice(0, 255), type, link || null);
      return '(?, ?, ?, ?, ?, FALSE, NOW())';
    }).join(', ');
    await pool.execute(
      `INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at) VALUES ${placeholders}`,
      values
    );
  } catch (error) {
    console.error('Failed to notify admins:', error.message);
  }
}

/**
 * Sends a notification to all student users.
 */
export async function notifyStudents({ title, message, type = 'info', link = null }) {
  try {
    const [students] = await pool.execute('SELECT user_id FROM users WHERE role="student"');
    if (!students.length) return;
    const values = [];
    const placeholders = students.map(s => {
      values.push(s.user_id, String(title).slice(0, 150), String(message).slice(0, 255), type, link || null);
      return '(?, ?, ?, ?, ?, FALSE, NOW())';
    }).join(', ');
    await pool.execute(
      `INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at) VALUES ${placeholders}`,
      values
    );
  } catch (error) {
    console.error('Failed to notify students:', error.message);
  }
}

/**
 * Sends a notification to all users in the system.
 */
export async function notifyAll({ title, message, type = 'info', link = null }) {
  try {
    const [users] = await pool.execute('SELECT user_id FROM users');
    if (!users.length) return;
    const values = [];
    const placeholders = users.map(u => {
      values.push(u.user_id, String(title).slice(0, 150), String(message).slice(0, 255), type, link || null);
      return '(?, ?, ?, ?, ?, FALSE, NOW())';
    }).join(', ');
    await pool.execute(
      `INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at) VALUES ${placeholders}`,
      values
    );
  } catch (error) {
    console.error('Failed to notify all users:', error.message);
  }
}

/**
 * Convenience method to both log to activities table and dispatch targeted notifications.
 */
export async function logActivityAndNotify({
  userId = null,
  activityType,
  description,
  notifyStudent = true,
  notifyAdmin = true,
  title,
  studentMessage,
  adminMessage,
  studentLink,
  adminLink,
  type = 'info'
}) {
  try {
    // 1. Log to activities table
    await pool.execute(
      'INSERT INTO activities (user_id, activity_type, description) VALUES (?, ?, ?)',
      [userId, activityType, description]
    );

    const effectiveTitle = title || description;

    // 2. Notify admins if requested
    if (notifyAdmin) {
      await notifyAdmins({
        title: effectiveTitle,
        message: adminMessage || description,
        type,
        link: adminLink || null
      });
    }

    // 3. Notify student/user if requested and userId is present
    if (notifyStudent && userId) {
      await createNotification({
        userId,
        title: effectiveTitle,
        message: studentMessage || description,
        type,
        link: studentLink || null
      });
    }
  } catch (error) {
    console.error('Failed in logActivityAndNotify:', error.message);
  }
}
