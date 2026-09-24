import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  ClipboardList,
  CreditCard,
  DoorOpen,
  MessageSquareHeart,
  UtensilsCrossed,
  Wifi,
  UsersRound,
  Trash2,
  X,
  Sparkles,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr.replace(' ', 'T'));
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) {
    const mins = Math.max(1, Math.floor(diffSec / 60));
    return `${mins}m ago`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `${hours}h ago`;
  }
  if (diffSec < 172800) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function getNotificationIcon(type) {
  switch (type) {
    case 'room':
      return { Icon: DoorOpen, className: 'notif-icon-room' };
    case 'fee':
      return { Icon: CreditCard, className: 'notif-icon-fee' };
    case 'complaint':
      return { Icon: ClipboardList, className: 'notif-icon-complaint' };
    case 'wifi':
      return { Icon: Wifi, className: 'notif-icon-wifi' };
    case 'feedback':
      return { Icon: MessageSquareHeart, className: 'notif-icon-feedback' };
    case 'menu':
      return { Icon: UtensilsCrossed, className: 'notif-icon-menu' };
    case 'student':
      return { Icon: UsersRound, className: 'notif-icon-student' };
    default:
      return { Icon: Sparkles, className: 'notif-icon-system' };
  }
}

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    totalCount,
    loading,
    filter,
    setFilter,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  } = useNotifications();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleItemClick = (notif) => {
    if (!notif.is_read) {
      markAsRead(notif.notification_id);
    }
    if (notif.link) {
      setOpen(false);
      navigate(notif.link);
    }
  };

  const handleDismiss = (e, notifId) => {
    e.stopPropagation();
    deleteNotification(notifId);
  };

  const hasReadNotifications = notifications.some(n => n.is_read);

  return (
    <div className="notification-wrapper" ref={dropdownRef}>
      <button
        className={`icon-button notification ${unreadCount > 0 ? 'has-unread' : ''} ${open ? 'active' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge" title={`${unreadCount} unread`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown animate-pop">
          <div className="notif-header">
            <div className="notif-header-title">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <span className="notif-count-pill">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                className="notif-action-btn"
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                <CheckCheck size={16} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="notif-tabs">
            <button
              className={`notif-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
              <span className="tab-count">{totalCount}</span>
            </button>
            <button
              className={`notif-tab ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread
              <span className="tab-count">{unreadCount}</span>
            </button>
          </div>

          <div className="notif-list-container">
            {loading && notifications.length === 0 ? (
              <div className="notif-loading">
                <span className="spinner" />
                <p>Loading notifications…</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <CheckCircle2 size={36} className="notif-empty-icon" />
                <strong>All caught up!</strong>
                <p>{filter === 'unread' ? 'No unread notifications right now.' : 'Recent activities and updates will appear here.'}</p>
              </div>
            ) : (
              <ul className="notif-list">
                {notifications.map((n) => {
                  const { Icon, className: iconClass } = getNotificationIcon(n.type);
                  return (
                    <li
                      key={n.notification_id}
                      className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                      onClick={() => handleItemClick(n)}
                    >
                      <div className={`notif-icon-bubble ${iconClass}`}>
                        <Icon size={18} />
                      </div>
                      <div className="notif-content">
                        <div className="notif-item-top">
                          <strong className="notif-title">{n.title}</strong>
                          <span className="notif-time">{formatTimeAgo(n.created_at)}</span>
                        </div>
                        <p className="notif-message">{n.message}</p>
                      </div>
                      <div className="notif-actions">
                        {!n.is_read && <span className="notif-unread-dot" title="Unread" />}
                        <button
                          className="notif-dismiss-btn"
                          onClick={(e) => handleDismiss(e, n.notification_id)}
                          title="Dismiss notification"
                          aria-label="Dismiss notification"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {hasReadNotifications && (
            <div className="notif-footer">
              <button
                className="notif-clear-btn"
                onClick={() => clearAll(true)}
              >
                <Trash2 size={13} />
                <span>Clear read notifications</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
