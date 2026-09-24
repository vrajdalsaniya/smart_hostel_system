import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Coffee, Eye, EyeOff, Heart, LockKeyhole, Mail, MoonStar, ShieldCheck, Sparkles, UserRound, Wifi } from 'lucide-react';
import Brand from '../components/Brand';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { post } from '../services/api';
import { Input, Select } from './shared';

function PasswordInput({ value, onChange, label = 'Password', required = true, name = 'password', hint }) { const [show, setShow] = useState(false); return <label className="form-field"><span>{label}{required && <b> *</b>}</span><div className="password-control"><input type={show ? 'text' : 'password'} name={name} value={value} onChange={onChange} required={required}/><button type="button" onClick={() => setShow(!show)}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>{hint && <small>{hint}</small>}</label>; }

export function LoginPage() {
  const { user, loading, signin } = useAuth(), location = useLocation(), navigate = useNavigate(), toast = useToast(); const lockedAdmin = location.pathname === '/admin/login'; const [form, setForm] = useState({ email: '', password: '', role: lockedAdmin ? 'admin' : 'student' }); const [busy, setBusy] = useState(false); const role = lockedAdmin ? 'admin' : form.role;
  if (loading) return null; if (user) return <Navigate to={`/${user.role}/dashboard`} replace/>;
  const submit = async (e) => { e.preventDefault(); setBusy(true); try { const signedIn = await signin({ ...form, role }); toast({ type: 'success', text: 'Signed in successfully.' }); navigate(`/${signedIn.role}/dashboard`, { replace: true }); } catch (err) { toast({ type: 'error', text: err.message }); } finally { setBusy(false); } };
  return <div className="auth-page"><section className="auth-story"><div className="story-orb orb-one"/><div className="story-orb orb-two"/><div className="story-doodle doodle-star"><Sparkles size={22}/></div><div className="story-doodle doodle-moon"><MoonStar size={19}/></div><Brand light/><div className="story-main"><p className="eyebrow light">YOUR HOME BASE IS READY</p><h1>Good vibes,<br/><em>great roomies.</em></h1><p>Everything you need for the good kind of hostel chaos—minus the lost laundry.</p><div className="story-pills"><span><Wifi size={14}/> Always connected</span><span><Coffee size={14}/> Chai-friendly</span></div></div><div className="hostel-postcard"><div className="postcard-top"><span className="online-dot"/> Tonight at Smart Hostel <MoonStar size={15}/></div><div className="postcard-room"><div className="window-glow"><i/><i/><i/><i/></div><div className="room-lamp"/><div className="room-plant"><i/><i/></div><div className="room-bed"><span/></div></div><div className="postcard-bottom"><span>Roomies, routines &amp; a little magic</span><Heart size={16}/></div></div></section><section className="auth-panel"><div className="auth-card"><div className="auth-mobile-brand"><Brand/></div><p className="eyebrow">{role === 'admin' ? 'ADMINISTRATOR ACCESS' : 'RESIDENT ACCESS'}</p><h2>Welcome back</h2><p className="auth-intro">Sign in to continue to your Smart Hostel workspace.</p>{!lockedAdmin && <div className="role-switch" aria-label="Choose account type"><button type="button" className={role === 'student' ? 'active' : ''} onClick={() => setForm({ ...form, role: 'student' })}><UserRound size={16}/><span>Student</span></button><button type="button" className={role === 'admin' ? 'active' : ''} onClick={() => setForm({ ...form, role: 'admin' })}><ShieldCheck size={16}/><span>Administrator</span></button></div>}<form onSubmit={submit} className="auth-form"><Input label="Email address" required type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/><PasswordInput value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/><Link className="forgot-link" to={`/forgot-password?role=${role}`}>Forgot password?</Link><button className="btn primary full" disabled={busy}>{busy ? 'Signing in…' : <>Sign in <ArrowRight size={18}/></>}</button></form>{role === 'student' ? <p className="auth-switch">New here? <Link to="/register">Create your account</Link></p> : <p className="auth-switch">Resident? <Link to="/">Use student sign in</Link></p>}</div></section></div>;
}

function appPathFromUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url, window.location.origin);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function Recovery({ reset = false }) {
  const [params] = useSearchParams(), toast = useToast();
  const role = params.get('role') === 'admin' ? 'admin' : 'student';
  const token = params.get('token') || '';
  const [form, setForm] = useState(reset ? { password: '', confirmPassword: '' } : { email: '', role });
  const [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  const [resetUrl, setResetUrl] = useState(''), [previewUrl, setPreviewUrl] = useState('');
  const submit = async e => {
    e.preventDefault(); setBusy(true);
    try {
      const data = await post(reset ? '/auth/reset-password' : '/auth/forgot-password', reset ? { ...form, role, token } : form);
      setDone(true);
      setResetUrl(data.resetUrl || '');
      setPreviewUrl(data.previewUrl || '');
      toast({ type: 'success', text: data.message });
    } catch (err) { toast({ type: 'error', text: err.message }); }
    finally { setBusy(false); }
  };
  const login = role === 'admin' ? '/admin/login' : '/';
  const resetPath = appPathFromUrl(resetUrl);
  return <main className="recovery-page"><div className="recovery-card"><Link to={login}><Brand/></Link><div className="recovery-icon">{reset ? <LockKeyhole size={23}/> : <Mail size={23}/>}</div><p className="eyebrow">{reset ? 'SECURE PASSWORD RESET' : 'ACCOUNT RECOVERY'}</p><h1>{reset ? 'Choose a new password' : 'Reset your password'}</h1><p>{reset ? 'Your new password must contain at least 8 characters.' : `Enter the email for your ${role} account. The link expires in 30 minutes.`}</p>{done ? <div className="recovery-success"><CheckCircle2 size={21}/><div><b>{reset ? 'Password updated' : 'Check your email'}</b><span>{reset ? 'You can now sign in with your new password.' : 'If an account matches those details, a reset link is on its way. Demo inboxes like student@smarthostel.com do not receive mail, so use the link below.'}</span>{previewUrl && <a className="recovery-link" href={previewUrl} target="_blank" rel="noreferrer">Open the email we sent</a>}{resetPath && <Link className="recovery-link" to={resetPath}>Open reset link</Link>}</div></div> : reset && !token ? <div className="recovery-success error"><div><b>Reset link missing</b><Link to={`/forgot-password?role=${role}`}>Request a new link</Link></div></div> : <form onSubmit={submit}>{reset ? <><PasswordInput label="New password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/><PasswordInput label="Confirm new password" name="confirmPassword" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}/></> : <><Input label="Email address" required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/><Select label="Account type" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="student">Student</option><option value="admin">Administrator</option></Select></>}<button className="btn primary full" disabled={busy}>{busy ? 'Please wait…' : reset ? 'Update password' : 'Send reset link'}</button></form>}<Link className="back-to-login" to={login}>Back to sign in</Link></div></main>;
}
export const ForgotPasswordPage = () => <Recovery/>;
export const ResetPasswordPage = () => <Recovery reset/>;

export function RegisterPage() { const { user, signup } = useAuth(), toast = useToast(), navigate = useNavigate(); const [form, setForm] = useState({ fullName:'', email:'', mobile:'', address:'', guardianName:'', guardianContact:'', password:'', confirmPassword:'' }); const [busy, setBusy] = useState(false); if (user) return <Navigate to={`/${user.role}/dashboard`} replace/>; const change = e => setForm({ ...form, [e.target.name]: e.target.value }); const submit = async e => { e.preventDefault(); setBusy(true); try { await signup(form); navigate('/student/dashboard'); } catch (err) { toast({ type:'error', text:err.message }); } finally { setBusy(false); } }; return <main className="registration-page"><header><Link to="/"><Brand/></Link><Link className="back-login" to="/">Already registered? <b>Sign in</b></Link></header><section className="register-grid"><div className="register-copy"><h1>Find your place.<br/><em>Feel at home.</em></h1></div><div className="register-card"><h2>Create your account</h2><form onSubmit={submit}><div className="form-grid"><Input label="Full name" required name="fullName" value={form.fullName} onChange={change}/><Input label="Email address" required name="email" type="email" value={form.email} onChange={change}/><Input label="Mobile number" name="mobile" value={form.mobile} onChange={change}/><Input label="Guardian name" name="guardianName" value={form.guardianName} onChange={change}/><Input label="Guardian contact" name="guardianContact" value={form.guardianContact} onChange={change}/><label className="form-field span-all"><span>Address</span><textarea name="address" value={form.address} onChange={change}/></label></div><div className="form-grid passwords"><PasswordInput label="Create password" value={form.password} onChange={change}/><PasswordInput label="Confirm password" name="confirmPassword" value={form.confirmPassword} onChange={change}/></div><button className="btn primary full" disabled={busy}>Create student account</button></form></div></section></main>; }
export function NotFoundPage() { return <main className="not-found"><Brand/><div><span>404</span><h1>This page took the wrong corridor.</h1><Link className="btn primary" to="/">Return to sign in</Link></div></main>; }
