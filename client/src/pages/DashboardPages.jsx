import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, ArrowRight, BedDouble, Building2, CircleAlert, ClipboardPlus, Clock, CreditCard, DoorOpen, FileBarChart, MessageSquarePlus, Plus, UsersRound, WalletCards, Wifi } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DataLoading, FormatMoney, PageHeader, useResource } from './shared';
import { EmptyState } from '../components/UI';

const violet = ['#5C4F9D','#A080E4','#B7C1C7'];
function Metric({ label, value, icon: Icon, tone = 'purple', money = false }) { const [shown, setShown] = useState(0); const numeric = Number(value || 0); useEffect(() => { const start = performance.now(), duration = 600; const tick = now => { const p = Math.min(1,(now-start)/duration); setShown(Math.round(numeric*(1-Math.pow(1-p,3)))); if (p < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }, [numeric]); return <article className={`metric-card ${tone}`}><span className="metric-icon"><Icon size={20}/></span><div><p>{label}</p><strong>{money ? <FormatMoney value={shown}/> : shown}</strong></div><i/></article>; }
function ChartCard({ title, subtitle, children }) { return <section className="chart-card"><header><div><h3>{title}</h3><p>{subtitle}</p></div></header>{children}</section>; }
function Donut({ data, money = false }) { const total = data.reduce((acc,x) => acc + Number(x.value || 0),0); if (!total) return <div className="chart-empty">No data to visualise yet.</div>; return <div className="donut-wrap"><ResponsiveContainer width="100%" height={190}><PieChart><Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={56} outerRadius={77} paddingAngle={4} stroke="none">{data.map((_, i) => <Cell key={i} fill={violet[i]}/>)}</Pie><Tooltip formatter={v => money ? `₹${Number(v).toLocaleString('en-IN')}` : v}/></PieChart></ResponsiveContainer><div className="donut-centre"><strong>{money ? <FormatMoney value={total}/> : total}</strong><small>Total</small></div><div className="chart-key">{data.map((item,i) => <span key={item.name}><i style={{background:violet[i]}}/>{item.name}<b>{money ? <FormatMoney value={item.value}/> : item.value}</b></span>)}</div></div>; }

export function AdminDashboard() {
  const { user } = useAuth(); const { data, loading, error } = useResource('/dashboard/admin'); const navigate = useNavigate();
  return <div className="page-content dashboard"><PageHeader eyebrow="ADMIN OVERVIEW" title={`Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${user.full_name.split(' ')[0]}`} description="Here’s what’s happening in your hostel today." action={<button className="btn primary" onClick={() => navigate('/admin/students?new=1')}><Plus size={17}/> Add student</button>}/>
    <DataLoading loading={loading} error={error}>{data && <>
      {data.stats.isHostelFull && (
        <section className="hostel-full-banner">
          <span className="banner-icon-bubble"><AlertTriangle size={20} /></span>
          <div>
            <strong>Hostel Full Alert · 100% Bed Capacity Reached ({data.stats.occupiedBeds} beds occupied)</strong>
            <p>There are 0 available beds. {data.stats.waitingCount > 0 ? `${data.stats.waitingCount} student(s) waiting in queue.` : 'New applicants will enter the waiting area.'}</p>
          </div>
          <button className="btn soft" onClick={() => navigate('/admin/allocations?tab=waiting')}>
            <Clock size={15} /> View Waiting Queue
          </button>
        </section>
      )}
      <section className="metric-grid">
        <Metric label="Total students" value={data.stats.totalStudents} icon={UsersRound}/>
        <Metric label="Total rooms" value={data.stats.totalRooms} icon={Building2} tone="gray"/>
        <Metric label="Available beds" value={data.stats.availableBeds} icon={BedDouble} tone="lavender"/>
        <Metric label="Occupied beds" value={data.stats.occupiedBeds} icon={DoorOpen} tone="deep"/>
        <Metric label="Waiting queue" value={data.stats.waitingCount} icon={Clock} tone={data.stats.waitingCount > 0 ? 'amber' : 'gray'}/>
      </section>
      <section className="dashboard-grid">
        <ChartCard title="Occupancy overview" subtitle="A live view of bed availability"><Donut data={data.occupancy}/></ChartCard>
        <ChartCard title="Fee overview" subtitle="Collected and outstanding balance"><Donut data={data.fees} money/></ChartCard>
        <ChartCard title="Complaint pulse" subtitle="Current service requests"><div className="bar-chart">{data.complaints.every(x=>!x.value) ? <div className="chart-empty">No complaints to visualise yet.</div> : <ResponsiveContainer width="100%" height={235}><BarChart data={data.complaints} margin={{top:10,right:8,left:-20,bottom:0}}><Tooltip cursor={{fill:'#f7f4fc'}}/><Bar dataKey="value" radius={[7,7,0,0]}>{data.complaints.map((_,i)=><Cell key={i} fill={violet[i]}/>)}</Bar></BarChart></ResponsiveContainer>}<div className="bar-labels">{data.complaints.map(x=><span key={x.name}>{x.name}</span>)}</div></div></ChartCard>
        <section className="activity-card"><header><div><h3>Recent activity</h3><p>Latest updates across the hostel</p></div></header>{data.activities.length ? <ol>{data.activities.map(a=><li key={a.activity_id}><span className="activity-dot"/><div><b>{a.description}</b><small>{new Date(a.created_at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</small></div></li>)}</ol> : <EmptyState title="A quiet start" text="New hostel activity will appear here."/>}</section>
      </section>
      <section className="quick-actions">
        <header><div><p className="eyebrow">MOVE THINGS FORWARD</p><h2>Quick actions</h2></div></header>
        <div>{[
          [UsersRound,'Add student','Register a new resident','/admin/students?new=1'],
          [DoorOpen,'Add room','Expand your room inventory','/admin/rooms?new=1'],
          [ClipboardPlus,'Allocate room','Assign a student to a bed','/admin/allocations?new=1'],
          [Clock,'Waiting Area',`${data.stats.waitingCount} student(s) in queue`,'/admin/allocations?tab=waiting'],
          [CreditCard,'Record fee','Add a payment or balance','/admin/fees?new=1'],
          [Wifi,'Wi-Fi Network','Manage plans & vouchers','/admin/wifi'],
          [MessageSquarePlus,'View complaints','Help residents faster','/admin/complaints'],
          [FileBarChart,'Generate report','Export hostel records','/admin/reports']
        ].map(([Icon,title,text,to])=><button key={title} onClick={()=>navigate(to)}><span><Icon size={21}/></span><div><b>{title}</b><small>{text}</small></div><ArrowRight size={17}/></button>)}</div>
      </section>
    </>}</DataLoading></div>;
}

export function StudentDashboard() {
  const { user } = useAuth(); const { data, loading, error } = useResource('/dashboard/student'); const navigate = useNavigate();
  return <div className="page-content dashboard student-dashboard"><PageHeader eyebrow="RESIDENT OVERVIEW" title={`Welcome back, ${user.full_name.split(' ')[0]}`} description="Your hostel essentials, all in one calm place."/><DataLoading loading={loading} error={error}>{data && <><section className={`student-hero ${data.waitlist ? 'hero-waitlist' : ''}`}><div>
    <p className="eyebrow light">
      {data.allocation ? 'YOUR HOME AT SMART HOSTEL' : data.waitlist ? `WAITING AREA · QUEUE POSITION #${data.waitlist.queue_position}` : 'YOUR ROOM STATUS'}
    </p>
    <h2>
      {data.allocation
        ? `Floor ${data.allocation.block} · Room ${data.allocation.room_number}`
        : data.waitlist
        ? `Hostel Full · You are #${data.waitlist.queue_position} in Queue`
        : 'Your room is being arranged'}
    </h2>
    <p>
      {data.allocation
        ? `${data.allocation.occupied_beds} of ${data.allocation.capacity} beds are occupied in your room.`
        : data.waitlist
        ? 'All hostel beds are currently filled. You have been placed on the priority waitlist and will be allocated as soon as a bed opens up.'
        : 'The hostel team will notify you once your room is allocated.'}
    </p>
    <button className="btn soft" onClick={()=>navigate('/student/room')}>
      {data.waitlist ? 'View waiting area status' : 'View room details'} <ArrowRight size={16}/>
    </button>
  </div>
  <div className="hero-bed">
    {data.waitlist ? <Clock size={42}/> : <BedDouble size={42}/>}
    <span>
      {data.allocation
        ? `${data.allocation.available_beds} beds open`
        : data.waitlist
        ? `Queue #${data.waitlist.queue_position}`
        : 'Awaiting room'}
    </span>
  </div></section><section className="metric-grid student-metrics"><Metric label="Total fees" value={data.fees.total} icon={CreditCard} money/><Metric label="Amount paid" value={data.fees.paid} icon={WalletCards} tone="lavender" money/><Metric label="Pending fees" value={data.fees.pending} icon={CircleAlert} tone="amber" money/><Metric label="Open complaints" value={Number(data.complaints.pending)+Number(data.complaints.in_progress)} icon={MessageSquarePlus} tone="rose"/></section><section className="student-lower"><section className="mini-status"><header><div><h3>Complaint status</h3><p>A clear view of your service requests</p></div><button onClick={()=>navigate('/student/complaints')}>View all <ArrowRight size={15}/></button></header><div>{[['Pending',data.complaints.pending,'#E7B36A'],['In progress',data.complaints.in_progress,'#A080E4'],['Resolved',data.complaints.resolved,'#5D9F7B']].map(([label,value,color])=><span key={label}><i style={{background:color}}/><b>{value}</b><small>{label}</small></span>)}</div></section><section className="activity-card compact"><header><div><h3>Recent notifications</h3><p>Updates to your hostel account</p></div></header>{data.activities.length ? <ol>{data.activities.map((a,i)=><li key={i}><span className="activity-dot"/><div><b>{a.description}</b><small>{new Date(a.created_at).toLocaleDateString('en-IN',{month:'short',day:'numeric'})}</small></div></li>)}</ol> : <EmptyState title="You’re all set" text="Updates to your account will appear here."/>}</section></section><section className="quick-actions resident-actions"><header><div><p className="eyebrow">WHAT CAN WE HELP WITH?</p><h2>Quick actions</h2></div></header><div>{[[Wifi,'Hostel Wi-Fi','View plan, vouchers & speed','/student/wifi'],[MessageSquarePlus,'Submit a complaint','Tell us what needs attention','/student/complaints?new=1'],[ClipboardPlus,'Give feedback','Share your ideas with us','/student/feedback?new=1'],[CreditCard,'View my fees','Review payments and balances','/student/fees'],[DoorOpen,'View my room','Check your allocation details','/student/room']].map(([Icon,title,text,to])=><button key={title} onClick={()=>navigate(to)}><span><Icon size={21}/></span><div><b>{title}</b><small>{text}</small></div><ArrowRight size={17}/></button>)}</div></section></>}</DataLoading></div>;
}

