import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, BedDouble, Building2, CalendarDays, Check, CircleAlert, Clock, CreditCard, DoorOpen, Eye, FileText, Pencil, Plus, ShieldAlert, Trash2, UserPlus, UsersRound } from 'lucide-react';
import { del, get, post, put } from '../services/api';
import { ActionButton, ConfirmDialog, EmptyState, Modal, Pagination, SearchFilter, StatusBadge, UserAvatar } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Button, DataLoading, FormActions, FormatMoney, Input, PageHeader, Select, today, useResource } from './shared';

const perPage = 7;
function useModalQuery() { const [params, setParams] = useSearchParams(); const [open, setOpen] = useState(params.get('new') === '1'); const close = () => { setOpen(false); setParams({}); }; return [open, setOpen, close]; }
function ActionMenu({ onView, onEdit, onDelete }) { return <div className="row-actions">{onView && <button onClick={onView} title="View"><Eye size={16}/></button>}{onEdit && <button onClick={onEdit} title="Edit"><Pencil size={16}/></button>}{onDelete && <button className="delete" onClick={onDelete} title="Delete"><Trash2 size={16}/></button>}</div>; }
function TableShell({ children, count, page, setPage }) { return <><div className="table-scroll"><table>{children}</table></div><Pagination count={count} page={page} setPage={setPage} perPage={perPage}/></>; }

