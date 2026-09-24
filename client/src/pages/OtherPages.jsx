import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BedDouble, CalendarDays, CheckCircle2, CircleAlert, ClipboardList, Clock, CreditCard, DoorOpen, FileBarChart, HeartHandshake, ImagePlus, KeyRound, MessageSquareHeart, Pencil, Plus, Printer, Save, ShieldAlert, Trash2, UtensilsCrossed } from 'lucide-react';
import { del, get, post, put } from '../services/api';
import { ConfirmDialog, EmptyState, Modal, SearchFilter, StatusBadge } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, DataLoading, FormActions, FormatMoney, Input, PageHeader, ReportToolbar, Select, today, useResource } from './shared';

function ComplaintForm({ onClose, done }) { const [description,setDescription]=useState('');const [busy,setBusy]=useState(false);const toast=useToast();const submit=async e=>{e.preventDefault();setBusy(true);try{await post('/complaints',{description});toast({type:'success',text:'Complaint submitted. The hostel team has been notified.'});done();onClose();}catch(err){toast({type:'error',text:err.message});}finally{setBusy(false);}};return <form className="modal-body" onSubmit={submit}><label className="form-field"><span>Describe the issue <b>*</b></span><textarea rows="6" value={description} required onChange={e=>setDescription(e.target.value)} placeholder="Tell us what needs attention, including the area or room if useful…"/></label><FormActions onCancel={onClose} submitting={busy} submitText="Submit complaint"/></form>; }
function ComplaintUpdateForm({ complaint,onClose,done }) { const [description,setDescription]=useState(complaint.complaint_description);const [status,setStatus]=useState(complaint.status);const [busy,setBusy]=useState(false);const toast=useToast();const submit=async e=>{e.preventDefault();setBusy(true);try{await put(`/complaints/${complaint.complaint_id}`,{description,status});toast({type:'success',text:'Complaint updated.'});done();onClose();}catch(err){toast({type:'error',text:err.message});}finally{setBusy(false);}};return <form className="modal-body" onSubmit={submit}><label className="form-field"><span>Complaint description</span><textarea rows="5" value={description} onChange={e=>setDescription(e.target.value)}/></label><Select label="Status" value={status} onChange={e=>setStatus(e.target.value)}><option>Pending</option><option>In Progress</option><option>Resolved</option></Select><FormActions onCancel={onClose} submitting={busy} submitText="Update complaint"/></form>; }
export function ComplaintsPage() { const {user}=useAuth();const isAdmin=user.role==='admin';const [query,setQuery]=useState('');const [status,setStatus]=useState('');const {data,loading,error,reload}=useResource(`/complaints?search=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}`);const [open,setOpen]=useState(false);const [edit,setEdit]=useState(null);const [remove,setRemove]=useState(null);const [busy,setBusy]=useState(false);const toast=useToast();const complaints=data?.complaints||[];const destroy=async()=>{setBusy(true);try{await del(`/complaints/${remove.complaint_id}`);toast({type:'success',text:'Complaint deleted.'});setRemove(null);reload();}catch(e){toast({type:'error',text:e.message});}finally{setBusy(false);}};const title=isAdmin?'Complaints':'My complaints';return <div className="page-content"><PageHeader eyebrow={isAdmin?'SERVICE DESK':'SUPPORT'} title={title} description={isAdmin?'See, prioritise and resolve resident service requests.':'Raise issues and follow their progress in one place.'} action={!isAdmin&&<Button className="primary" icon={Plus} onClick={()=>setOpen(true)}>Submit complaint</Button>}/><section className="complaint-stats">{[['Pending',complaints.filter(c=>c.status==='Pending').length,'amber'],['In progress',complaints.filter(c=>c.status==='In Progress').length,'purple'],['Resolved',complaints.filter(c=>c.status==='Resolved').length,'green']].map(([label,n,tone])=><span key={label} className={tone}><b>{n}</b><small>{label}</small></span>)}</section><section className="surface data-surface"><SearchFilter value={query} onChange={setQuery} placeholder="Search complaints…"><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All status</option><option>Pending</option><option>In Progress</option><option>Resolved</option></select></SearchFilter><DataLoading loading={loading&&!data} error={error}>{complaints.length?<div className="complaint-list">{complaints.map(c=><article key={c.complaint_id}><div className="complaint-symbol"><ClipboardList size={20}/></div><div className="complaint-copy"><header><span>{isAdmin&&<b>{c.full_name} · </b>}#{String(c.complaint_id).padStart(4,'0')}</span><StatusBadge status={c.status}/></header><p>{c.complaint_description}</p><small>Filed {new Date(c.complaint_date).toLocaleDateString('en-IN',{dateStyle:'medium'})}</small></div><div className="complaint-actions">{isAdmin&&<button onClick={()=>setEdit(c)}><Pencil size={16}/> Update</button>}<button className="text-danger" onClick={()=>setRemove(c)}><Trash2 size={16}/>{isAdmin?'Delete':'Remove'}</button></div></article>)}</div>:<EmptyState icon={ClipboardList} title={query||status?'No matching complaints found.':(isAdmin?'You’re all clear!':'No complaints submitted.')} text={query||status?'Try adjusting your search or status filter.':(isAdmin?'No complaints have been submitted.':'If something needs attention, our team is here to help.')} action={!isAdmin&&!query&&!status&&<Button className="primary" icon={Plus} onClick={()=>setOpen(true)}>Submit complaint</Button>}/>}</DataLoading></section><Modal open={open} onClose={()=>setOpen(false)} title="Submit a complaint" subtitle="Your request will be shared with the hostel team."><ComplaintForm onClose={()=>setOpen(false)} done={reload}/></Modal><Modal open={Boolean(edit)} onClose={()=>setEdit(null)} title="Update complaint" subtitle={edit&&`Request #${String(edit.complaint_id).padStart(4,'0')}`}><>{edit&&<ComplaintUpdateForm complaint={edit} onClose={()=>setEdit(null)} done={reload}/>}</></Modal><ConfirmDialog open={Boolean(remove)} onClose={()=>setRemove(null)} onConfirm={destroy} busy={busy} title="Delete this complaint?" description="This support request will be permanently removed."/></div>; }

function FeedbackForm({ onClose,done }) { const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const toast=useToast();const submit=async e=>{e.preventDefault();setBusy(true);try{await post('/feedback',{message});toast({type:'success',text:'Thank you — your feedback was sent.'});done();onClose();}catch(err){toast({type:'error',text:err.message});}finally{setBusy(false);}};return <form className="modal-body" onSubmit={submit}><label className="form-field"><span>Share your thoughts <b>*</b></span><textarea required rows="6" value={message} onChange={e=>setMessage(e.target.value)} placeholder="What’s working well? What could improve?"/></label><FormActions onCancel={onClose} submitting={busy} submitText="Send feedback"/></form>; }
export function FeedbackPage() { const {user}=useAuth();const isAdmin=user.role==='admin';const [query,setQuery]=useState('');const {data,loading,error,reload}=useResource(`/feedback?search=${encodeURIComponent(query)}`);const [open,setOpen]=useState(false);const [remove,setRemove]=useState(null);const [busy,setBusy]=useState(false);const toast=useToast();const feedback=data?.feedback||[];const destroy=async()=>{setBusy(true);try{await del(`/feedback/${remove.feedback_id}`);toast({type:'success',text:'Feedback removed.'});setRemove(null);reload();}catch(e){toast({type:'error',text:e.message});}finally{setBusy(false);}};return <div className="page-content"><PageHeader eyebrow={isAdmin?'RESIDENT VOICE':'YOUR VOICE'} title={isAdmin?'Feedback':'Share feedback'} description={isAdmin?'Listen to the ideas and experiences of hostel residents.':'Your ideas help make Smart Hostel feel more like home.'} action={!isAdmin&&<Button className="primary" icon={Plus} onClick={()=>setOpen(true)}>Give feedback</Button>}/><section className="surface feedback-toolbar"><SearchFilter value={query} onChange={setQuery} placeholder={isAdmin?'Search feedback or student…':'Search your feedback…'}/></section><DataLoading loading={loading&&!data} error={error}>{feedback.length?<section className="feedback-grid">{feedback.map(f=><article className="feedback-card" key={f.feedback_id}><header><span className="feedback-quote">“</span>{isAdmin&&<div><b>{f.full_name}</b><small>Resident student</small></div>}<button className="card-delete" onClick={()=>setRemove(f)} aria-label="Delete feedback"><Trash2 size={16}/></button></header><p>{f.feedback_message}</p><footer><CalendarDays size={14}/>{new Date(f.feedback_date).toLocaleDateString('en-IN',{month:'long',day:'numeric',year:'numeric'})}</footer></article>)}</section>:<section className="surface"><EmptyState icon={MessageSquareHeart} title={query?'No matching feedback found.':(isAdmin?'No feedback yet.':'No feedback submitted yet.')} text={query?'Try adjusting your search term.':(isAdmin?'Feedback from students will appear here.':'Share your experience to help make a difference.')} action={!isAdmin&&!query&&<Button className="primary" icon={Plus} onClick={()=>setOpen(true)}>Give feedback</Button>}/></section>}</DataLoading><Modal open={open} onClose={()=>setOpen(false)} title="Give feedback" subtitle="We read every message and appreciate your honesty."><FeedbackForm onClose={()=>setOpen(false)} done={reload}/></Modal><ConfirmDialog open={Boolean(remove)} onClose={()=>setRemove(null)} onConfirm={destroy} busy={busy} title="Remove this feedback?"/></div>; }

function MenuForm({ item,onClose,done }) { const [form,setForm]=useState({dayName:item?.day_name||'Monday',mealType:item?.meal_type||'Breakfast',menuItems:item?.menu_items||''});const toast=useToast();const [busy,setBusy]=useState(false);const submit=async e=>{e.preventDefault();setBusy(true);try{item?await put(`/menu/${item.menu_id}`,form):await post('/menu',form);toast({type:'success',text:'Menu saved successfully.'});done();onClose();}catch(err){toast({type:'error',text:err.message});}finally{setBusy(false);}};return <form className="modal-body" onSubmit={submit}><div className="form-grid"><Select label="Day" required value={form.dayName} onChange={e=>setForm({...form,dayName:e.target.value})}>{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d=><option key={d}>{d}</option>)}</Select><Select label="Meal" required value={form.mealType} onChange={e=>setForm({...form,mealType:e.target.value})}>{['Breakfast','Lunch','Evening Snack','Dinner'].map(d=><option key={d}>{d}</option>)}</Select><label className="form-field span-all"><span>Menu items <b>*</b></span><textarea required rows="4" value={form.menuItems} onChange={e=>setForm({...form,menuItems:e.target.value})}/></label></div><FormActions onCancel={onClose} submitting={busy} submitText="Save menu item"/></form>; }
export function MenuPage() { const {user}=useAuth();const isAdmin=user.role==='admin';const {data,loading,error,reload}=useResource('/menu');const [open,setOpen]=useState(false);const [edit,setEdit]=useState(null);const [remove,setRemove]=useState(null);const [busy,setBusy]=useState(false);const toast=useToast();const menu=data?.menu||[];const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];const meals=['Breakfast','Lunch','Evening Snack','Dinner'];const destroy=async()=>{setBusy(true);try{await del(`/menu/${remove.menu_id}`);toast({type:'success',text:'Menu item removed.'});setRemove(null);reload();}catch(e){toast({type:'error',text:e.message});}finally{setBusy(false);}};return <div className="page-content menu-page"><PageHeader eyebrow="WEEKLY MEAL PLANNER" title="Hostel menu" description={isAdmin?'Keep the weekly dining plan fresh and clear for every resident.':'A delicious look at the week ahead.'} action={isAdmin&&<Button className="primary" icon={Plus} onClick={()=>{setEdit(null);setOpen(true)}}>Add menu item</Button>}/><DataLoading loading={loading} error={error}>{menu.length?<section className="meal-planner"><div className="planner-heading"><UtensilsCrossed size={20}/><span>Seven days of thoughtful meals</span><small>Updated by your hostel team</small></div>{days.map(day=><article key={day} className="day-menu"><header><h2>{day}</h2><span>{day===new Date().toLocaleDateString('en-US',{weekday:'long'})?'Today':'Dining plan'}</span></header><div>{meals.map((meal,i)=>{const item=menu.find(x=>x.day_name===day&&x.meal_type===meal);return <section key={meal} className={`meal-slot meal-${i}`}><div><span>{['☀','◐','☕','☾'][i]}</span><small>{meal}</small></div><p>{item?.menu_items||'Menu to be announced'}</p>{isAdmin&&item&&<aside><button onClick={()=>{setEdit(item);setOpen(true)}} aria-label={`Edit ${day} ${meal}`}><Pencil size={14}/></button><button onClick={()=>setRemove(item)} aria-label={`Delete ${day} ${meal}`}><Trash2 size={14}/></button></aside>}</section>})}</div></article>)}</section>:<section className="surface"><EmptyState icon={UtensilsCrossed} title="No menu published yet." text="The weekly dining plan will appear here when available." action={isAdmin&&<Button className="primary" icon={Plus} onClick={()=>setOpen(true)}>Add menu item</Button>}/></section>}</DataLoading><Modal open={open} onClose={()=>setOpen(false)} title={edit?'Edit menu item':'Add menu item'} subtitle="Build the weekly meal planner one item at a time."><MenuForm item={edit} onClose={()=>setOpen(false)} done={reload}/></Modal><ConfirmDialog open={Boolean(remove)} onClose={()=>setRemove(null)} onConfirm={destroy} busy={busy} title="Remove this menu item?"/></div>; }

const reportOptions = [
  ['students','Student report','Current student directory and room placement'],['fees','Fee report','Payments, balances and collection status'],['wifi','Wi-Fi report','Wi-Fi plans, student subscriptions and revenue'],['complaints','Complaint report','Resident support requests by date'],['allocations','Room allocation report','All current and historic room assignments'],['rooms','Room occupancy report','Capacity and availability across the hostel']
];
function exportCsv(report) { const escaped = x => `"${String(x ?? '').replaceAll('"','""')}"`; const content=[report.columns,...report.rows].map(row=>row.map(escaped).join(',')).join('\n'); const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));a.download=`${report.title.toLowerCase().replaceAll(' ','-')}.csv`;a.click();URL.revokeObjectURL(a.href); }
export function ReportsPage() { const [kind,setKind]=useState('students');const [from,setFrom]=useState('');const [to,setTo]=useState('');const [report,setReport]=useState(null);const [loading,setLoading]=useState(false);const toast=useToast();const generate=async()=>{setLoading(true);try{setReport(await get(`/reports/${kind}${from||to?`?from=${from}&to=${to}`:''}`));}catch(e){toast({type:'error',text:e.message});}finally{setLoading(false);}};return <div className="page-content reports-page"><PageHeader eyebrow="DECISION SUPPORT" title="Reports" description="Generate clean, print-ready hostel reports from live database records."/><section className="report-builder"><div className="report-selector"><p className="eyebrow">CHOOSE A REPORT</p>{reportOptions.map(([key,title,text])=><button key={key} className={kind===key?'selected':''} onClick={()=>setKind(key)}><FileBarChart size={19}/><div><b>{title}</b><small>{text}</small></div><span>›</span></button>)}</div><div className="report-config"><span className="report-orb"><FileBarChart size={28}/></span><p className="eyebrow">REPORT SETTINGS</p><h2>{reportOptions.find(r=>r[0]===kind)?.[1]}</h2><p>Choose an optional date range where applicable, then create a fresh report.</p>{['fees','complaints','wifi'].includes(kind)&&<div className="date-range"><Input label="From date" type="date" value={from} onChange={e=>setFrom(e.target.value)}/><Input label="To date" type="date" value={to} onChange={e=>setTo(e.target.value)}/></div>}<Button className="primary" icon={FileBarChart} onClick={generate} disabled={loading}>{loading?'Generating…':'Generate report'}</Button></div></section>{report&&<section className="print-report"><header><div><p className="eyebrow">SMART HOSTEL · LIVE REPORT</p><h2>{report.title}</h2><span>Generated {new Date().toLocaleString('en-IN',{dateStyle:'long',timeStyle:'short'})}</span></div><ReportToolbar report={report} onExport={()=>exportCsv(report)}/></header><div className="table-scroll"><table><thead><tr>{report.columns.map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{report.rows.map((row,i)=><tr key={i}>{row.map((x,j)=><td key={j}>{x}</td>)}</tr>)}</tbody></table></div>{!report.rows.length&&<EmptyState icon={FileBarChart} title="No matching records." text="Try broadening your date filters."/>}</section>}</div>; }


export function StudentRoomPage() {
  const { data: allocData, loading: allocLoading, error: allocError } = useResource('/allocations');
  const { data: waitData, loading: waitLoading, error: waitError, reload: reloadWait } = useResource('/waitlist/my-status');
  const [joining, setJoining] = useState(false);
  const toast = useToast();

  const allocation = (allocData?.allocations || []).find(a => a.status === 'Active');
  const waitlist = waitData?.waitlist;
  const isFull = waitData?.isHostelFull;

  const joinWaitlist = async () => {
    setJoining(true);
    try {
      const res = await post('/waitlist/join', {});
      toast({ type: 'success', text: `You have joined the waiting queue at Position #${res.queuePosition}.` });
      reloadWait();
    } catch (err) {
      toast({ type: 'error', text: err.message });
    } finally {
      setJoining(false);
    }
  };

  const loading = allocLoading || waitLoading;
  const error = allocError || waitError;

  return (
    <div className="page-content">
      <PageHeader
        eyebrow={allocation ? 'YOUR ALLOCATION' : waitlist ? 'WAITING AREA' : 'ROOM STATUS'}
        title={allocation ? 'My room' : waitlist ? 'Waiting area status' : 'Room assignment'}
        description={
          allocation
            ? 'Your current home at Smart Hostel.'
            : waitlist
            ? 'All hostel rooms are currently full. You are registered in the priority waiting queue.'
            : 'Your room allocation status and availability.'
        }
      />

      <DataLoading loading={loading} error={error}>
        {allocation ? (
          <section className="my-room-card">
            <div className="room-art">
              <DoorOpen size={49} />
              <small>FLOOR {allocation.block}</small>
              <h2>Room {allocation.room_number}</h2>
            </div>
            <div className="room-data">
              <p className="eyebrow">YOUR ROOM DETAILS</p>
              <h2>A comfortable place to focus and rest.</h2>
              <div className="room-detail-grid">
                <span>
                  <small>Capacity</small>
                  <b>{allocation.capacity} residents</b>
                </span>
                <span>
                  <small>Current occupancy</small>
                  <b>{allocation.occupied_beds} residents</b>
                </span>
                <span>
                  <small>Available beds</small>
                  <b>{allocation.available_beds} bed{allocation.available_beds === 1 ? '' : 's'}</b>
                </span>
                <span>
                  <small>Allocation date</small>
                  <b>{new Date(allocation.allocation_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</b>
                </span>
              </div>
              <StatusBadge status={allocation.room_status} />
            </div>
          </section>
        ) : waitlist ? (
          <section className="my-room-card waiting-area-card">
            <div className="room-art waitlist-art">
              <Clock size={49} />
              <small>PRIORITY QUEUE</small>
              <h2>Queue #{waitlist.queue_position}</h2>
              <span className="queue-counter-tag">of {waitlist.total_waiting} in waiting area</span>
            </div>
            <div className="room-data">
              <div className="waitlist-card-header">
                <div>
                  <p className="eyebrow">HOSTEL AT 100% CAPACITY</p>
                  <h2>You are in line for the next available bed</h2>
                </div>
                <StatusBadge status="Waiting" />
              </div>

              <div className="waitlist-stepper">
                <div className="stepper-item completed">
                  <span className="stepper-dot">✓</span>
                  <div>
                    <b>Registered</b>
                    <small>Account verified</small>
                  </div>
                </div>
                <div className="stepper-line active" />
                <div className="stepper-item active">
                  <span className="stepper-dot">#{waitlist.queue_position}</span>
                  <div>
                    <b>In Waiting Area</b>
                    <small>Priority queue</small>
                  </div>
                </div>
                <div className="stepper-line" />
                <div className="stepper-item pending">
                  <span className="stepper-dot">3</span>
                  <div>
                    <b>Bed Vacancy</b>
                    <small>Awaited</small>
                  </div>
                </div>
                <div className="stepper-line" />
                <div className="stepper-item pending">
                  <span className="stepper-dot">4</span>
                  <div>
                    <b>Allocated</b>
                    <small>Move-in ready</small>
                  </div>
                </div>
              </div>

              <div className="room-detail-grid">
                <span>
                  <small>Your Queue Number</small>
                  <b>Position #{waitlist.queue_position}</b>
                </span>
                <span>
                  <small>Total in Queue</small>
                  <b>{waitlist.total_waiting} applicant{waitlist.total_waiting === 1 ? '' : 's'}</b>
                </span>
                <span>
                  <small>Preferred Floor</small>
                  <b>{waitlist.preferred_block || 'Any available room'}</b>
                </span>
                <span>
                  <small>Joined Waiting Area</small>
                  <b>{new Date(waitlist.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</b>
                </span>
              </div>

              <div className="waitlist-reassurance">
                <CheckCircle2 size={18} />
                <span>
                  Whenever a resident student vacates their room or additional beds are added, the hostel team automatically allocates rooms in strict queue order. You will receive an immediate notification here and on your bell icon!
                </span>
              </div>
            </div>
          </section>
        ) : (
          <section className="surface waitlist-empty-surface">
            {isFull ? (
              <EmptyState
                icon={Clock}
                title="Hostel is currently full."
                text="All rooms and beds are occupied. Join the Waiting Area to secure your place in line for the next available bed."
                action={
                  <Button className="primary" icon={Clock} onClick={joinWaitlist} disabled={joining}>
                    {joining ? 'Joining queue…' : 'Join Waiting Area'}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={DoorOpen}
                title="Your room is being arranged."
                text="The hostel team will update your portal as soon as your room allocation is ready."
              />
            )}
          </section>
        )}
      </DataLoading>
    </div>
  );
}

export function StudentFeesPage() {
  const { data, loading, error } = useResource('/fees');
  const fees = data?.fees || [];
  const totals = useMemo(() => ({
    total: fees.reduce((s, x) => s + Number(x.total_amount || (Number(x.fee_amount) + Number(x.penalty_amount || 0))), 0),
    paid: fees.filter(x => x.payment_status === 'Paid').reduce((s, x) => s + Number(x.total_amount || (Number(x.fee_amount) + Number(x.penalty_amount || 0))), 0),
    pending: fees.filter(x => x.payment_status === 'Pending').reduce((s, x) => s + Number(x.total_amount || (Number(x.fee_amount) + Number(x.penalty_amount || 0))), 0),
    penalties: fees.reduce((s, x) => s + Number(x.penalty_amount || 0), 0)
  }), [fees]);

  const isOverdue = (f) => {
    if (f.payment_status !== 'Pending' || !f.due_date) return false;
    return new Date(f.due_date) < new Date(today());
  };

  return (
    <div className="page-content">
      <PageHeader eyebrow="YOUR PAYMENT HISTORY" title="My fees" description="A clear view of your hostel fee records, penalty breakdowns, and balances." />
      <section className="student-fee-cards">
        <span>
          <small>Total dues</small>
          <b><FormatMoney value={totals.total} /></b>
        </span>
        <span>
          <small>Paid</small>
          <b><FormatMoney value={totals.paid} /></b>
        </span>
        <span>
          <small>Pending</small>
          <b><FormatMoney value={totals.pending} /></b>
        </span>
        <span>
          <small>Penalties applied</small>
          <b className={totals.penalties > 0 ? 'text-amber' : ''}><FormatMoney value={totals.penalties} /></b>
        </span>
      </section>
      <DataLoading loading={loading} error={error}>
        {fees.length ? (
          <section className="surface data-surface">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fee record</th>
                    <th>Base fee</th>
                    <th>Penalty</th>
                    <th>Total payable</th>
                    <th>Due date</th>
                    <th>Payment date</th>
                    <th>Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map(f => {
                    const overdue = isOverdue(f);
                    const penalty = Number(f.penalty_amount || 0);
                    const total = Number(f.total_amount || (Number(f.fee_amount) + penalty));
                    return (
                      <tr key={f.fee_id} className={overdue ? 'row-overdue' : ''}>
                        <td>
                          <b>{f.description || 'Hostel fee'}</b>
                          <small>Fee #{String(f.fee_id).padStart(4, '0')}</small>
                        </td>
                        <td className="money"><FormatMoney value={f.fee_amount} /></td>
                        <td>
                          {penalty > 0 ? (
                            <span className="penalty-pill" title={f.penalty_reason || 'Penalty applied'}>
                              <FormatMoney value={penalty} />
                              {f.penalty_reason && <small>{f.penalty_reason}</small>}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="money"><strong className="fee-total-highlight"><FormatMoney value={total} /></strong></td>
                        <td>
                          {f.due_date ? (
                            <div className="due-date-cell">
                              <span>{new Date(f.due_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                              {overdue && <span className="overdue-tag"><AlertTriangle size={11} /> Overdue</span>}
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>{f.payment_date ? new Date(f.payment_date).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'Awaiting payment'}</td>
                        <td>{f.payment_method || '—'}</td>
                        <td><StatusBadge status={f.payment_status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="surface">
            <EmptyState icon={CreditCard} title="No fee records yet." text="Your hostel payment history will appear here." />
          </section>
        )}
      </DataLoading>
    </div>
  );
}

export function ProfilePage() { const {data,loading,error,reload}=useResource('/profile');const {user,setUser}=useAuth();const toast=useToast();const [form,setForm]=useState(null);const [busy,setBusy]=useState(false);const [photoBusy,setPhotoBusy]=useState(false);const profile=data?.profile;useEffect(()=>{if(profile){setForm({fullName:profile.full_name,email:profile.email,mobile:profile.mobile||'',address:profile.address||''});if(profile.profile_photo&&profile.profile_photo!==user?.profile_photo){setUser(prev=>({...prev,...profile}));localStorage.setItem('smart-hostel-user',JSON.stringify({...user,...profile}));}}},[profile,user?.profile_photo]);const sync=e=>setForm({...form,[e.target.name]:e.target.value});const save=async e=>{e.preventDefault();setBusy(true);try{const result=await put('/profile',form);setUser(result.profile);localStorage.setItem('smart-hostel-user',JSON.stringify(result.profile));toast({type:'success',text:'Profile updated successfully.'});reload();}catch(err){toast({type:'error',text:err.message});}finally{setBusy(false);}};const photo=async e=>{const file=e.target.files?.[0];if(!file)return;setPhotoBusy(true);try{const fd=new FormData();fd.append('photo',file);const result=await put('/profile/photo',fd);setUser(result.profile);localStorage.setItem('smart-hostel-user',JSON.stringify(result.profile));toast({type:'success',text:'Profile photo updated.'});reload();}catch(err){toast({type:'error',text:err.message});}finally{setPhotoBusy(false);}};return <div className="page-content"><PageHeader eyebrow="ACCOUNT DETAILS" title="My profile" description="Keep your personal details current and recognisable."/><DataLoading loading={loading} error={error}>{profile&&form&&<section className="profile-layout"><aside className="profile-side"><div className="profile-photo">{profile.profile_photo?<img src={profile.profile_photo} alt="Profile"/>:<span>{profile.full_name.split(' ').map(x=>x[0]).slice(0,2).join('')}</span>}</div><label className="upload-button"><ImagePlus size={16}/>{photoBusy?'Uploading…':'Change photo'}<input type="file" accept="image/*" onChange={photo} disabled={photoBusy}/></label><h2>{profile.full_name}</h2><p>{profile.role==='admin'?'Hostel administrator':'Resident student'}</p><div className="profile-side-meta"><span>Smart Hostel member</span><span>Secure account</span></div></aside><section className="surface profile-form"><header><h2>Personal information</h2><p>These details help the hostel team stay in touch.</p></header><form onSubmit={save}><div className="form-grid"><Input label="Full name" required name="fullName" value={form.fullName} onChange={sync}/><Input label="Email address" required type="email" name="email" value={form.email} onChange={sync}/><Input label="Mobile number" name="mobile" value={form.mobile} onChange={sync}/><label className="form-field span-all"><span>Address</span><textarea name="address" rows="4" value={form.address} onChange={sync}/></label></div><div className="form-actions"><Button type="submit" className="primary" icon={Save} disabled={busy}>{busy?'Saving…':'Save profile'}</Button></div></form></section></section>}</DataLoading></div>; }


export function SettingsPage() { const [form,setForm]=useState({currentPassword:'',newPassword:'',confirmPassword:''});const [busy,setBusy]=useState(false);const toast=useToast();const submit=async e=>{e.preventDefault();setBusy(true);try{await put('/profile/password',form);setForm({currentPassword:'',newPassword:'',confirmPassword:''});toast({type:'success',text:'Password changed successfully.'});}catch(err){toast({type:'error',text:err.message});}finally{setBusy(false);}};return <div className="page-content settings-page"><PageHeader eyebrow="ACCOUNT SECURITY" title="Settings" description="Manage the security of your Smart Hostel account."/><section className="settings-layout"><section className="surface password-card"><header><span className="settings-icon"><KeyRound size={21}/></span><div><h2>Change password</h2><p>Use a strong, unique password to keep your account protected.</p></div></header><form onSubmit={submit}><Input label="Current password" required type="password" value={form.currentPassword} onChange={e=>setForm({...form,currentPassword:e.target.value})}/><Input label="New password" required type="password" hint="At least 8 characters" value={form.newPassword} onChange={e=>setForm({...form,newPassword:e.target.value})}/><Input label="Confirm new password" required type="password" value={form.confirmPassword} onChange={e=>setForm({...form,confirmPassword:e.target.value})}/><Button className="primary" icon={KeyRound} disabled={busy}>{busy?'Updating…':'Update password'}</Button></form></section><aside className="security-note"><CheckCircle2 size={22}/><h3>Your account is protected</h3><p>Smart Hostel never displays or stores your plain-text password. Passwords are securely hashed before storage.</p></aside></section></div>; }
