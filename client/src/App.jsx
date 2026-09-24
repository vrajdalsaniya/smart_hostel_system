import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import AppLayout from './components/AppLayout';
import { ForgotPasswordPage, LoginPage, NotFoundPage, RegisterPage, ResetPasswordPage } from './pages/PublicPages';
import { AdminDashboard, StudentDashboard } from './pages/DashboardPages';
import { AllocationsPage, FeesPage, RoomsPage, StudentsPage } from './pages/AdminManagementPages';
import { ComplaintsPage, FeedbackPage, MenuPage, ProfilePage, ReportsPage, SettingsPage, StudentFeesPage, StudentRoomPage } from './pages/OtherPages';
import { AdminWifiPage, StudentWifiPage } from './pages/WifiPages';

function Protected({ role }) { const { user, loading } = useAuth(); if (loading) return <div className="app-loading"><span/><p>Opening Smart Hostel…</p></div>; if (!user) return <Navigate to={role === 'admin' ? '/admin/login' : '/'} replace/>; if (user.role !== role) return <Navigate to={`/${user.role}/dashboard`} replace/>; return <AppLayout/>; }

export default function App() { return <ToastProvider><NotificationProvider><Routes><Route path="/" element={<LoginPage/>}/><Route path="/admin/login" element={<LoginPage/>}/><Route path="/register" element={<RegisterPage/>}/><Route path="/forgot-password" element={<ForgotPasswordPage/>}/><Route path="/reset-password" element={<ResetPasswordPage/>}/><Route path="/admin" element={<Protected role="admin"/>}><Route index element={<Navigate to="dashboard" replace/>}/><Route path="dashboard" element={<AdminDashboard/>}/><Route path="students" element={<StudentsPage/>}/><Route path="rooms" element={<RoomsPage/>}/><Route path="allocations" element={<AllocationsPage/>}/><Route path="fees" element={<FeesPage/>}/><Route path="wifi" element={<AdminWifiPage/>}/><Route path="complaints" element={<ComplaintsPage/>}/><Route path="feedback" element={<FeedbackPage/>}/><Route path="menu" element={<MenuPage/>}/><Route path="reports" element={<ReportsPage/>}/><Route path="profile" element={<ProfilePage/>}/><Route path="settings" element={<SettingsPage/>}/></Route><Route path="/student" element={<Protected role="student"/>}><Route index element={<Navigate to="dashboard" replace/>}/><Route path="dashboard" element={<StudentDashboard/>}/><Route path="profile" element={<ProfilePage/>}/><Route path="room" element={<StudentRoomPage/>}/><Route path="fees" element={<StudentFeesPage/>}/><Route path="wifi" element={<StudentWifiPage/>}/><Route path="complaints" element={<ComplaintsPage/>}/><Route path="menu" element={<MenuPage/>}/><Route path="feedback" element={<FeedbackPage/>}/><Route path="settings" element={<SettingsPage/>}/></Route><Route path="*" element={<NotFoundPage/>}/></Routes></NotificationProvider></ToastProvider>; }

