import { AlertCircle, CheckCircle2, Info, X, Search, SlidersHorizontal, MoreHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function Toast({ toast, clear }) { useEffect(() => { if (toast) { const t = setTimeout(clear, 3600); return () => clearTimeout(t); } }, [toast, clear]); if (!toast) return null; const Icon = toast.type === 'error' ? AlertCircle : toast.type === 'info' ? Info : CheckCircle2; return <div className={`toast ${toast.type || 'success'}`}><Icon size={19}/><span>{toast.text}</span><button onClick={clear} aria-label="Dismiss notification"><X size={17}/></button></div>; }
export function StatusBadge({ status }) { const key = String(status || '').toLowerCase().replaceAll(' ', '-'); return <span className={`status ${key}`}>{status}</span>; }
export function LoadingSkeleton({ rows = 4 }) { return <div className="skeleton-wrap">{Array.from({ length: rows }, (_, i) => <span key={i} className="skeleton" style={{ width: `${90 - (i % 3) * 13}%` }} />)}</div>; }
export function EmptyState({ icon: Icon = Info, title, text, action }) { return <div className="empty-state"><span className="empty-icon"><Icon size={28}/></span><h3>{title}</h3><p>{text}</p>{action}</div>; }
export function ConfirmDialog({ open, title = 'Remove this record?', description = 'This action cannot be undone.', onConfirm, onClose, busy }) { if (!open) return null; return <div className="modal-backdrop" role="presentation"><div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"><span className="danger-orb"><AlertCircle size={23}/></span><h2 id="confirm-title">{title}</h2><p>{description}</p><div className="modal-actions"><button className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button><button className="btn danger" onClick={onConfirm} disabled={busy}>{busy ? 'Removing…' : 'Yes, remove'}</button></div></div></div>; }
export function Modal({ open, title, subtitle, onClose, children, wide = false }) { if (!open) return null; return <div className="modal-backdrop" onMouseDown={(e) => e.currentTarget === e.target && onClose()}><section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><header className="modal-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20}/></button></header>{children}</section></div>; }
export function SearchFilter({ value, onChange, placeholder = 'Search records…', children }) {
  const [localValue, setLocalValue] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  useEffect(() => {
    if (localValue === (value || '')) return;
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 200);
    return () => clearTimeout(timer);
  }, [localValue, onChange, value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setLocalValue(val);
    if (val === '') {
      onChange('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onChange(localValue);
    }
  };

  return (
    <div className="toolbar">
      <label className="search-field">
        <Search size={18}/>
        <input
          ref={inputRef}
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          spellCheck="false"
        />
      </label>
      {children && <span className="filter-group"><SlidersHorizontal size={17}/>{children}</span>}
    </div>
  );
}
export function Pagination({ count, page, setPage, perPage = 7 }) { const pages = Math.max(1, Math.ceil(count / perPage)); if (pages < 2) return null; return <div className="pagination"><span>Page {page} of {pages}</span><div><button className="icon-button" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button><button className="icon-button" disabled={page === pages} onClick={() => setPage(page + 1)}>›</button></div></div>; }
export function ActionButton({ onClick, label = 'Actions' }) { return <button className="icon-button table-action" aria-label={label} onClick={onClick}><MoreHorizontal size={19}/></button>; }

export function UserAvatar({ user, className = 'avatar' }) {
  const [hasError, setHasError] = useState(false);
  const initials = user?.full_name?.split(' ').map(x => x[0]).slice(0, 2).join('') || 'U';

  useEffect(() => {
    setHasError(false);
  }, [user?.profile_photo]);

  return (
    <span className={className}>
      {user?.profile_photo && !hasError ? (
        <img
          src={user.profile_photo}
          alt={user.full_name || 'Profile'}
          onError={() => setHasError(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
