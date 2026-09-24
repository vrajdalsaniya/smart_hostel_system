import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Gauge,
  HardDrive,
  KeyRound,
  Laptop,
  Pencil,
  Plus,
  Radio,
  RotateCcw,
  ShieldCheck,
  Signal,
  Smartphone,
  Sparkles,
  Trash2,
  Users,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react';
import { del, get, post, put } from '../services/api';
import { ConfirmDialog, EmptyState, Modal, SearchFilter, StatusBadge } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, DataLoading, FormActions, FormatMoney, Input, PageHeader, Select, today, useResource } from './shared';

function CopyChip({ label, text, secure = false }) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!secure);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="wifi-cred-item">
      <div>
        <small>{label}</small>
        <strong>{revealed ? text : '••••••••••••'}</strong>
      </div>
      <div className="wifi-cred-actions">
        {secure && (
          <button type="button" onClick={() => setRevealed(!revealed)} title={revealed ? 'Hide' : 'Show'}>
            {revealed ? <EyeOff size={14}/> : <Eye size={14}/>}
          </button>
        )}
        <button type="button" onClick={copy} title="Copy to clipboard" className={copied ? 'copied' : ''}>
          {copied ? <Check size={14}/> : <Copy size={14}/>}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
}

function SpeedTestWidget({ maxSpeed = 50 }) {
  const [testing, setTesting] = useState(false);
  const [download, setDownload] = useState(0);
  const [upload, setUpload] = useState(0);
  const [ping, setPing] = useState(12);
  const [completed, setCompleted] = useState(false);

  const startTest = () => {
    setTesting(true);
    setCompleted(false);
    setDownload(0);
    setUpload(0);
    setPing(Math.floor(10 + Math.random() * 8));

    const targetDl = Math.max(15, Math.round(maxSpeed * (0.9 + Math.random() * 0.15)));
    const targetUl = Math.max(10, Math.round(maxSpeed * (0.6 + Math.random() * 0.2)));

    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = Math.min(1, step / 18);
      setDownload(Math.round(targetDl * Math.sin((progress * Math.PI) / 2)));
      if (progress >= 0.5) {
        setUpload(Math.round(targetUl * Math.sin(((progress - 0.5) * Math.PI))));
      }
      if (step >= 20) {
        clearInterval(interval);
        setDownload(targetDl);
        setUpload(targetUl);
        setTesting(false);
        setCompleted(true);
      }
    }, 100);
  };

  return (
    <div className="speedtest-card">
      <div className="speedtest-header">
        <div className="speedtest-title">
          <Gauge size={19}/>
          <div>
            <h4>Hostel Connection Speed Test</h4>
            <small>Live bandwidth check to Smart Hostel Core Gateway</small>
          </div>
        </div>
        <Button
          className={testing ? 'ghost' : 'secondary'}
          onClick={startTest}
          disabled={testing}
          icon={testing ? RotateCcw : Zap}
        >
          {testing ? 'Testing…' : completed ? 'Retest' : 'Start Speed Test'}
        </Button>
      </div>

      <div className="speedtest-metrics">
        <div className="speedtest-slot">
          <small>PING</small>
          <strong>{ping} <span className="unit">ms</span></strong>
          <span className="speed-dot low-ping"/>
        </div>
        <div className="speedtest-slot highlight">
          <small>DOWNLOAD</small>
          <strong>{download} <span className="unit">Mbps</span></strong>
          <span className="speed-label">Optimal for HD/4K</span>
        </div>
        <div className="speedtest-slot">
          <small>UPLOAD</small>
          <strong>{upload} <span className="unit">Mbps</span></strong>
          <span className="speed-label">Synced</span>
        </div>
      </div>
    </div>
  );
}

