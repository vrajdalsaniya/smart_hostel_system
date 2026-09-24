import { pool } from '../config/db.js';
import { asyncHandler, httpError } from '../utils/http.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const filter = req.query.filter || 'all';
  const limit = Math.min(Number(req.query.limit) || 25, 50);

  let sql = 'SELECT notification_id, user_id, title, message, type, link, is_read, created_at FROM notifications WHERE user_id = ?';
  const params = [userId];

  if (filter === 'unread') {
    sql += ' AND is_read = FALSE';
  }

  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const [notifications] = await pool.execute(sql, params);

  const [[unreadRow]] = await pool.execute(
    'SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE',
    [userId]
  );
  const [[totalRow]] = await pool.execute(
    'SELECT COUNT(*) AS total_count FROM notifications WHERE user_id = ?',
    [userId]
  );

  res.json({
    notifications: notifications.map(n => ({
      ...n,
      is_read: Boolean(n.is_read)
    })),
    unread_count: Number(unreadRow?.unread_count || 0),
    total_count: Number(totalRow?.total_count || 0)
  });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const notifId = Number(req.params.id);

  const [result] = await pool.execute(
    'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
    [notifId, userId]
  );

  if (!result.affectedRows) {
    throw httpError(404, 'Notification not found.');
  }

  const [[unreadRow]] = await pool.execute(
    'SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE',
    [userId]
  );

  res.json({
    message: 'Notification marked as read.',
    notification_id: notifId,
    unread_count: Number(unreadRow?.unread_count || 0)
  });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  await pool.execute(
    'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
    [userId]
  );

  res.json({
    message: 'All notifications marked as read.',
    unread_count: 0
  });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const notifId = Number(req.params.id);

  const [result] = await pool.execute(
    'DELETE FROM notifications WHERE notification_id = ? AND user_id = ?',
    [notifId, userId]
  );

  if (!result.affectedRows) {
    throw httpError(404, 'Notification not found.');
  }

  const [[unreadRow]] = await pool.execute(
    'SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE',
    [userId]
  );

  res.json({
    message: 'Notification removed.',
    unread_count: Number(unreadRow?.unread_count || 0)
  });
});

export const clearAllNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const onlyRead = req.query.read === 'true';

  if (onlyRead) {
    await pool.execute('DELETE FROM notifications WHERE user_id = ? AND is_read = TRUE', [userId]);
  } else {
    await pool.execute('DELETE FROM notifications WHERE user_id = ?', [userId]);
  }

  const [[unreadRow]] = await pool.execute(
    'SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE',
    [userId]
  );

  res.json({
    message: 'Notifications cleared.',
    unread_count: Number(unreadRow?.unread_count || 0)
  });
});
