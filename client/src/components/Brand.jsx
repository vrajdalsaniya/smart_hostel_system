import { Building2, Sparkles } from 'lucide-react';
export default function Brand({ compact = false, light = false }) {
  return <div className={`brand ${light ? 'brand-light' : ''}`}><span className="brand-mark"><Building2 size={22}/><Sparkles size={10}/></span>{!compact && <span><strong>SMART HOSTEL</strong><small>HOSTEL MANAGEMENT SYSTEM</small></span>}</div>;
}
