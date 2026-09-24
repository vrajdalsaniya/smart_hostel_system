import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, CalendarDays, Download, Plus, Printer } from 'lucide-react';
import { get } from '../services/api';
import { EmptyState, LoadingSkeleton } from '../components/UI';

export function useResource(path, initial = null) {
  const [data, setData] = useState(initial), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try { setData(await get(path)); } catch (err) { setError(err.message); } finally { setLoading(false); } };
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    get(path)
      .then((res) => {
        if (active) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [path]);
  return { data, loading, error, reload: load };
}

export function PageHeader({ eyebrow, title, description, action, back }) { return <header className="page-header"><div>{back && <button className="back-link" onClick={back}><ArrowLeft size={17}/> Back</button>}{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="header-action">{action}</div>}</header>; }
export function DataLoading({ loading, error, title, text, children }) { if (loading) return <section className="surface loading-surface"><LoadingSkeleton rows={5}/></section>; if (error) return <section className="surface"><EmptyState icon={AlertCircle} title={title || 'Unable to load records.'} text={error || text || 'Please try again.'}/></section>; return children; }
export function Button({ children, icon: Icon, className = '', ...props }) { return <button className={`btn ${className}`} {...props}>{Icon && <Icon size={17}/>} {children}</button>; }
export function FormField({ label, required, hint, children }) { return <label className="form-field"><span>{label}{required && <b> *</b>}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function Input({ label, required, hint, ...props }) { return <FormField label={label} required={required} hint={hint}><input {...props}/></FormField>; }
export function Select({ label, required, children, ...props }) { return <FormField label={label} required={required}><select {...props}>{children}</select></FormField>; }
export function FormActions({ onCancel, submitting, submitText = 'Save changes' }) { return <div className="form-actions"><Button type="button" className="ghost" onClick={onCancel} disabled={submitting}>Cancel</Button><Button type="submit" className="primary" disabled={submitting}>{submitting ? 'Saving…' : submitText}</Button></div>; }
export function FormatMoney({ value }) { return <>₹{Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</>; }
export function ReportToolbar({ report, onExport }) { return <div className="report-tools"><Button className="ghost" icon={Printer} onClick={() => window.print()}>Print</Button><Button className="secondary" icon={Download} onClick={onExport}>Download CSV</Button></div>; }
export const today = () => new Date().toISOString().slice(0,10);
