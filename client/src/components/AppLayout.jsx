import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ClipboardList, CreditCard, DoorOpen, FileBarChart, House, LayoutDashboard, LogOut, Menu, MessageSquareHeart, Settings, ShieldCheck, UserRound, UsersRound, UtensilsCrossed, Wifi, X } from 'lucide-react';
import { useState } from 'react';
import Brand from './Brand';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UI';
import NotificationDropdown from './NotificationDropdown';

const adminItems = [
  ['Dashboard', 'dashboard', LayoutDashboard], ['Students', 'students', UsersRound], ['Rooms', 'rooms', DoorOpen], ['Room Allocation', 'allocations', House], ['Fees', 'fees', CreditCard], ['Wi-Fi Network', 'wifi', Wifi], ['Complaints', 'complaints', ClipboardList], ['Feedback', 'feedback', MessageSquareHeart], ['Hostel Menu', 'menu', UtensilsCrossed], ['Reports', 'reports', FileBarChart]
];
const studentItems = [
  ['Dashboard', 'dashboard', LayoutDashboard], ['My Room', 'room', DoorOpen], ['My Fees', 'fees', CreditCard], ['Hostel Wi-Fi', 'wifi', Wifi], ['My Complaints', 'complaints', ClipboardList], ['Hostel Menu', 'menu', UtensilsCrossed], ['Feedback', 'feedback', MessageSquareHeart]
];


export default function AppLayout() {
  const { user, signout } = useAuth(); const [menuOpen, setMenuOpen] = useState(false); const navigate = useNavigate(); const location = useLocation();
  const role = user.role, base = `/${role}`, links = role === 'admin' ? adminItems : studentItems;
  const logout = async () => { await signout(); navigate('/'); };
  const current = links.find(([, path]) => location.pathname.endsWith(path))?.[0] || (location.pathname.endsWith('settings') ? 'Settings' : 'Profile');
  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}><div className="sidebar-top"><Brand light/><button className="close-nav icon-button" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={20}/></button></div>
      <nav className="primary-nav">{links.map(([label, path, Icon]) => <NavLink key={path} to={`${base}/${path}`} onClick={() => setMenuOpen(false)}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><NavLink to={`${base}/profile`}><UserRound size={19}/><span>Profile</span></NavLink><NavLink to={`${base}/settings`}><Settings size={19}/><span>Settings</span></NavLink><button onClick={logout}><LogOut size={19}/><span>Log out</span></button><div className="sidebar-support"><ShieldCheck size={17}/><span>Secure account<br/><small>Powered by Smart Hostel</small></span></div></div>
    </aside>
    {menuOpen && <div className="nav-scrim" onClick={() => setMenuOpen(false)}/>}<main className="main-area"><header className="topbar"><div className="topbar-start"><button className="icon-button menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={21}/></button><div className="crumb"><span>{role === 'admin' ? 'Administration' : 'Resident portal'}</span><strong>{current}</strong></div></div><div className="topbar-actions"><NotificationDropdown /><button className="user-chip" onClick={() => navigate(`${base}/profile`)}><UserAvatar user={user} className="avatar"/><span className="user-chip-copy"><strong>{user.full_name}</strong><small>{role === 'admin' ? 'Hostel administrator' : 'Resident student'}</small></span><ChevronDown size={15}/></button></div></header><Outlet /></main>
    <nav className="mobile-nav">{links.slice(0,5).map(([label,path,Icon]) => <NavLink key={path} to={`${base}/${path}`}><Icon size={19}/><span>{label.replace('My ','')}</span></NavLink>)}</nav>
  </div>;
}