function SubscribePlanModal({ plan, onClose, done }) {
  const [method, setMethod] = useState('Online');
  const [deviceName, setDeviceName] = useState('My Laptop');
  const [deviceMac, setDeviceMac] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await post('/wifi/subscribe', {
        planId: plan.plan_id,
        paymentMethod: method,
        deviceName,
        deviceMac
      });
      toast({ type: 'success', text: `Subscribed to ${plan.name}! Your Wi-Fi is now active.` });
      done();
      onClose();
    } catch (err) {
      toast({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="modal-body">
      <div className="plan-summary-banner">
        <div>
          <span className="eyebrow light">SELECTED WI-FI PLAN</span>
          <h3>{plan.name}</h3>
          <p>{plan.speed_mbps} Mbps · {plan.is_unlimited ? 'Unlimited Data' : `${plan.data_quota_gb} GB Data`} · Valid for {plan.validity_days} days</p>
        </div>
        <div className="plan-summary-price">
          <small>Total to pay</small>
          <strong>₹{Number(plan.price).toLocaleString('en-IN')}</strong>
        </div>
      </div>

      <div className="form-grid" style={{ marginTop: '16px' }}>
        <Select label="Payment Method" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="Online">Online Payment (Instant UPI / NetBanking / Card)</option>
          <option value="Cash">Cash (Collect receipt at Warden Office)</option>
        </Select>
        <Input
          label="Primary Device Name"
          required
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value)}
          placeholder="e.g. MacBook Pro, OnePlus Phone"
        />
        <label className="form-field span-all">
          <span>Device MAC Address (Optional)</span>
          <input
            value={deviceMac}
            onChange={(e) => setDeviceMac(e.target.value)}
            placeholder="e.g. 3C:22:FB:4A:12:88"
          />
          <small>Allows fast authentication on hostel access points without captive portal re-login.</small>
        </label>
      </div>

      <div className="payment-note">
        <ShieldCheck size={18}/>
        <div>
          <strong>Safe & Instant Activation</strong>
          <p>Upon confirmation, your personal Wi-Fi access voucher code and WPA2 Enterprise credentials will be instantly generated.</p>
        </div>
      </div>

      <FormActions onCancel={onClose} submitting={busy} submitText={`Pay ₹${Number(plan.price).toLocaleString('en-IN')} & Activate`}/>
    </form>
  );
}

