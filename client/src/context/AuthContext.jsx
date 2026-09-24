import { createContext, useContext, useEffect, useState } from 'react';
import { get, post } from '../services/api';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('smart-hostel-user') || 'null'));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('smart-hostel-token')));
  useEffect(() => {
    if (!localStorage.getItem('smart-hostel-token')) return setLoading(false);
    get('/auth/me').then(({ user: fresh }) => { setUser(fresh); localStorage.setItem('smart-hostel-user', JSON.stringify(fresh)); })
      .catch(() => { localStorage.removeItem('smart-hostel-token'); localStorage.removeItem('smart-hostel-user'); setUser(null); })
      .finally(() => setLoading(false));
  }, []);
  const signin = async (payload) => { const data = await post('/auth/login', payload); localStorage.setItem('smart-hostel-token', data.token); localStorage.setItem('smart-hostel-user', JSON.stringify(data.user)); setUser(data.user); return data.user; };
  const signup = async (payload) => { const data = await post('/auth/register', payload); localStorage.setItem('smart-hostel-token', data.token); localStorage.setItem('smart-hostel-user', JSON.stringify(data.user)); setUser(data.user); return data.user; };
  const signout = async () => { try { await post('/auth/logout'); } catch {} localStorage.removeItem('smart-hostel-token'); localStorage.removeItem('smart-hostel-user'); setUser(null); };
  const value = { user, setUser, loading, signin, signup, signout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