function StudentForm({ student, onClose, done }) {
  const [form,setForm] = useState({ fullName:student?.full_name||'',email:student?.email||'',password:'',mobile:student?.mobile_number||'',address:student?.address||'',guardianName:student?.guardian_name||'',guardianContact:student?.guardian_contact||'' }); const [busy,setBusy]=useState(false); const toast=useToast(); const change=e=>setForm({...form,[e.target.name]:e.target.value});
  const submit=async e=>{e.preventDefault();setBusy(true);try{if(student) await put(`/students/${student.student_id}`,form); else await post('/students',form);toast({type:'success',text:student?'Student details updated.':'Student added successfully.'});done();onClose();}catch(err){toast({type:'error',text:err.message});}finally{setBusy(false);}};
  return <form onSubmit={submit} className="modal-body"><div className="form-grid"><Input label="Full name" required name="fullName" value={form.fullName} onChange={change}/><Input label="Email address" required type="email" name="email" value={form.email} onChange={change}/>{!student&&<Input label="Initial password" required type="password" name="password" value={form.password} onChange={change} hint="Minimum 8 characters"/>}<Input label="Mobile number" name="mobile" value={form.mobile} onChange={change}/><label className="form-field span-all"><span>Address</span><textarea name="address" rows="2" value={form.address} onChange={change}/></label><Input label="Guardian name" name="guardianName" value={form.guardianName} onChange={change}/><Input label="Guardian contact" name="guardianContact" value={form.guardianContact} onChange={change}/></div><FormActions onCancel={onClose} submitting={busy} submitText={student?'Save student':'Add student'}/></form>;
}
export function StudentsPage() {
  const [query,setQuery]=useState('');const {data,loading,error,reload}=useResource(`/students?search=${encodeURIComponent(query)}`);const [open,setOpen,close]=useModalQuery();const [edit,setEdit]=useState(null);const [detail,setDetail]=useState(null);const [remove,setRemove]=useState(null);const [busy,setBusy]=useState(false);const toast=useToast();const [page,setPage]=useState(1);const students=data?.students||[];useEffect(()=>setPage(1),[query]);const items=students.slice((page-1)*perPage,page*perPage);
  const destroy=async()=>{setBusy(true);try{await del(`/students/${remove.student_id}`);toast({type:'success',text:'Student removed successfully.'});setRemove(null);reload();}catch(e){toast({type:'error',text:e.message});}finally{setBusy(false);}};
  return <div className="page-content"><PageHeader eyebrow="RESIDENT DIRECTORY" title="Students" description="Manage student records, contact information and room assignment." action={<Button className="primary" icon={UserPlus} onClick={()=>{setEdit(null);setOpen(true)}}>Add student</Button>}/><section className="surface data-surface"><SearchFilter value={query} onChange={setQuery} placeholder="Search name, email or mobile…"/><DataLoading loading={loading&&!data} error={error}>{students.length?<TableShell count={students.length} page={page} setPage={setPage}><thead><tr><th>Student</th><th>Contact</th><th>Room</th><th>Guardian</th><th>Actions</th></tr></thead><tbody>{items.map(s=><tr key={s.student_id}><td><div className="person-cell"><UserAvatar user={s} className="mini-avatar"/><div><b>{s.full_name}</b><small>#{String(s.student_id).padStart(4,'0')}</small></div></div></td><td><span>{s.email}</span><small>{s.mobile_number||'No mobile added'}</small></td><td>{s.room_number?<span className="room-inline">Floor {s.block} · {s.room_number}</span>:<span className="muted">Unallocated</span>}</td><td><span>{s.guardian_name||'—'}</span><small>{s.guardian_contact||''}</small></td><td><ActionMenu onView={()=>setDetail(s)} onEdit={()=>{setEdit(s);setOpen(true)}} onDelete={()=>setRemove(s)}/></td></tr>)}</tbody></TableShell>:<EmptyState icon={UsersRound} title={query ? 'No students found.' : 'No students registered yet.'} text={query ? 'Try adjusting your search criteria.' : 'Add your first student to get started.'} action={!query && <Button className="primary" icon={Plus} onClick={()=>setOpen(true)}>Add student</Button>}/>}</DataLoading></section><Modal open={open} onClose={close} title={edit?'Edit student':'Add a student'} subtitle={edit?'Keep this resident record accurate.':'Create a secure student account and resident profile.'} wide><StudentForm student={edit} onClose={close} done={reload}/></Modal><Modal open={Boolean(detail)} onClose={()=>setDetail(null)} title="Student details" subtitle={detail&&`Student ID #${String(detail.student_id).padStart(4,'0')}`}><div className="detail-body">{detail&&<><div className="profile-banner"><UserAvatar user={detail} className="large-avatar"/><div><h3>{detail.full_name}</h3><p>{detail.email}</p></div></div><dl><div><dt>Mobile</dt><dd>{detail.mobile_number||'Not provided'}</dd></div><div><dt>Room</dt><dd>{detail.room_number?`Floor ${detail.block} · Room ${detail.room_number}`:'Not allocated'}</dd></div><div><dt>Guardian</dt><dd>{detail.guardian_name||'Not provided'}</dd></div><div><dt>Guardian contact</dt><dd>{detail.guardian_contact||'Not provided'}</dd></div><div className="wide"><dt>Address</dt><dd>{detail.address||'Not provided'}</dd></div></dl></>}</div></Modal><ConfirmDialog open={Boolean(remove)} onClose={()=>setRemove(null)} onConfirm={destroy} busy={busy} title="Remove this student?" description={remove?`${remove.full_name}'s account and profile will be permanently removed.`:''}/></div>;
}

function RoomForm({ room, existingRooms = [], onClose, done }) {
  const initialFloor = room?.block ? String(room.block) : '1';
  const fNum = parseInt(initialFloor, 10) || 1;
  const initialRoomNumbers = Array.from({ length: 10 }, (_, i) => String(fNum * 100 + (i + 1)));
  const defaultRoomNumber = room?.room_number || (
    initialRoomNumbers.find(num =>
      !existingRooms.some(er => String(er.block) === initialFloor && String(er.room_number) === num)
    ) || initialRoomNumbers[0]
  );

  const [form, setForm] = useState({
    roomNumber: defaultRoomNumber,
    block: initialFloor,
    capacity: room?.capacity ? Number(room.capacity) : 4
  });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const currentFloorNum = parseInt(form.block, 10) || 1;
  const roomNumbers = Array.from({ length: 10 }, (_, i) => String(currentFloorNum * 100 + (i + 1)));
  if (room?.room_number && !roomNumbers.includes(String(room.room_number))) {
    roomNumbers.unshift(String(room.room_number));
  }

  const handleFloorChange = (newFloor) => {
    const nextFNum = parseInt(newFloor, 10) || 1;
    const nextRoomNumbers = Array.from({ length: 10 }, (_, i) => String(nextFNum * 100 + (i + 1)));
    const nextAvailable = nextRoomNumbers.find(num =>
      !existingRooms.some(er => String(er.block) === String(newFloor) && String(er.room_number) === num && er.room_id !== room?.room_id)
    ) || nextRoomNumbers[0];

    setForm(prev => ({
      ...prev,
      block: newFloor,
      roomNumber: nextAvailable
    }));
  };

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      room ? await put(`/rooms/${room.room_id}`, form) : await post('/rooms', form);
      toast({ type: 'success', text: room ? 'Room updated successfully.' : 'Room added successfully.' });
      done();
      onClose();
    } catch (err) {
      toast({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const occupied = Number(room?.occupied_beds || 0);

  return (
    <form className="modal-body" onSubmit={submit}>
      <div className="form-grid">
        <Select
          label="Floor"
          required
          value={form.block}
          onChange={e => handleFloorChange(e.target.value)}
          hint="Maximum 5 floors (max 10 rooms per floor)"
        >
          <option value="1">Floor 1</option>
          <option value="2">Floor 2</option>
          <option value="3">Floor 3</option>
          <option value="4">Floor 4</option>
          <option value="5">Floor 5</option>
        </Select>

        <Select
          label="Room number"
          required
          value={form.roomNumber}
          onChange={e => setForm({ ...form, roomNumber: e.target.value })}
          hint={`Available rooms for Floor ${form.block} (${currentFloorNum}01 to ${currentFloorNum}10)`}
        >
          {roomNumbers.map(num => {
            const isTaken = existingRooms.some(
              er => String(er.block) === String(form.block) && String(er.room_number) === String(num) && er.room_id !== room?.room_id
            );
            return (
              <option key={num} value={num} disabled={isTaken}>
                Room {num} {isTaken ? '(Already created)' : ''}
              </option>
            );
          })}
        </Select>

        <Select
          label="Capacity"
          required
          value={form.capacity}
          onChange={e => setForm({ ...form, capacity: Number(e.target.value) })}
          hint={room ? `${occupied} bed${occupied === 1 ? '' : 's'} currently occupied` : 'Select room capacity (1 to 4 beds)'}
        >
          <option value={1} disabled={occupied > 1}>1 Bed {occupied > 1 ? `(Min ${occupied} occupied)` : ''}</option>
          <option value={2} disabled={occupied > 2}>2 Beds {occupied > 2 ? `(Min ${occupied} occupied)` : ''}</option>
          <option value={3} disabled={occupied > 3}>3 Beds {occupied > 3 ? `(Min ${occupied} occupied)` : ''}</option>
          <option value={4} disabled={occupied > 4}>4 Beds</option>
        </Select>
      </div>
      <FormActions onCancel={onClose} submitting={busy} submitText={room ? 'Save room' : 'Add room'} />
    </form>
  );
}
function Occupancy({ room }) { return <div className="occupancy"><div>{Array.from({length:Number(room.capacity)},(_,i)=><i className={i<Number(room.occupied_beds)?'filled':''} key={i}/>)}</div><span>{room.occupied_beds} / {room.capacity} occupied</span></div>; }
export function RoomsPage() { const [query,setQuery]=useState('');const [status,setStatus]=useState('');const {data,loading,error,reload}=useResource(`/rooms?search=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}`);const [open,setOpen,close]=useModalQuery();const [edit,setEdit]=useState(null);const [remove,setRemove]=useState(null);const [busy,setBusy]=useState(false);const toast=useToast();const rooms=data?.rooms||[];const destroy=async()=>{setBusy(true);try{await del(`/rooms/${remove.room_id}`);toast({type:'success',text:'Room removed successfully.'});setRemove(null);reload();}catch(e){toast({type:'error',text:e.message});}finally{setBusy(false);}};
  return <div className="page-content"><PageHeader eyebrow="HOSTEL INVENTORY" title="Rooms" description="Track capacity, availability and occupancy at a glance." action={<Button className="primary" icon={Plus} onClick={()=>{setEdit(null);setOpen(true)}}>Add room</Button>}/><section className="surface room-tools"><SearchFilter value={query} onChange={setQuery} placeholder="Search room number or floor…"><select value={status} onChange={e=>setStatus(e.target.value)} aria-label="Filter by status"><option value="">All room status</option><option>Available</option><option>Partially Occupied</option><option>Full</option></select></SearchFilter></section><DataLoading loading={loading&&!data} error={error}>{rooms.length?<section className="room-grid">{rooms.map(room=><article className="room-card" key={room.room_id}><header><span className="room-icon"><DoorOpen size={20}/></span><StatusBadge status={room.room_status}/></header><div><p>Floor {room.block}</p><h2>Room {room.room_number}</h2><span className="capacity">Capacity <b>{room.capacity}</b></span></div><Occupancy room={room}/><footer><span>{room.available_beds} bed{room.available_beds===1?'':'s'} available</span><ActionMenu onEdit={()=>{setEdit(room);setOpen(true)}} onDelete={()=>setRemove(room)}/></footer></article>)}</section>:<section className="surface"><EmptyState icon={DoorOpen} title={query||status?'No matching rooms found.':'No rooms available.'} text={query||status?'Try adjusting your search or status filter.':'Add your first hostel room.'} action={!(query||status)&&<Button className="primary" icon={Plus} onClick={()=>setOpen(true)}>Add room</Button>}/></section>}</DataLoading><Modal open={open} onClose={close} title={edit?'Edit room':'Add a room'} subtitle="Room availability is calculated automatically."><RoomForm room={edit} existingRooms={rooms} onClose={close} done={reload}/></Modal><ConfirmDialog open={Boolean(remove)} onClose={()=>setRemove(null)} onConfirm={destroy} busy={busy} title="Remove this room?" description={remove?`Floor ${remove.block} · Room ${remove.room_number} will be permanently removed.`:''}/></div>; }

function WaitlistAddForm({ onClose, done }) {
  const [form, setForm] = useState({ studentId: '', preferredBlock: '', notes: '' });
  const { data: studentsData, loading: studentsLoading } = useResource('/students?unallocated=true');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await post('/waitlist', form);
      toast({ type: 'success', text: `Student added to waiting area at Queue #${res.queuePosition}.` });
      done();
      onClose();
    } catch (err) {
      toast({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="modal-body" onSubmit={submit}>
      <div className="form-grid">
        <Select
          label="Unallocated Student"
          required
          value={form.studentId}
          onChange={e => setForm({ ...form, studentId: e.target.value })}
          disabled={studentsLoading}
        >
          <option value="">Select a student</option>
          {(studentsData?.students || []).map(s => (
            <option value={s.student_id} key={s.student_id}>
              {s.full_name} · #{String(s.student_id).padStart(4, '0')}
            </option>
          ))}
        </Select>

        <Select
          label="Preferred Floor (optional)"
          value={form.preferredBlock}
          onChange={e => setForm({ ...form, preferredBlock: e.target.value })}
        >
          <option value="">Any available floor</option>
          <option value="Floor 1">Floor 1</option>
          <option value="Floor 2">Floor 2</option>
          <option value="Floor 3">Floor 3</option>
          <option value="Floor 4">Floor 4</option>
          <option value="Floor 5">Floor 5</option>
        </Select>

        <div className="span-all">
          <label className="form-field">
            <span>Special notes / priority reason</span>
            <textarea
              rows="3"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Outstation student, urgent accommodation needed…"
            />
          </label>
        </div>
      </div>
      <FormActions onCancel={onClose} submitting={busy} submitText="Add to Waiting Area" />
    </form>
  );
}

function AllocationForm({ onClose, done, preselectedStudent = null }) {
  const [form, setForm] = useState({
    studentId: preselectedStudent?.student_id || '',
    roomId: '',
    allocationDate: today()
  });
  const [selectedFloor, setSelectedFloor] = useState('');
  const { data: studentsData, loading: studentsLoading } = useResource('/students?unallocated=true');
  const { data: roomsData, loading: roomsLoading } = useResource('/rooms');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const rooms = (roomsData?.rooms || []).filter(r => Number(r.available_beds) > 0);
  const filteredRooms = rooms.filter(r => !selectedFloor || String(r.block) === String(selectedFloor));
  const selected = rooms.find(r => String(r.room_id) === String(form.roomId));

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      await post('/allocations', form);
      toast({ type: 'success', text: 'Room allocated and availability updated.' });
      done();
      onClose();
    } catch (err) {
      toast({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const studentList = studentsData?.students || [];
  const hasPreselected = Boolean(preselectedStudent);

  return (
    <form className="modal-body" onSubmit={submit}>
      <div className="allocation-flow">
        <span>1</span><p>{hasPreselected ? `Student: ${preselectedStudent.full_name}` : 'Choose an unallocated student'}</p>
        <span>2</span><p>Choose an available room</p>
        <span>3</span><p>Confirm allocation</p>
      </div>
      <div className="form-grid">
        {hasPreselected ? (
          <div className="form-field">
            <span>Student</span>
            <input type="text" readOnly value={`${preselectedStudent.full_name} · Queue #${preselectedStudent.queue_position || 'Active'}`} />
          </div>
        ) : (
          <Select label="Student" required value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} disabled={studentsLoading}>
            <option value="">Select a student</option>
            {studentList.map(s => (
              <option value={s.student_id} key={s.student_id}>{s.full_name} · #{String(s.student_id).padStart(4, '0')}</option>
            ))}
          </Select>
        )}
        <Select
          label="Floor"
          value={selectedFloor}
          onChange={e => {
            const nextFloor = e.target.value;
            setSelectedFloor(nextFloor);
            if (form.roomId) {
              const currentRoom = rooms.find(r => String(r.room_id) === String(form.roomId));
              if (currentRoom && nextFloor && String(currentRoom.block) !== String(nextFloor)) {
                setForm(prev => ({ ...prev, roomId: '' }));
              }
            }
          }}
          hint="Filter available rooms by floor"
        >
          <option value="">All floors (1 to 5)</option>
          <option value="1">Floor 1 (Rooms 101–110)</option>
          <option value="2">Floor 2 (Rooms 201–210)</option>
          <option value="3">Floor 3 (Rooms 301–310)</option>
          <option value="4">Floor 4 (Rooms 401–410)</option>
          <option value="5">Floor 5 (Rooms 501–510)</option>
        </Select>
        <Select label="Available room" required value={form.roomId} onChange={e => setForm({ ...form, roomId: e.target.value })} disabled={roomsLoading}>
          <option value="">Select a room</option>
          {filteredRooms.map(r => (
            <option value={r.room_id} key={r.room_id}>
              Floor {r.block} · Room {r.room_number} — {r.available_beds} of {r.capacity} beds open
            </option>
          ))}
        </Select>
        <Input label="Allocation date" required type="date" value={form.allocationDate} onChange={e => setForm({ ...form, allocationDate: e.target.value })} />
      </div>
      {selected && (
        <div className="allocation-preview">
          <BedDouble size={24} />
          <div>
            <b>Floor {selected.block} · Room {selected.room_number}</b>
            <span>{selected.available_beds} of {selected.capacity} beds available · <StatusBadge status={selected.room_status} /></span>
          </div>
        </div>
      )}
      {!rooms.length && (
        <div className="hostel-full-callout">
          <AlertTriangle size={18} />
          <span>No beds currently available. Students must remain in the Waiting Area until a resident vacates or a new room is added.</span>
        </div>
      )}
      <FormActions onCancel={onClose} submitting={busy} submitText="Confirm allocation" />
    </form>
  );
}

export function AllocationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'waiting' ? 'waiting' : 'allocations';

  const { data: allocData, loading: allocLoading, error: allocError, reload: reloadAlloc } = useResource('/allocations');
  const { data: waitData, loading: waitLoading, error: waitError, reload: reloadWait } = useResource('/waitlist?status=All');

  const [open, setOpen] = useState(searchParams.get('new') === '1');
  const [openWaitlistAdd, setOpenWaitlistAdd] = useState(false);
  const [allocateStudent, setAllocateStudent] = useState(null);
  const [removeAlloc, setRemoveAlloc] = useState(null);
  const [removeWait, setRemoveWait] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const allocations = allocData?.allocations || [];
  const waitlist = waitData?.waitlist || [];
  const summary = waitData?.summary || {
    waitingCount: 0,
    totalCapacity: 0,
    totalOccupied: 0,
    totalAvailable: 0,
    isHostelFull: false
  };

  const reloadAll = () => {
    reloadAlloc();
    reloadWait();
  };

  const closeAllocModal = () => {
    setOpen(false);
    setAllocateStudent(null);
    setSearchParams(activeTab === 'waiting' ? { tab: 'waiting' } : {});
  };

  const destroyAllocation = async () => {
    setBusy(true);
    try {
      await del(`/allocations/${removeAlloc.allocation_id}`);
      toast({ type: 'success', text: 'Allocation vacated; bed availability updated.' });
      setRemoveAlloc(null);
      reloadAll();
    } catch (e) {
      toast({ type: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const destroyWaitlist = async () => {
    setBusy(true);
    try {
      await del(`/waitlist/${removeWait.waitlist_id}`);
      toast({ type: 'success', text: 'Student removed from waiting list.' });
      setRemoveWait(null);
      reloadWait();
    } catch (e) {
      toast({ type: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const loading = activeTab === 'allocations' ? allocLoading : waitLoading;
  const error = activeTab === 'allocations' ? allocError : waitError;

  return (
    <div className="page-content">
      <PageHeader
        eyebrow="BED ASSIGNMENTS & QUEUE"
        title="Room allocation"
        description="Manage active bed assignments and transparent waiting lists when capacity is reached."
        action={
          <div className="header-action-group">
            {activeTab === 'allocations' ? (
              <Button className="primary" icon={Plus} onClick={() => { setAllocateStudent(null); setOpen(true); }}>
                Allocate room
              </Button>
            ) : (
              <Button className="primary" icon={UserPlus} onClick={() => setOpenWaitlistAdd(true)}>
                Add to waiting queue
              </Button>
            )}
          </div>
        }
      />

      {summary.isHostelFull && (
        <section className="hostel-full-banner">
          <span className="banner-icon-bubble"><AlertTriangle size={20} /></span>
          <div>
            <strong>Hostel Full · 100% Bed Capacity Reached ({summary.totalOccupied}/{summary.totalCapacity} beds occupied)</strong>
            <p>All hostel beds are currently filled. New student applicants are routed to the Waiting Area until a bed is vacated.</p>
          </div>
          {summary.waitingCount > 0 && (
            <span className="banner-badge">{summary.waitingCount} Waiting</span>
          )}
        </section>
      )}

      <nav className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'allocations' ? 'active' : ''}`}
          onClick={() => setSearchParams({})}
        >
          <BedDouble size={16} />
          <span>Active Allocations</span>
          <span className="tab-count">{allocations.filter(a => a.status === 'Active').length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'waiting' ? 'active' : ''}`}
          onClick={() => setSearchParams({ tab: 'waiting' })}
        >
          <Clock size={16} />
          <span>Waiting Area / Queue</span>
          <span className={`tab-count ${summary.waitingCount > 0 ? 'tab-count-amber' : ''}`}>
            {summary.waitingCount}
          </span>
        </button>
      </nav>

      <DataLoading loading={loading} error={error}>
        {activeTab === 'allocations' ? (
          allocations.length ? (
            <section className="surface data-surface">
              <div className="allocation-summary">
                <span><b>{allocations.filter(a => a.status === 'Active').length}</b> active allocations</span>
                <span><b>{allocations.filter(a => a.status === 'Vacated').length}</b> vacated history records</span>
                <span><b>{summary.totalAvailable}</b> beds open across hostel</span>
              </div>
              <TableShell count={allocations.length} page={1} setPage={() => {}}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Room</th>
                    <th>Allocated</th>
                    <th>Occupancy</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {allocations.map(a => (
                    <tr key={a.allocation_id}>
                      <td>
                        <b>{a.full_name}</b>
                        <small>Student #{String(a.student_id).padStart(4, '0')}</small>
                      </td>
                      <td><span className="room-inline">Floor {a.block} · {a.room_number}</span></td>
                      <td>{new Date(a.allocation_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                      <td>{a.occupied_beds}/{a.capacity} beds</td>
                      <td><StatusBadge status={a.status} /></td>
                      <td>
                        {a.status === 'Active' && (
                          <button className="text-danger" onClick={() => setRemoveAlloc(a)}>Vacate</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </section>
          ) : (
            <section className="surface">
              <EmptyState
                icon={BedDouble}
                title="No room allocations yet."
                text="Choose a student and an available room to get started."
                action={<Button className="primary" icon={Plus} onClick={() => { setAllocateStudent(null); setOpen(true); }}>Allocate room</Button>}
              />
            </section>
          )
        ) : (
          waitlist.length ? (
            <section className="surface data-surface">
              <div className="allocation-summary">
                <span><b>{summary.waitingCount}</b> students waiting in queue</span>
                <span><b>{summary.totalAvailable}</b> bed{summary.totalAvailable === 1 ? '' : 's'} available</span>
                <span>Capacity: <b>{summary.totalOccupied}/{summary.totalCapacity}</b></span>
              </div>
              <TableShell count={waitlist.length} page={1} setPage={() => {}}>
                <thead>
                  <tr>
                    <th>Queue #</th>
                    <th>Student</th>
                    <th>Contact</th>
                    <th>Preferred Floor</th>
                    <th>Joined Queue</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.map(w => (
                    <tr key={w.waitlist_id}>
                      <td>
                        {w.status === 'Waiting' ? (
                          <span className="waitlist-queue-badge">
                            #{w.queue_position}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <b>{w.full_name}</b>
                        <small>#{String(w.student_id).padStart(4, '0')} {w.notes ? `· ${w.notes}` : ''}</small>
                      </td>
                      <td>
                        <span>{w.email}</span>
                        <small>{w.mobile_number || 'No mobile'}</small>
                      </td>
                      <td>{w.preferred_block ? <span className="room-inline">{w.preferred_block}</span> : <span className="text-muted">Any floor</span>}</td>
                      <td>{new Date(w.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                      <td><StatusBadge status={w.status} /></td>
                      <td>
                        <div className="row-actions">
                          {w.status === 'Waiting' && (
                            <button
                              className="btn-table-action"
                              disabled={summary.totalAvailable <= 0}
                              title={summary.totalAvailable <= 0 ? 'Hostel is full - no beds available' : 'Allocate room bed'}
                              onClick={() => {
                                setAllocateStudent(w);
                                setOpen(true);
                              }}
                            >
                              <BedDouble size={14} /> Allocate
                            </button>
                          )}
                          <button
                            className="text-danger"
                            title="Remove from waitlist"
                            onClick={() => setRemoveWait(w)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </section>
          ) : (
            <section className="surface">
              <EmptyState
                icon={Clock}
                title="Waiting area is clear."
                text="No students are currently waiting for a bed in the hostel."
                action={<Button className="primary" icon={UserPlus} onClick={() => setOpenWaitlistAdd(true)}>Add student to queue</Button>}
              />
            </section>
          )
        )}
      </DataLoading>

      <Modal open={open} onClose={closeAllocModal} title="Allocate a room" subtitle={allocateStudent ? `Allocating from waiting area for ${allocateStudent.full_name}` : 'Room occupancy updates safely when you confirm.'} wide>
        <AllocationForm onClose={closeAllocModal} done={reloadAll} preselectedStudent={allocateStudent} />
      </Modal>

      <Modal open={openWaitlistAdd} onClose={() => setOpenWaitlistAdd(false)} title="Add student to waiting area" subtitle="Place an unallocated student into the waiting queue.">
        <WaitlistAddForm onClose={() => setOpenWaitlistAdd(false)} done={reloadWait} />
      </Modal>

      <ConfirmDialog
        open={Boolean(removeAlloc)}
        onClose={() => setRemoveAlloc(null)}
        onConfirm={destroyAllocation}
        busy={busy}
        title="Vacate this allocation?"
        description={removeAlloc ? `${removeAlloc.full_name} will be removed from Floor ${removeAlloc.block} · Room ${removeAlloc.room_number}, releasing one bed.` : ''}
      />

      <ConfirmDialog
        open={Boolean(removeWait)}
        onClose={() => setRemoveWait(null)}
        onConfirm={destroyWaitlist}
        busy={busy}
        title="Remove from waiting area?"
        description={removeWait ? `${removeWait.full_name} will be removed from the hostel waiting queue.` : ''}
      />
    </div>
  );
}

function FeeForm({ fee, onClose, done }) {
  const { data: studentsData } = useResource('/students');
  const [form, setForm] = useState({
    studentId: fee?.student_id || '',
    feeAmount: fee?.fee_amount || '',
    penaltyAmount: fee?.penalty_amount !== undefined ? fee?.penalty_amount : '0',
    penaltyReason: fee?.penalty_reason || '',
    dueDate: fee?.due_date || '',
    paymentStatus: fee?.payment_status || 'Pending',
    paymentDate: fee?.payment_date || today(),
    paymentMethod: fee?.payment_method || 'Online',
    description: fee?.description || 'Semester hostel fee'
  });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const baseAmt = Math.max(0, Number(form.feeAmount) || 0);
  const penaltyAmt = Math.max(0, Number(form.penaltyAmount) || 0);
  const totalAmt = baseAmt + penaltyAmt;

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      fee ? await put(`/fees/${fee.fee_id}`, form) : await post('/fees', form);
      toast({ type: 'success', text: fee ? 'Fee record updated.' : 'Fee record saved.' });
      done();
      onClose();
    } catch (err) {
      toast({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="modal-body" onSubmit={submit}>
      <div className="form-grid">
        <Select label="Student" required value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}>
          <option value="">Select a student</option>
          {(studentsData?.students || []).map(s => (
            <option key={s.student_id} value={s.student_id}>{s.full_name}</option>
          ))}
        </Select>

        <Input label="Base fee amount (₹)" required type="number" min="1" step="any" value={form.feeAmount} onChange={e => setForm({ ...form, feeAmount: e.target.value })} />

        <Input label="Payment due date" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />

        <Select label="Payment status" required value={form.paymentStatus} onChange={e => setForm({ ...form, paymentStatus: e.target.value })}>
          <option>Pending</option>
          <option>Paid</option>
        </Select>

        <Input label="Penalty / Fine amount (₹)" type="number" min="0" step="any" value={form.penaltyAmount} onChange={e => setForm({ ...form, penaltyAmount: e.target.value })} placeholder="0" />

        <Input label="Penalty reason" value={form.penaltyReason} onChange={e => setForm({ ...form, penaltyReason: e.target.value })} placeholder="e.g. Late payment fine, Room inventory damages" />

        {form.paymentStatus === 'Paid' && (
          <>
            <Input label="Payment date" required type="date" value={form.paymentDate} onChange={e => setForm({ ...form, paymentDate: e.target.value })} />
            <Select label="Payment method" required value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
              <option>Online</option>
              <option>Cash</option>
            </Select>
          </>
        )}

        <div className="span-all">
          <Input label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Semester hostel fee" />
        </div>

        <div className="span-all fee-calc-preview">
          <div className="fee-calc-details">
            <span className="fee-calc-item">Base fee: <strong>₹{baseAmt.toLocaleString('en-IN')}</strong></span>
            <span className="fee-calc-plus">+</span>
            <span className="fee-calc-item">Penalty: <strong className={penaltyAmt > 0 ? 'text-amber' : ''}>₹{penaltyAmt.toLocaleString('en-IN')}</strong></span>
            <span className="fee-calc-equals">=</span>
            <span className="fee-calc-total">Total payable: <strong>₹{totalAmt.toLocaleString('en-IN')}</strong></span>
          </div>
          {penaltyAmt > 0 && form.penaltyReason && (
            <small className="fee-calc-reason">Penalty applied for: {form.penaltyReason}</small>
          )}
        </div>
      </div>
      <FormActions onCancel={onClose} submitting={busy} submitText={fee ? 'Save fee' : 'Record fee'} />
    </form>
  );
}

export function FeesPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useResource(`/fees?search=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}`);
  const [open, setOpen, close] = useModalQuery();
  const [edit, setEdit] = useState(null);
  const [remove, setRemove] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const fees = data?.fees || [];

  const totals = useMemo(() => ({
    collected: fees.filter(f => f.payment_status === 'Paid').reduce((s, f) => s + Number(f.total_amount || (Number(f.fee_amount) + Number(f.penalty_amount || 0))), 0),
    pending: fees.filter(f => f.payment_status === 'Pending').reduce((s, f) => s + Number(f.total_amount || (Number(f.fee_amount) + Number(f.penalty_amount || 0))), 0),
    penalties: fees.reduce((s, f) => s + Number(f.penalty_amount || 0), 0),
    paidCount: fees.filter(f => f.payment_status === 'Paid').length
  }), [fees]);

  const destroy = async () => {
    setBusy(true);
    try {
      await del(`/fees/${remove.fee_id}`);
      toast({ type: 'success', text: 'Fee record deleted.' });
      setRemove(null);
      reload();
    } catch (e) {
      toast({ type: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const isOverdue = (f) => {
    if (f.payment_status !== 'Pending' || !f.due_date) return false;
    return new Date(f.due_date) < new Date(today());
  };

  return (
    <div className="page-content">
      <PageHeader eyebrow="PAYMENT LEDGER" title="Fees" description="Record payments, manage penalties, and keep balances transparent." action={<Button className="primary" icon={Plus} onClick={() => { setEdit(null); setOpen(true); }}>Record fee</Button>} />
      <section className="ledger-overview">
        <span>
          <CreditCard size={20} />
          <div>
            <small>Collected</small>
            <b><FormatMoney value={totals.collected} /></b>
          </div>
        </span>
        <span>
          <CircleAlert size={20} />
          <div>
            <small>Pending</small>
            <b><FormatMoney value={totals.pending} /></b>
          </div>
        </span>
        <span>
          <ShieldAlert size={20} />
          <div>
            <small>Total penalties</small>
            <b className={totals.penalties > 0 ? 'text-amber' : ''}><FormatMoney value={totals.penalties} /></b>
          </div>
        </span>
        <span>
          <UsersRound size={20} />
          <div>
            <small>Paid records</small>
            <b>{totals.paidCount}</b>
          </div>
        </span>
      </section>

      <section className="surface data-surface">
        <SearchFilter value={query} onChange={setQuery} placeholder="Search by student name…">
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All payment status</option>
            <option>Paid</option>
            <option>Pending</option>
          </select>
        </SearchFilter>

        <DataLoading loading={loading && !data} error={error}>
          {fees.length ? (
            <TableShell count={fees.length} page={1} setPage={() => {}}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Base Fee</th>
                  <th>Penalty</th>
                  <th>Total Payable</th>
                  <th>Due Date</th>
                  <th>Date & Method</th>
                  <th>Status</th>
                  <th>Actions</th>
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
                        <b>{f.full_name}</b>
                        <small>{f.description || 'Hostel fee'} · #{String(f.fee_id).padStart(4, '0')}</small>
                      </td>
                      <td className="money">
                        <FormatMoney value={f.fee_amount} />
                      </td>
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
                      <td className="money">
                        <strong className="fee-total-highlight"><FormatMoney value={total} /></strong>
                      </td>
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
                      <td>
                        <span>{f.payment_date ? new Date(f.payment_date).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}</span>
                        <small>{f.payment_method || 'Awaiting payment'}</small>
                      </td>
                      <td>
                        <StatusBadge status={f.payment_status} />
                      </td>
                      <td>
                        <ActionMenu onEdit={() => { setEdit(f); setOpen(true); }} onDelete={() => setRemove(f)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
          ) : (
            <EmptyState icon={CreditCard} title={query || status ? "No matching fee records found." : "No fee records yet."} text={query || status ? "Try adjusting your search or status filter." : "Record a payment, pending balance, or penalty to get started."} action={!(query || status) && <Button className="primary" icon={Plus} onClick={() => setOpen(true)}>Record fee</Button>} />
          )}
        </DataLoading>
      </section>

      <Modal open={open} onClose={close} title={edit ? 'Edit fee record' : 'Record a fee'} subtitle="Base amounts and penalties feed straight into student ledgers." wide>
        <FeeForm fee={edit} onClose={close} done={reload} />
      </Modal>

      <ConfirmDialog open={Boolean(remove)} onClose={() => setRemove(null)} onConfirm={destroy} busy={busy} title="Delete this fee record?" />
    </div>
  );
}