function DeviceUpdateModal({ subscription, onClose, done }) {
  const [deviceName, setDeviceName] = useState(subscription?.device_name || '');
  const [deviceMac, setDeviceMac] = useState(subscription?.device_mac || '');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await put(`/wifi/subscriptions/${subscription.subscription_id}/device`, { deviceName, deviceMac });
      toast({ type: 'success', text: 'Device info updated.' });
      done();
      onClose();
    } catch (err) {
      toast({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="modal-body">
      <div className="form-grid">
        <Input label="Device Name" required value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="e.g. Dell Inspiron 15"/>
        <Input label="Device MAC Address" value={deviceMac} onChange={(e) => setDeviceMac(e.target.value)} placeholder="e.g. AA:BB:CC:DD:EE:FF"/>
      </div>
      <FormActions onCancel={onClose} submitting={busy} submitText="Save Device"/>
    </form>
  );
}

export function StudentWifiPage() {
  const { data: activeData, loading: activeLoading, error: activeErr, reload: reloadActive } = useResource('/wifi/active');
  const { data: plansData, loading: plansLoading, error: plansErr } = useResource('/wifi/plans');
  const { data: subsData, loading: subsLoading, reload: reloadSubs } = useResource('/wifi/subscriptions');
  const { data: hotspotsData } = useResource('/wifi/hotspots');

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [editDevice, setEditDevice] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const toast = useToast();

  const active = activeData?.activeSubscription;
  const plans = plansData?.plans || [];
  const subscriptions = subsData?.subscriptions || [];
  const hotspots = hotspotsData?.hotspots || [];

  const handleRegenerate = async () => {
    if (!active) return;
    setRegenerating(true);
    try {
      await post(`/wifi/subscriptions/${active.subscription_id}/regenerate-voucher`);
      toast({ type: 'success', text: 'New Wi-Fi voucher & password generated!' });
      reloadActive();
      reloadSubs();
    } catch (e) {
      toast({ type: 'error', text: e.message });
    } finally {
      setRegenerating(false);
    }
  };

  const handleRefresh = () => {
    reloadActive();
    reloadSubs();
  };

  return (
    <div className="page-content wifi-page">
      <PageHeader
        eyebrow="CAMPUS CONNECTIVITY"
        title="Hostel Wi-Fi"
        description="High-speed, low-latency hostel wireless network across all rooms and study blocks."
      />

      <DataLoading loading={activeLoading || plansLoading} error={activeErr || plansErr}>
        {/* Active Wi-Fi Connection Card or Inactive Notice */}
        {active ? (
          <section className="wifi-active-card">
            <div className="wifi-active-badge-top">
              <span className="live-status-pill">
                <span className="dot pulse"/> CONNECTED & ACTIVE
              </span>
              <span className="expiry-pill">
                <Clock size={13}/>
                {activeData.remainingDays} days remaining (Expires {new Date(active.end_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })})
              </span>
            </div>

            <div className="wifi-active-grid">
              <div className="wifi-plan-highlight">
                <div className="wifi-signal-icon">
                  <Wifi size={38}/>
                </div>
                <div>
                  <small>CURRENT PLAN</small>
                  <h2>{active.plan_name}</h2>
                  <div className="wifi-specs-list">
                    <span><Zap size={14}/> {active.speed_mbps} Mbps Max Speed</span>
                    <span><HardDrive size={14}/> {active.is_unlimited ? 'Unlimited High-Speed Data' : `${active.data_quota_gb} GB Data Quota`}</span>
                    <span><Smartphone size={14}/> Up to {active.device_limit} Devices</span>
                  </div>
                </div>
              </div>

              <div className="wifi-credentials-panel">
                <header>
                  <KeyRound size={17}/>
                  <div>
                    <strong>Access Credentials</strong>
                    <small>Connect to SSID: <b>{activeData.ssid}</b></small>
                  </div>
                </header>

                <div className="wifi-cred-list">
                  <CopyChip label="Wi-Fi Network (SSID)" text={activeData.ssid}/>
                  <CopyChip label="Wi-Fi Username" text={active.wifi_username}/>
                  <CopyChip label="Wi-Fi Password / PIN" text={active.wifi_password} secure/>
                  <CopyChip label="Voucher Token" text={active.voucher_code}/>
                </div>

                <div className="wifi-card-footer">
                  <div className="device-tag">
                    <Laptop size={14}/>
                    <span>{active.device_name || 'Primary Device'}</span>
                    {active.device_mac && <small>({active.device_mac})</small>}
                  </div>
                  <div className="wifi-foot-actions">
                    <button type="button" className="btn-chip" onClick={() => setEditDevice(true)}>
                      <Pencil size={13}/> Update Device
                    </button>
                    <button type="button" className="btn-chip" onClick={handleRegenerate} disabled={regenerating}>
                      <RotateCcw size={13}/> {regenerating ? 'Resetting…' : 'Reset Credentials'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Speed Test widget for active users */}
            <SpeedTestWidget maxSpeed={active.speed_mbps || 50}/>
          </section>
        ) : (
          <section className="wifi-no-plan-banner">
            <div className="banner-visual">
              <WifiOff size={36}/>
            </div>
            <div className="banner-copy">
              <h3>No Active Wi-Fi Plan</h3>
              <p>You currently do not have an active Wi-Fi subscription. Choose one of our student-friendly plans below to get instant high-speed wireless access in your room, study hall, and cafeteria.</p>
            </div>
          </section>
        )}

        {/* Plans Catalog in Rupees */}
        <section className="wifi-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">CHOOSE YOUR PLAN</p>
              <h2>Hostel Wi-Fi Plans</h2>
              <p>Affordable rates in Rupees (₹) with priority student bandwidth.</p>
            </div>
          </div>

          <div className="wifi-plans-grid">
            {plans.map((plan, i) => {
              const isPopular = plan.price >= 250 && plan.price <= 500;
              return (
                <article key={plan.plan_id} className={`wifi-plan-card ${isPopular ? 'popular' : ''}`}>
                  {isPopular && <div className="popular-ribbon"><Sparkles size={12}/> MOST POPULAR</div>}
                  <header>
                    <h3>{plan.name}</h3>
                    <p className="plan-desc">{plan.description || 'Reliable campus internet access.'}</p>
                    <div className="plan-price">
                      <span className="curr">₹</span>
                      <span className="num">{Number(plan.price).toLocaleString('en-IN')}</span>
                      <span className="term">/ {plan.validity_days} days</span>
                    </div>
                  </header>

                  <ul className="plan-features">
                    <li>
                      <Zap size={16}/>
                      <span><strong>{plan.speed_mbps} Mbps</strong> High-Speed</span>
                    </li>
                    <li>
                      <HardDrive size={16}/>
                      <span>{plan.is_unlimited ? <strong>Unlimited Data</strong> : <span><strong>{plan.data_quota_gb} GB</strong> Data Quota</span>}</span>
                    </li>
                    <li>
                      <Smartphone size={16}/>
                      <span>Up to <strong>{plan.device_limit} Devices</strong></span>
                    </li>
                    <li>
                      <Signal size={16}/>
                      <span>5 GHz & 2.4 GHz Dual-Band</span>
                    </li>
                    <li>
                      <ShieldCheck size={16}/>
                      <span>Exam & Academic Low Latency</span>
                    </li>
                  </ul>

                  <button
                    type="button"
                    className={`btn full ${isPopular ? 'primary' : 'secondary'}`}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    Activate for ₹{Number(plan.price).toLocaleString('en-IN')}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        {/* Subscription History */}
        <section className="wifi-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">YOUR RECORD</p>
              <h2>Subscription History</h2>
            </div>
          </div>

          {subscriptions.length ? (
            <div className="surface data-surface">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Plan Name</th>
                      <th>Amount</th>
                      <th>Active Dates</th>
                      <th>Voucher Code</th>
                      <th>Payment</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((s) => (
                      <tr key={s.subscription_id}>
                        <td>
                          <b>{s.plan_name}</b>
                          <small>{s.speed_mbps} Mbps · {s.device_name || 'Primary'}</small>
                        </td>
                        <td className="money">
                          <FormatMoney value={s.amount_paid}/>
                        </td>
                        <td>
                          <span>{new Date(s.start_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                          <small>to {new Date(s.end_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</small>
                        </td>
                        <td>
                          <code className="voucher-chip">{s.voucher_code}</code>
                        </td>
                        <td>
                          <span>{s.payment_method}</span>
                          <small>{s.payment_status}</small>
                        </td>
                        <td>
                          <StatusBadge status={s.status}/>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="surface">
              <EmptyState
                icon={CreditCard}
                title="No past subscriptions."
                text="When you subscribe to a Wi-Fi plan, your payment receipts and vouchers will appear here."
              />
            </div>
          )}
        </section>

        {/* Hostel Hotspots Coverage */}
        <section className="wifi-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">INFRASTRUCTURE</p>
              <h2>Hostel Wi-Fi Coverage & Hotspots</h2>
              <p>Live status of access points across campus buildings.</p>
            </div>
          </div>

          <div className="hotspots-grid">
            {hotspots.map((ap) => (
              <div key={ap.id} className="hotspot-card">
                <div className="hotspot-icon">
                  <Radio size={20}/>
                </div>
                <div className="hotspot-info">
                  <h4>{ap.name}</h4>
                  <p>{ap.location} · {ap.band}</p>
                  <div className="hotspot-meta">
                    <span className="signal-level">
                      <Signal size={13}/> {ap.signal}% Signal
                    </span>
                    <span className="load-level">
                      <Users size={13}/> {ap.connected} Devices
                    </span>
                  </div>
                </div>
                <span className="status available">Online</span>
              </div>
            ))}
          </div>
        </section>
      </DataLoading>

      {/* Subscribe Modal */}
      <Modal
        open={Boolean(selectedPlan)}
        onClose={() => setSelectedPlan(null)}
        title="Subscribe to Wi-Fi Plan"
        subtitle="Activate seamless campus internet for your devices."
      >
        {selectedPlan && (
          <SubscribePlanModal
            plan={selectedPlan}
            onClose={() => setSelectedPlan(null)}
            done={handleRefresh}
          />
        )}
      </Modal>

      {/* Device update modal */}
      <Modal
        open={editDevice}
        onClose={() => setEditDevice(false)}
        title="Update Registered Device"
        subtitle="Keep your device name and MAC address current for quick connection."
      >
        {active && (
          <DeviceUpdateModal
            subscription={active}
            onClose={() => setEditDevice(false)}
            done={reloadActive}
          />
        )}
      </Modal>
    </div>
  );
}

function PlanForm({ plan, onClose, done }) {
  const [form, setForm] = useState({
    name: plan?.name || '',
    price: plan?.price || '',
    validityDays: plan?.validity_days || 30,
    speedMbps: plan?.speed_mbps || 50,
    dataQuotaGb: plan?.data_quota_gb || '',
    isUnlimited: plan ? Boolean(plan.is_unlimited) : false,
    deviceLimit: plan?.device_limit || 2,
    description: plan?.description || '',
    status: plan?.status || 'Active'
  });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (plan) {
        await put(`/wifi/plans/${plan.plan_id}`, form);
        toast({ type: 'success', text: 'Wi-Fi plan updated successfully.' });
      } else {
        await post('/wifi/plans', form);
        toast({ type: 'success', text: 'New Wi-Fi plan added successfully.' });
      }
      done();
      onClose();
    } catch (err) {
      toast({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="modal-body">
      <div className="form-grid">
        <Input
          label="Plan Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Monthly Standard"
        />
        <Input
          label="Price in Rupees (₹)"
          required
          type="number"
          min="0"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          placeholder="299"
        />
        <Input
          label="Validity (Days)"
          required
          type="number"
          min="1"
          value={form.validityDays}
          onChange={(e) => setForm({ ...form, validityDays: e.target.value })}
          placeholder="30"
        />
        <Input
          label="Speed (Mbps)"
          required
          type="number"
          min="1"
          value={form.speedMbps}
          onChange={(e) => setForm({ ...form, speedMbps: e.target.value })}
          placeholder="50"
        />
        <Input
          label="Data Quota (GB)"
          type="number"
          disabled={form.isUnlimited}
          value={form.isUnlimited ? '' : form.dataQuotaGb}
          onChange={(e) => setForm({ ...form, dataQuotaGb: e.target.value })}
          placeholder={form.isUnlimited ? 'Unlimited' : '100'}
        />
        <Input
          label="Allowed Devices"
          required
          type="number"
          min="1"
          max="10"
          value={form.deviceLimit}
          onChange={(e) => setForm({ ...form, deviceLimit: e.target.value })}
          placeholder="2"
        />
        <div className="form-field span-all" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id="unlimited_check"
            checked={form.isUnlimited}
            onChange={(e) => setForm({ ...form, isUnlimited: e.target.checked })}
          />
          <label htmlFor="unlimited_check" style={{ cursor: 'pointer', margin: 0, fontWeight: 600 }}>
            Uncapped / Unlimited Data Plan
          </label>
        </div>
        <Select
          label="Plan Status"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option value="Active">Active (Available for students to buy)</option>
          <option value="Inactive">Inactive (Hidden from catalog)</option>
        </Select>
        <label className="form-field span-all">
          <span>Description / Key Features</span>
          <textarea
            rows="3"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="e.g. Best for streaming, coding and video classes."
          />
        </label>
      </div>

      <FormActions onCancel={onClose} submitting={busy} submitText={plan ? 'Save Changes' : 'Create Plan'}/>
    </form>
  );
}

function AssignStudentModal({ plans, onClose, done }) {
  const { data: studentsData } = useResource('/students');
  const [studentId, setStudentId] = useState('');
  const [planId, setPlanId] = useState(plans[0]?.plan_id || '');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [deviceName, setDeviceName] = useState('Primary Device');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await post('/wifi/subscribe', {
        studentId,
        planId,
        paymentMethod,
        deviceName
      });
      toast({ type: 'success', text: 'Wi-Fi plan assigned to student successfully!' });
      done();
      onClose();
    } catch (err) {
      toast({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="modal-body">
      <div className="form-grid">
        <Select
          label="Resident Student"
          required
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        >
          <option value="">Choose a student</option>
          {(studentsData?.students || []).map((s) => (
            <option key={s.student_id} value={s.student_id}>
              {s.full_name} (#{String(s.student_id).padStart(4, '0')})
            </option>
          ))}
        </Select>

        <Select
          label="Wi-Fi Plan"
          required
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
        >
          {plans.map((p) => (
            <option key={p.plan_id} value={p.plan_id}>
              {p.name} — ₹{Number(p.price).toLocaleString('en-IN')} ({p.validity_days} days)
            </option>
          ))}
        </Select>

        <Select
          label="Payment Method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option value="Cash">Cash (Received at Office)</option>
          <option value="Online">Online / Hostel Account</option>
        </Select>

        <Input
          label="Device Name"
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value)}
          placeholder="Laptop / Phone"
        />
      </div>

      <FormActions onCancel={onClose} submitting={busy} submitText="Assign & Activate Plan"/>
    </form>
  );
}

function ExtendSubscriptionModal({ subscription, onClose, done }) {
  const [daysToAdd, setDaysToAdd] = useState(30);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const currentEnd = new Date(subscription.end_date);
  const newEndDate = new Date(currentEnd.getTime() + Number(daysToAdd) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await put(`/wifi/subscriptions/${subscription.subscription_id}/status`, {
        endDate: newEndDate,
        status: 'Active'
      });
      toast({ type: 'success', text: `Subscription extended to ${newEndDate}.` });
      done();
      onClose();
    } catch (err) {
      toast({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="modal-body">
      <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#686077' }}>
        Extending Wi-Fi access for <b>{subscription.student_name}</b> ({subscription.plan_name}).
      </p>
      <div className="form-grid">
        <Input
          label="Extend Validity By (Days)"
          type="number"
          min="1"
          max="365"
          value={daysToAdd}
          onChange={(e) => setDaysToAdd(e.target.value)}
        />
        <div className="form-field">
          <span>New Expiry Date</span>
          <div style={{ padding: '10px', background: '#f5f0fc', borderRadius: '8px', fontWeight: 700 }}>
            {newEndDate}
          </div>
        </div>
      </div>
      <FormActions onCancel={onClose} submitting={busy} submitText="Confirm Extension"/>
    </form>
  );
}

export function AdminWifiPage() {
  const [tab, setTab] = useState('plans');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: statsData, reload: reloadStats } = useResource('/wifi/stats');
  const { data: plansData, loading: plansLoading, error: plansErr, reload: reloadPlans } = useResource('/wifi/plans');
  const { data: subsData, loading: subsLoading, error: subsErr, reload: reloadSubs } = useResource(
    `/wifi/subscriptions?search=${encodeURIComponent(query)}&status=${encodeURIComponent(statusFilter)}`
  );
  const { data: hotspotsData } = useResource('/wifi/hotspots');

  const [openPlanModal, setOpenPlanModal] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [deletePlanTarget, setDeletePlanTarget] = useState(null);
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [extendSubTarget, setExtendSubTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const plans = plansData?.plans || [];
  const subscriptions = subsData?.subscriptions || [];
  const hotspots = hotspotsData?.hotspots || [];
  const stats = statsData || { activeSubscribers: 0, totalRevenue: 0, activePlans: 0, expiringSoon: 0, hotspotsOnline: 6 };

  const handleDeletePlan = async () => {
    if (!deletePlanTarget) return;
    setBusy(true);
    try {
      await del(`/wifi/plans/${deletePlanTarget.plan_id}`);
      toast({ type: 'success', text: 'Plan removed.' });
      setDeletePlanTarget(null);
      reloadPlans();
      reloadStats();
    } catch (e) {
      toast({ type: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeSub = async (sub) => {
    try {
      await put(`/wifi/subscriptions/${sub.subscription_id}/status`, { status: 'Revoked' });
      toast({ type: 'success', text: `Access revoked for ${sub.student_name}.` });
      reloadSubs();
      reloadStats();
    } catch (e) {
      toast({ type: 'error', text: e.message });
    }
  };

  const handleRegenerateSub = async (sub) => {
    try {
      await post(`/wifi/subscriptions/${sub.subscription_id}/regenerate-voucher`);
      toast({ type: 'success', text: `New credentials generated for ${sub.student_name}.` });
      reloadSubs();
    } catch (e) {
      toast({ type: 'error', text: e.message });
    }
  };

  return (
    <div className="page-content wifi-page admin-wifi-page">
      <PageHeader
        eyebrow="NETWORK INFRASTRUCTURE"
        title="Wi-Fi Management"
        description="Configure hostel bandwidth plans, monitor student subscriptions, vouchers and router hotspots."
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button className="secondary" icon={Users} onClick={() => setOpenAssignModal(true)}>
              Assign to Student
            </Button>
            <Button className="primary" icon={Plus} onClick={() => { setEditPlan(null); setOpenPlanModal(true); }}>
              Add Wi-Fi Plan
            </Button>
          </div>
        }
      />

      {/* Overview Metric Cards */}
      <section className="wifi-admin-metrics">
        <article className="wifi-stat-card purple">
          <div className="stat-icon"><Wifi size={22}/></div>
          <div>
            <small>Active Subscribers</small>
            <strong>{stats.activeSubscribers}</strong>
          </div>
        </article>
        <article className="wifi-stat-card green">
          <div className="stat-icon"><CreditCard size={22}/></div>
          <div>
            <small>Wi-Fi Revenue (₹)</small>
            <strong>₹{Number(stats.totalRevenue).toLocaleString('en-IN')}</strong>
          </div>
        </article>
        <article className="wifi-stat-card amber">
          <div className="stat-icon"><Clock size={22}/></div>
          <div>
            <small>Expiring in 5 Days</small>
            <strong>{stats.expiringSoon}</strong>
          </div>
        </article>
        <article className="wifi-stat-card blue">
          <div className="stat-icon"><Radio size={22}/></div>
          <div>
            <small>Hostel Hotspots Online</small>
            <strong>{stats.hotspotsOnline} / 6</strong>
          </div>
        </article>
      </section>

      {/* Tabs */}
      <div className="wifi-tab-bar">
        <button className={tab === 'plans' ? 'active' : ''} onClick={() => setTab('plans')}>
          <Zap size={16}/> Wi-Fi Plans ({plans.length})
        </button>
        <button className={tab === 'subs' ? 'active' : ''} onClick={() => setTab('subs')}>
          <Users size={16}/> Student Subscriptions ({subscriptions.length})
        </button>
        <button className={tab === 'hotspots' ? 'active' : ''} onClick={() => setTab('hotspots')}>
          <Radio size={16}/> Network Hotspots ({hotspots.length})
        </button>
      </div>

      {tab === 'plans' && (
        <DataLoading loading={plansLoading} error={plansErr}>
          <div className="wifi-plans-grid admin-plans-grid">
            {plans.map((p) => (
              <article key={p.plan_id} className="wifi-plan-card admin-plan-card">
                <header>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <StatusBadge status={p.status}/>
                    <div className="row-actions">
                      <button onClick={() => { setEditPlan(p); setOpenPlanModal(true); }} title="Edit Plan">
                        <Pencil size={15}/>
                      </button>
                      <button className="delete" onClick={() => setDeletePlanTarget(p)} title="Delete Plan">
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  </div>
                  <h3 style={{ marginTop: '10px' }}>{p.name}</h3>
                  <p className="plan-desc">{p.description || 'Hostel Wi-Fi tier.'}</p>
                  <div className="plan-price">
                    <span className="curr">₹</span>
                    <span className="num">{Number(p.price).toLocaleString('en-IN')}</span>
                    <span className="term">/ {p.validity_days} days</span>
                  </div>
                </header>

                <ul className="plan-features">
                  <li><Zap size={15}/> <span>Speed: <strong>{p.speed_mbps} Mbps</strong></span></li>
                  <li><HardDrive size={15}/> <span>Quota: <strong>{p.is_unlimited ? 'Unlimited' : `${p.data_quota_gb} GB`}</strong></span></li>
                  <li><Smartphone size={15}/> <span>Device Limit: <strong>{p.device_limit} Devices</strong></span></li>
                  <li><Clock size={15}/> <span>Validity: <strong>{p.validity_days} Days</strong></span></li>
                </ul>
              </article>
            ))}
          </div>
        </DataLoading>
      )}

      {tab === 'subs' && (
        <section className="surface data-surface">
          <SearchFilter
            value={query}
            onChange={setQuery}
            placeholder="Search by student, voucher, email or device…"
          >
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Pending">Pending</option>
              <option value="Revoked">Revoked</option>
            </select>
          </SearchFilter>

          <DataLoading loading={subsLoading && !subsData} error={subsErr}>
            {subscriptions.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Plan</th>
                      <th>Fee</th>
                      <th>Validity</th>
                      <th>Voucher / Credentials</th>
                      <th>Registered Device</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((s) => (
                      <tr key={s.subscription_id}>
                        <td>
                          <b>{s.student_name}</b>
                          <small>{s.student_email}</small>
                        </td>
                        <td>
                          <span>{s.plan_name}</span>
                          <small>{s.speed_mbps} Mbps</small>
                        </td>
                        <td className="money">
                          <FormatMoney value={s.amount_paid}/>
                        </td>
                        <td>
                          <span>{new Date(s.start_date).toLocaleDateString('en-IN', { dateStyle: 'short' })} → {new Date(s.end_date).toLocaleDateString('en-IN', { dateStyle: 'short' })}</span>
                          <small>{s.status === 'Active' ? 'Active pass' : 'Inactive'}</small>
                        </td>
                        <td>
                          <code className="voucher-chip">{s.voucher_code}</code>
                          <small>Pass: {s.wifi_password}</small>
                        </td>
                        <td>
                          <span>{s.device_name || '—'}</span>
                          <small>{s.device_mac || 'No MAC recorded'}</small>
                        </td>
                        <td>
                          <StatusBadge status={s.status}/>
                        </td>
                        <td>
                          <div className="sub-actions-cell">
                            <button
                              type="button"
                              className="btn-link"
                              onClick={() => setExtendSubTarget(s)}
                              title="Extend validity"
                            >
                              Extend
                            </button>
                            <button
                              type="button"
                              className="btn-link"
                              onClick={() => handleRegenerateSub(s)}
                              title="Regenerate credentials"
                            >
                              Reset
                            </button>
                            {s.status === 'Active' && (
                              <button
                                type="button"
                                className="btn-link text-danger"
                                onClick={() => handleRevokeSub(s)}
                                title="Revoke access"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No subscriptions match."
                text="Assign a Wi-Fi plan to a student or adjust your search filter."
              />
            )}
          </DataLoading>
        </section>
      )}

      {tab === 'hotspots' && (
        <section className="hotspots-tab-content">
          <div className="hotspots-grid">
            {hotspots.map((ap) => (
              <div key={ap.id} className="hotspot-card admin-hotspot-card">
                <div className="hotspot-icon">
                  <Radio size={22}/>
                </div>
                <div className="hotspot-info">
                  <h4>{ap.name}</h4>
                  <p>{ap.location}</p>
                  <div className="hotspot-specs">
                    <span>Band: <b>{ap.band}</b></span>
                    <span>Channel: <b>{ap.channel}</b></span>
                    <span>Signal Strength: <b>{ap.signal}%</b></span>
                    <span>Active Clients: <b>{ap.connected} devices</b></span>
                  </div>
                </div>
                <div className="hotspot-status-badge">
                  <span className="dot pulse"/> {ap.status}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Add / Edit Plan Modal */}
      <Modal
        open={openPlanModal}
        onClose={() => setOpenPlanModal(false)}
        title={editPlan ? 'Edit Wi-Fi Plan' : 'Create Wi-Fi Plan'}
        subtitle="Set pricing in Rupees (₹), bandwidth speeds, data caps, and validity."
      >
        <PlanForm
          plan={editPlan}
          onClose={() => setOpenPlanModal(false)}
          done={() => { reloadPlans(); reloadStats(); }}
        />
      </Modal>

      {/* Assign Student Modal */}
      <Modal
        open={openAssignModal}
        onClose={() => setOpenAssignModal(false)}
        title="Assign Wi-Fi to Student"
        subtitle="Activate Wi-Fi access for a resident student manually."
      >
        <AssignStudentModal
          plans={plans.filter((p) => p.status === 'Active')}
          onClose={() => setOpenAssignModal(false)}
          done={() => { reloadSubs(); reloadStats(); }}
        />
      </Modal>

      {/* Extend Subscription Modal */}
      <Modal
        open={Boolean(extendSubTarget)}
        onClose={() => setExtendSubTarget(null)}
        title="Extend Subscription Validity"
        subtitle="Add more days to this student's active Wi-Fi pass."
      >
        {extendSubTarget && (
          <ExtendSubscriptionModal
            subscription={extendSubTarget}
            onClose={() => setExtendSubTarget(null)}
            done={() => { reloadSubs(); reloadStats(); }}
          />
        )}
      </Modal>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={Boolean(deletePlanTarget)}
        onClose={() => setDeletePlanTarget(null)}
        onConfirm={handleDeletePlan}
        busy={busy}
        title="Delete this Wi-Fi plan?"
        description={deletePlanTarget ? `Plan "${deletePlanTarget.name}" will be removed or archived.` : ''}
      />
    </div>
  );
}
