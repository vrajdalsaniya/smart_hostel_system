import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { get, put, del } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const fetchNotifications = useCallback(async (customFilter = filterRef.current) => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setTotalCount(0);
      return;
    }
    try {
      const data = await get(`/notifications?filter=${customFilter}&limit=30`);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
      setTotalCount(data.total_count || 0);
    } catch (err) {
      // Silently catch polling errors so UI is undisturbed
      console.warn('Notifications fetch error:', err.message);
    }
  }, [user]);

  // Initial fetch and fetch whenever user or filter changes
  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchNotifications(filter).finally(() => setLoading(false));
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setTotalCount(0);
    }
  }, [user, filter, fetchNotifications]);

  // Periodic polling every 12 seconds when document is visible
  useEffect(() => {
    if (!user) return;

    const poll = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(filterRef.current);
      }
    };

    const interval = setInterval(poll, 12000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(filterRef.current);
      }
    };
    const onActivityEvent = () => {
      fetchNotifications(filterRef.current);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('app:activity', onActivityEvent);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('app:activity', onActivityEvent);
    };
  }, [user, fetchNotifications]);

  const markAsRead = async (notificationId) => {
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      const res = await put(`/notifications/${notificationId}/read`);
      if (res?.unread_count !== undefined) {
        setUnreadCount(res.unread_count);
      }
    } catch (err) {
      console.error('Failed to mark as read:', err);
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);

      await put('/notifications/read-all');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      fetchNotifications();
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const target = notifications.find(n => n.notification_id === notificationId);
      // Optimistic update
      setNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
      if (target && !target.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setTotalCount(prev => Math.max(0, prev - 1));

      const res = await del(`/notifications/${notificationId}`);
      if (res?.unread_count !== undefined) {
        setUnreadCount(res.unread_count);
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
      fetchNotifications();
    }
  };

  const clearAll = async (onlyRead = true) => {
    try {
      if (onlyRead) {
        setNotifications(prev => prev.filter(n => !n.is_read));
      } else {
        setNotifications([]);
        setUnreadCount(0);
        setTotalCount(0);
      }
      await del(`/notifications?read=${onlyRead}`);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to clear notifications:', err);
      fetchNotifications();
    }
  };

  const triggerActivityRefresh = () => {
    window.dispatchEvent(new CustomEvent('app:activity'));
  };

  const value = {
    notifications,
    unreadCount,
    totalCount,
    loading,
    filter,
    setFilter,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    triggerActivityRefresh
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
