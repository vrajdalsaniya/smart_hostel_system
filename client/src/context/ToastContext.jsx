import { createContext, useContext, useState } from 'react';
import { Toast } from '../components/UI';
const ToastContext = createContext(() => {});
export function ToastProvider({ children }) { const [toast, setToast] = useState(null); return <ToastContext.Provider value={setToast}>{children}<Toast toast={toast} clear={() => setToast(null)} /></ToastContext.Provider>; }
export const useToast = () => useContext(ToastContext);
