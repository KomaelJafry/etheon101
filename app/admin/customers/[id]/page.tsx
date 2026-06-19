'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import Icon from '../../../../components/Icon';
import RippleButton from '../../../../components/RippleButton';
import { EtheonCrystal } from '../../../../components/EtheonBrand';
import { OWNER_ADMIN_EMAIL } from '@/lib/admin-config';

// ── Types ────────────────────────────────────────────────
interface Profile {
  id: string; full_name: string; email: string; role: string;
  eth_balance: number; hashrate_th: number; mining_status: string;
  vip_tier: number | string; is_active: boolean; created_at: string;
  eth_wallet_address?: string;
  subscriptions?: Subscription[];
  transactions?: Transaction[];
}
interface Subscription { id: string; status: string; billing_period: string; current_period_end: string; }
interface Transaction { id: string; type: string; amount_eth: number; amount_usd?: number; status: string; description?: string; created_at: string; }
interface Check { id: string; key: string; label: string; status: 'pending' | 'complete' | 'failed' | 'not_required'; customer_visible: boolean; admin_note?: string; customer_note?: string; updated_at: string; }
interface Note { id: string; note: string; created_by: string; created_at: string; }
interface Message { id: string; title: string; body: string; type: string; is_read: boolean; is_visible: boolean; created_at: string; }
interface Config { miningThreshold: number; withdrawalThreshold: number; }
interface DepositEvent { id: string; stripe_event_id: string; type: string; amount_cents: number; currency: string; status: string; created_at: string; }
interface TimelineEvent { ts: string; type: string; label: string; detail: string; color: string; icon: string; source?: string; }

// ── Helpers ──────────────────────────────────────────────
function initials(name: string) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join('');
}
function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: '8px' }}>
      <div style={{ height: '100%', borderRadius: '999px', background: color, width: `${Math.min(100, pct)}%`, transition: 'width 0.5s ease' }} />
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#7E7A8F', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>{label}</label>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#E9E7F2' }}>{children}</div>
    </div>
  );
}
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ borderRadius: '22px', padding: '22px 24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)', ...style }}>
      {children}
    </div>
  );
}
function SectionTitle({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
      <div style={{ width: '34px', height: '34px', borderRadius: '11px', background: 'rgba(124,92,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={19} color="#9b7bff" />
      </div>
      <div>
        <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '16px' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '12px', color: '#7E7A8F', marginTop: '1px' }}>{subtitle}</div>}
      </div>
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    complete:      { label: 'Complete',     color: '#16D98A', bg: 'rgba(22,217,138,0.14)' },
    pending:       { label: 'Pending',      color: '#FFB55C', bg: 'rgba(255,181,92,0.14)' },
    failed:        { label: 'Failed',       color: '#FF6B8A', bg: 'rgba(255,107,138,0.14)' },
    not_required:  { label: 'Not required', color: '#8A8699', bg: 'rgba(255,255,255,0.06)' },
  };
  const m = map[status] ?? map['pending'];
  return <span style={{ fontSize: '11.5px', fontWeight: 700, color: m.color, background: m.bg, padding: '4px 9px', borderRadius: '999px' }}>{m.label}</span>;
}

// ── Default verification checks ──────────────────────────
const DEFAULT_CHECKS = [
  { key: 'email_verified',          label: 'Email verified',              customer_visible: true  },
  { key: 'subscription_active',     label: 'Subscription active',         customer_visible: true  },
  { key: 'minimum_balance_reached', label: 'Minimum balance reached',     customer_visible: true  },
  { key: 'deposit_configured',      label: 'Deposit address configured',  customer_visible: false },
  { key: 'wallet_configured',       label: 'Withdrawal wallet added',     customer_visible: true  },
  { key: 'withdrawal_threshold',    label: 'Withdrawal threshold reached', customer_visible: true  },
  { key: 'admin_review_complete',   label: 'Admin review complete',       customer_visible: false },
  { key: 'account_not_suspended',   label: 'Account not suspended',       customer_visible: false },
];

// ── Toast ─────────────────────────────────────────────────
function Toast({ msg, type, onDone }: { msg: string; type: 'success' | 'error'; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, padding: '12px 22px', borderRadius: '14px', fontSize: '14px', fontWeight: 700, color: type === 'success' ? '#16D98A' : '#FF6B8A', background: type === 'success' ? 'rgba(22,217,138,0.12)' : 'rgba(255,107,138,0.12)', border: `1px solid ${type === 'success' ? 'rgba(22,217,138,0.35)' : 'rgba(255,107,138,0.35)'}`, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
      {msg}
    </div>
  );
}


// ── Main page ─────────────────────────────────────────────
export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => { document.title = 'Customer Detail | Etheon Admin'; }, []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [deposits, setDeposits] = useState<DepositEvent[]>([]);
  const [config, setConfig] = useState<Config>({ miningThreshold: 100, withdrawalThreshold: 1000 });
  const [ethPrice, setEthPrice] = useState(3000);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'balance' | 'checks' | 'adjustments' | 'messages' | 'notes' | 'deposits' | 'timeline'>('overview');
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Form state
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [adjForm, setAdjForm] = useState({ type: 'credit', amount_eth: '', reason: '', internal_note: '', customer_note: '' });
  const [adjSaving, setAdjSaving] = useState(false);
  const [adjConfirm, setAdjConfirm] = useState(false);
  const [msgForm, setMsgForm] = useState({ title: '', body: '', type: 'info' });
  const [msgSaving, setMsgSaving] = useState(false);
  const [checkEditing, setCheckEditing] = useState<string | null>(null);
  const [checkForm, setCheckForm] = useState<Partial<Check>>({});
  const [depositUpdating, setDepositUpdating] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
  }

  async function updateDepositStatus(depositId: string, status: 'credited' | 'rejected' | 'refunded') {
    setDepositUpdating(depositId);
    try {
      const res = await fetch(`/api/admin/customers/${id}/deposits/${depositId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed');
      setDeposits(prev => prev.map(d => d.id === depositId ? { ...d, status } : d));
      showToast(`Deposit marked as ${status}`, 'success');
    } catch {
      showToast('Failed to update deposit status', 'error');
    } finally {
      setDepositUpdating(null);
    }
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      if ((user.email ?? '').toLowerCase() !== OWNER_ADMIN_EMAIL) {
        setAccessDenied(true); setLoading(false); return;
      }
      const [custRes, priceRes] = await Promise.all([
        fetch(`/api/admin/customers/${id}`),
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd').catch(() => null),
      ]);
      if (!custRes.ok) { router.push('/admin/customers'); return; }
      const json = await custRes.json();
      setProfile(json.profile);
      setChecks(json.checks ?? []);
      setNotes(json.notes ?? []);
      setMessages(json.messages ?? []);
      setDeposits(json.deposits ?? []);
      setConfig(json.config ?? { miningThreshold: 100, withdrawalThreshold: 1000 });
      if (priceRes?.ok) {
        const priceJson = await priceRes.json();
        setEthPrice(priceJson?.ethereum?.usd ?? 3000);
      }
      setLoading(false);
    })();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (accessDenied) return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: "'Manrope',sans-serif" }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'rgba(255,107,138,0.12)', border: '1px solid rgba(255,107,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="lock" size={28} color="#FF6B8A" />
      </div>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '22px', color: '#F5F4FF' }}>Access denied</div>
      <div style={{ fontSize: '13.5px', color: '#7D789E' }}>This area is restricted to the platform owner only.</div>
      <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '11px 22px', borderRadius: '12px', background: 'rgba(155,123,255,0.14)', border: '1px solid rgba(155,123,255,0.3)', color: '#C9BBFF', fontWeight: 700, fontSize: '13.5px', textDecoration: 'none' }}>
        <Icon name="arrow_back" size={16} color="#C9BBFF" />Back to dashboard
      </Link>
    </div>
  );

  const ethBalance = profile?.eth_balance ?? 0;
  const balanceUsd = ethBalance * ethPrice;
  const miningPct = Math.min(100, (balanceUsd / config.miningThreshold) * 100);
  const withdrawalPct = Math.min(100, (balanceUsd / config.withdrawalThreshold) * 100);
  const miningLocked = balanceUsd < config.miningThreshold;
  const withdrawalLocked = balanceUsd < config.withdrawalThreshold;
  const sub = Array.isArray(profile?.subscriptions) ? profile?.subscriptions?.[0] : profile?.subscriptions;

  // ── Actions ──────────────────────────────────────────────
  async function saveNote() {
    if (!newNote.trim()) return;
    setSavingNote(true);
    const res = await fetch(`/api/admin/customers/${id}/notes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: newNote }),
    });
    if (res.ok) {
      const n = await res.json();
      setNotes(prev => [n, ...prev]);
      setNewNote('');
      showToast('Note saved');
    } else {
      showToast('Could not save note', 'error');
    }
    setSavingNote(false);
  }

  async function deleteNote(noteId: string) {
    const res = await fetch(`/api/admin/customers/${id}/notes`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note_id: noteId }),
    });
    if (res.ok) {
      setNotes(prev => prev.filter(n => n.id !== noteId));
      showToast('Note deleted');
    }
  }

  async function saveAdjustment() {
    const amtEth = parseFloat(adjForm.amount_eth);
    if (!amtEth || !adjForm.reason.trim() || !adjForm.internal_note.trim()) {
      showToast('Fill all required fields', 'error'); return;
    }
    setAdjSaving(true);
    const res = await fetch(`/api/admin/customers/${id}/adjustments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: adjForm.type, amount_eth: amtEth,
        reason: adjForm.reason, internal_note: adjForm.internal_note,
        customer_note: adjForm.customer_note || undefined,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setProfile(prev => prev ? { ...prev, eth_balance: json.new_balance } : prev);
      setAdjForm({ type: 'credit', amount_eth: '', reason: '', internal_note: '', customer_note: '' });
      setAdjConfirm(false);
      showToast(`Adjustment applied — new balance: ${json.new_balance.toFixed(6)} ETH`);
    } else {
      showToast(json.error || 'Adjustment failed', 'error');
    }
    setAdjSaving(false);
  }

  async function saveMessage() {
    if (!msgForm.title.trim() || !msgForm.body.trim()) {
      showToast('Title and message are required', 'error'); return;
    }
    setMsgSaving(true);
    const res = await fetch('/api/admin/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: id, title: msgForm.title, body: msgForm.body, type: msgForm.type }),
    });
    if (res.ok) {
      const m = await res.json();
      setMessages(prev => [m, ...prev]);
      setMsgForm({ title: '', body: '', type: 'info' });
      showToast('Message sent to customer');
    } else {
      showToast('Could not send message', 'error');
    }
    setMsgSaving(false);
  }

  async function hideMessage(msgId: string) {
    const res = await fetch('/api/admin/messages', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: msgId }),
    });
    if (res.ok) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_visible: false } : m));
      showToast('Message hidden');
    }
  }

  async function saveCheck() {
    if (!checkEditing || !checkForm.label || !checkForm.status) return;
    const res = await fetch(`/api/admin/customers/${id}/checks`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: checkEditing,
        label: checkForm.label,
        status: checkForm.status,
        customer_visible: checkForm.customer_visible ?? true,
        admin_note: checkForm.admin_note,
        customer_note: checkForm.customer_note,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setChecks(prev => {
        const exists = prev.find(c => c.key === checkEditing);
        if (exists) return prev.map(c => c.key === checkEditing ? updated : c);
        return [...prev, updated];
      });
      setCheckEditing(null);
      showToast('Check updated');
    } else {
      showToast('Could not update check', 'error');
    }
  }

  function startEditCheck(key: string) {
    const existing = checks.find(c => c.key === key);
    const def = DEFAULT_CHECKS.find(d => d.key === key);
    setCheckForm({
      key,
      label: existing?.label ?? def?.label ?? key,
      status: existing?.status ?? 'pending',
      customer_visible: existing?.customer_visible ?? def?.customer_visible ?? true,
      admin_note: existing?.admin_note ?? '',
      customer_note: existing?.customer_note ?? '',
    });
    setCheckEditing(key);
  }

  const pendingDeposits = deposits.filter(d => d.status === 'pending_review').length;

  const TABS = [
    { key: 'overview', icon: 'person', label: 'Overview' },
    { key: 'balance', icon: 'account_balance_wallet', label: 'Balance & Unlock' },
    { key: 'checks', icon: 'checklist', label: 'Verification' },
    { key: 'adjustments', icon: 'tune', label: 'Adjustments' },
    { key: 'deposits', icon: 'payments', label: `Deposits${pendingDeposits > 0 ? ` (${pendingDeposits})` : ''}` },
    { key: 'timeline', icon: 'timeline', label: 'Timeline' },
    { key: 'messages', icon: 'mark_chat_read', label: 'Messages' },
    { key: 'notes', icon: 'sticky_note_2', label: 'Admin notes' },
  ] as const;

  // ── All checks merged with defaults ──────────────────────
  const allChecks = DEFAULT_CHECKS.map(def => ({
    ...def,
    ...checks.find(c => c.key === def.key),
    status: checks.find(c => c.key === def.key)?.status ?? 'pending' as const,
  }));

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B0A14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#6F6B82' }}>
          <div className="skeleton" style={{ width: '200px', height: '20px', borderRadius: '8px', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '13px' }}>Loading customer profile…</div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', color: '#F4F3FA', fontFamily: "'Manrope', system-ui, sans-serif", padding: '28px' }}>
      <div style={{ position: 'fixed', top: '-200px', left: '5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,92,255,0.15),transparent 62%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto' }}>

        {/* Breadcrumb + nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg,#9b7bff,#6e8bff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EtheonCrystal size={18} />
            </div>
            <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '16px' }}>Etheon</span>
            <Icon name="chevron_right" size={18} color="#4A4763" />
            <Link href="/admin/customers" style={{ color: '#7E7A8F', textDecoration: 'none', fontSize: '13.5px', fontWeight: 600 }}>Customers</Link>
            <Icon name="chevron_right" size={18} color="#4A4763" />
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#C9BBFF' }}>{profile.full_name || profile.email}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/admin/customers" style={{ textDecoration: 'none' }}>
              <RippleButton variant="ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '38px', padding: '0 14px', borderRadius: '999px', fontSize: '12.5px', fontWeight: 700, color: '#C9BBFF' }}>
                <Icon name="arrow_back" size={15} color="#C9BBFF" />Back
              </RippleButton>
            </Link>
          </div>
        </div>

        {/* Profile hero */}
        <div style={{ borderRadius: '24px', padding: '24px 28px', background: 'linear-gradient(160deg,rgba(124,92,255,0.12),rgba(255,255,255,0.02) 55%)', border: '1px solid rgba(124,92,255,0.2)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: profile.is_active ? 'linear-gradient(135deg,#3a3550,#252036)' : 'rgba(255,107,138,0.15)', border: `2px solid ${profile.is_active ? 'rgba(124,92,255,0.3)' : 'rgba(255,107,138,0.35)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '20px', color: '#C9BBFF', flexShrink: 0 }}>
            {initials(profile.full_name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '22px', letterSpacing: '-0.02em' }}>{profile.full_name || '—'}</div>
            <div style={{ fontSize: '13px', color: '#8A8699', marginTop: '3px' }}>{profile.email} · ID: <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#5A5673' }}>{profile.id}</span></div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: profile.role, color: profile.role === 'admin' ? '#FFB55C' : '#C9BBFF', bg: profile.role === 'admin' ? 'rgba(255,181,92,0.14)' : 'rgba(124,92,255,0.14)' },
              { label: profile.is_active ? 'Active' : 'Inactive', color: profile.is_active ? '#16D98A' : '#FF6B8A', bg: profile.is_active ? 'rgba(22,217,138,0.12)' : 'rgba(255,107,138,0.12)' },
              { label: sub?.status ? sub.status.charAt(0).toUpperCase() + sub.status.slice(1) : 'No subscription', color: ['active','trialing'].includes(sub?.status ?? '') ? '#16D98A' : '#FFB55C', bg: ['active','trialing'].includes(sub?.status ?? '') ? 'rgba(22,217,138,0.12)' : 'rgba(255,181,92,0.12)' },
            ].map(b => (
              <span key={b.label} style={{ fontSize: '12px', fontWeight: 700, color: b.color, background: b.bg, padding: '5px 12px', borderRadius: '999px' }}>{b.label}</span>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={async () => {
              setActiveTab(t.key as typeof activeTab);
              if (t.key === 'timeline' && timeline.length === 0) {
                setTimelineLoading(true);
                const res = await fetch(`/api/admin/customers/${id}/timeline`);
                if (res.ok) { const j = await res.json(); setTimeline(j.events ?? []); }
                setTimelineLoading(false);
              }
            }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '12px', cursor: 'pointer', fontFamily: "'Manrope'", fontWeight: 700, fontSize: '13px', background: activeTab === t.key ? 'rgba(124,92,255,0.22)' : 'rgba(255,255,255,0.04)', border: `1px solid ${activeTab === t.key ? 'rgba(124,92,255,0.4)' : 'rgba(255,255,255,0.08)'}`, color: activeTab === t.key ? '#C9BBFF' : '#8A8699' }}>
              <Icon name={t.icon} size={16} color={activeTab === t.key ? '#C9BBFF' : '#8A8699'} />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: Overview ─────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Card>
              <SectionTitle icon="person" title="Account details" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Full name">{profile.full_name || '—'}</Field>
                <Field label="Email">{profile.email}</Field>
                <Field label="Role">{profile.role}</Field>
                <Field label="Status">{profile.is_active ? 'Active' : 'Inactive'}</Field>
                <Field label="VIP tier">{typeof profile.vip_tier === 'string' ? profile.vip_tier : `Tier ${profile.vip_tier}`}</Field>
                <Field label="Joined">{fmtDate(profile.created_at)}</Field>
              </div>
            </Card>
            <Card>
              <SectionTitle icon="workspace_premium" title="Subscription" />
              {sub ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field label="Status">{sub.status}</Field>
                  <Field label="Plan">{sub.billing_period ?? '—'}</Field>
                  <Field label="Renews">{sub.current_period_end ? fmtDate(sub.current_period_end) : '—'}</Field>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '28px 0', color: '#6F6B82', fontSize: '13px' }}>
                  <Icon name="workspace_premium" size={32} color="#3A374F" style={{ marginBottom: '8px' }} />
                  <div>No active subscription</div>
                </div>
              )}
            </Card>
            {/* Risk Score Card */}
            {(() => {
              const sub0 = (profile.subscriptions ?? []).find((s: Subscription) => s.status === 'active' || s.status === 'trialing');
              const depCount = deposits.length;
              const creditedDeps = deposits.filter(d => d.status === 'credited').length;
              const hasTx = (profile.transactions ?? []).length > 0;
              const accountAgeDays = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000);
              const checksComplete = checks.filter(c => c.status === 'complete').length;
              const totalChecks = checks.length || DEFAULT_CHECKS.length;
              let score = 0;
              if (profile.is_active) score += 15;
              if (sub0) score += 25;
              if (creditedDeps > 0) score += 20;
              if (hasTx) score += 10;
              if (accountAgeDays > 7) score += 10;
              if (checksComplete >= Math.ceil(totalChecks * 0.5)) score += 10;
              if (profile.eth_balance > 0) score += 10;
              const riskLevel = score >= 70 ? 'Low Risk' : score >= 40 ? 'Medium Risk' : 'High Risk';
              const riskColor = score >= 70 ? '#16D98A' : score >= 40 ? '#FFB55C' : '#FF6B8A';
              const signals = [
                { label: 'Account active',          ok: profile.is_active },
                { label: 'Subscription active',      ok: !!sub0 },
                { label: 'Deposit credited',         ok: creditedDeps > 0 },
                { label: 'Has transactions',         ok: hasTx },
                { label: 'Account age > 7 days',     ok: accountAgeDays > 7 },
                { label: 'Verification ≥ 50%',       ok: checksComplete >= Math.ceil(totalChecks * 0.5) },
                { label: 'ETH balance > 0',          ok: profile.eth_balance > 0 },
              ];
              return (
                <Card style={{ background: `linear-gradient(180deg,${riskColor}0A,transparent)`, borderColor: `${riskColor}30` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <SectionTitle icon="shield" title="Risk Assessment" />
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Space Grotesk'", fontSize: '24px', fontWeight: 700, color: riskColor }}>{score}/100</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: riskColor }}>{riskLevel}</div>
                    </div>
                  </div>
                  <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', marginBottom: '16px' }}>
                    <div style={{ height: '100%', borderRadius: '999px', background: riskColor, width: `${score}%`, transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {signals.map(s => (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: s.ok ? 'rgba(22,217,138,0.15)' : 'rgba(255,107,138,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon name={s.ok ? 'check' : 'close'} size={11} color={s.ok ? '#16D98A' : '#FF6B8A'} />
                        </div>
                        <span style={{ fontSize: '12px', color: s.ok ? '#B6B3D9' : '#7E7A8F' }}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })()}

            <Card style={{ gridColumn: '1/-1' }}>
              <SectionTitle icon="receipt_long" title="Recent transactions" subtitle="Last 10 transactions" />
              {(profile.transactions ?? []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#6F6B82', fontSize: '13px' }}>No transactions yet</div>
              ) : (
                <div>
                  {(profile.transactions ?? []).slice(0, 10).map(tx => (
                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: ['reward','deposit'].includes(tx.type) ? 'rgba(22,217,138,0.12)' : 'rgba(255,107,138,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon name={['reward','deposit'].includes(tx.type) ? 'south_east' : 'north_east'} size={16} color={['reward','deposit'].includes(tx.type) ? '#16D98A' : '#FF6B8A'} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'capitalize' }}>{tx.type}</div>
                          {tx.description && <div style={{ fontSize: '11.5px', color: '#7E7A8F', marginTop: '1px' }}>{tx.description}</div>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '13px', color: ['reward','deposit'].includes(tx.type) ? '#16D98A' : '#FF6B8A' }}>
                          {['reward','deposit'].includes(tx.type) ? '+' : '-'}{tx.amount_eth.toFixed(6)} ETH
                        </div>
                        <div style={{ fontSize: '11px', color: '#6F6B82', marginTop: '1px' }}>{fmtDate(tx.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── TAB: Balance & Unlock ─────────────────────────── */}
        {activeTab === 'balance' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Card style={{ gridColumn: '1/-1' }}>
              <SectionTitle icon="account_balance_wallet" title="Balance overview" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
                {[
                  { label: 'ETH balance', val: `${ethBalance.toFixed(6)} ETH`, sub: `£${balanceUsd.toFixed(2)}`, color: '#16D98A' },
                  { label: 'GBP value', val: `£${balanceUsd.toFixed(2)}`, sub: `@ £${ethPrice.toLocaleString()}/ETH`, color: '#C9BBFF' },
                  { label: 'Mining threshold', val: `£${config.miningThreshold}`, sub: miningLocked ? `£${(config.miningThreshold - balanceUsd).toFixed(2)} remaining` : 'Unlocked', color: '#FFB55C' },
                  { label: 'Withdrawal threshold', val: `£${config.withdrawalThreshold}`, sub: withdrawalLocked ? `£${(config.withdrawalThreshold - balanceUsd).toFixed(2)} remaining` : 'Unlocked', color: '#9b7bff' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '16px 18px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#7E7A8F', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{s.label}</div>
                    <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '18px', color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: '11.5px', color: '#6F6B82', marginTop: '3px' }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <SectionTitle icon="bolt" title="Mining unlock" />
              <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#8A8699' }}>Progress to £{config.miningThreshold}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: miningLocked ? '#FFB55C' : '#16D98A' }}>{miningPct.toFixed(0)}%</span>
              </div>
              <ProgressBar pct={miningPct} color={miningLocked ? '#FFB55C' : '#16D98A'} />
              <div style={{ marginTop: '16px', padding: '13px 15px', borderRadius: '13px', background: miningLocked ? 'rgba(255,181,92,0.08)' : 'rgba(22,217,138,0.08)', border: `1px solid ${miningLocked ? 'rgba(255,181,92,0.2)' : 'rgba(22,217,138,0.2)'}` }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: miningLocked ? '#FFB55C' : '#16D98A' }}>
                  {miningLocked ? `£${(config.miningThreshold - balanceUsd).toFixed(2)} more needed` : 'Mining unlocked'}
                </div>
                <div style={{ fontSize: '12px', color: '#7E7A8F', marginTop: '3px' }}>
                  {miningLocked ? `Balance £${balanceUsd.toFixed(2)} / Threshold £${config.miningThreshold}` : `Balance exceeds £${config.miningThreshold} threshold`}
                </div>
              </div>
            </Card>
            <Card>
              <SectionTitle icon="north_east" title="Withdrawal unlock" />
              <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#8A8699' }}>Progress to £{config.withdrawalThreshold.toLocaleString()}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: withdrawalLocked ? '#FF6B8A' : '#16D98A' }}>{withdrawalPct.toFixed(0)}%</span>
              </div>
              <ProgressBar pct={withdrawalPct} color={withdrawalLocked ? '#FF6B8A' : '#16D98A'} />
              <div style={{ marginTop: '16px', padding: '13px 15px', borderRadius: '13px', background: withdrawalLocked ? 'rgba(255,107,138,0.08)' : 'rgba(22,217,138,0.08)', border: `1px solid ${withdrawalLocked ? 'rgba(255,107,138,0.2)' : 'rgba(22,217,138,0.2)'}` }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: withdrawalLocked ? '#FF6B8A' : '#16D98A' }}>
                  {withdrawalLocked ? `£${(config.withdrawalThreshold - balanceUsd).toFixed(2)} more needed` : 'Withdrawals unlocked'}
                </div>
                <div style={{ fontSize: '12px', color: '#7E7A8F', marginTop: '3px' }}>
                  {withdrawalLocked ? `Balance £${balanceUsd.toFixed(2)} / Threshold £${config.withdrawalThreshold.toLocaleString()}` : `Balance exceeds £${config.withdrawalThreshold.toLocaleString()} threshold`}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── TAB: Verification checks ──────────────────────── */}
        {activeTab === 'checks' && (
          <Card>
            <SectionTitle icon="checklist" title="Verification checklist" subtitle="Admin-managed checks. Customer sees only customer_visible items." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {allChecks.map(chk => (
                <div key={chk.key} style={{ padding: '14px 16px', borderRadius: '15px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${chk.status === 'complete' ? 'rgba(22,217,138,0.2)' : chk.status === 'failed' ? 'rgba(255,107,138,0.2)' : 'rgba(255,255,255,0.07)'}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: chk.status === 'complete' ? 'rgba(22,217,138,0.14)' : chk.status === 'failed' ? 'rgba(255,107,138,0.14)' : 'rgba(255,255,255,0.05)' }}>
                    <Icon name={chk.status === 'complete' ? 'check_circle' : chk.status === 'failed' ? 'cancel' : 'radio_button_unchecked'} size={20} color={chk.status === 'complete' ? '#16D98A' : chk.status === 'failed' ? '#FF6B8A' : '#6F6B82'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{chk.label}</div>
                    <div style={{ fontSize: '11.5px', color: '#6F6B82', marginTop: '2px' }}>
                      Key: <code style={{ fontFamily: 'monospace', color: '#5A5673' }}>{chk.key}</code>
                      {chk.customer_visible ? ' · Customer visible' : ' · Internal only'}
                      {chk.admin_note && ` · Note: ${chk.admin_note}`}
                    </div>
                  </div>
                  <StatusBadge status={chk.status} />
                  <button onClick={() => startEditCheck(chk.key)} style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(124,92,255,0.12)', border: '1px solid rgba(124,92,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="edit" size={15} color="#C9BBFF" />
                  </button>
                </div>
              ))}
            </div>

            {/* Edit check modal */}
            {checkEditing && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setCheckEditing(null); }}>
                <div style={{ width: '100%', maxWidth: '480px', borderRadius: '26px', padding: '26px', background: '#111020', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '17px' }}>Edit check — {checkForm.label}</div>
                    <button onClick={() => setCheckEditing(null)} style={{ width: '32px', height: '32px', borderRadius: '9px', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: '#C5C1D6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="close" size={17} color="#C5C1D6" />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#7E7A8F', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Label</label>
                      <input value={checkForm.label ?? ''} onChange={e => setCheckForm(p => ({ ...p, label: e.target.value }))} style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4F3FA', fontFamily: "'Manrope'", fontSize: '14px', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#7E7A8F', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px' }}>
                        {(['pending','complete','failed','not_required'] as const).map(s => (
                          <button key={s} onClick={() => setCheckForm(p => ({ ...p, status: s }))} style={{ padding: '9px 6px', borderRadius: '10px', cursor: 'pointer', fontFamily: "'Manrope'", fontWeight: 700, fontSize: '11.5px', background: checkForm.status === s ? 'rgba(124,92,255,0.22)' : 'rgba(255,255,255,0.04)', border: `1px solid ${checkForm.status === s ? 'rgba(124,92,255,0.4)' : 'rgba(255,255,255,0.08)'}`, color: checkForm.status === s ? '#C9BBFF' : '#8A8699' }}>
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#7E7A8F', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin note (internal)</label>
                      <input value={checkForm.admin_note ?? ''} onChange={e => setCheckForm(p => ({ ...p, admin_note: e.target.value }))} placeholder="Optional internal note" style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4F3FA', fontFamily: "'Manrope'", fontSize: '14px', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#7E7A8F', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer note (visible)</label>
                      <input value={checkForm.customer_note ?? ''} onChange={e => setCheckForm(p => ({ ...p, customer_note: e.target.value }))} placeholder="Optional customer-facing note" style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4F3FA', fontFamily: "'Manrope'", fontSize: '14px', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="checkbox" id="cv" checked={checkForm.customer_visible ?? true} onChange={e => setCheckForm(p => ({ ...p, customer_visible: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                      <label htmlFor="cv" style={{ fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>Visible to customer</label>
                    </div>
                    <RippleButton variant="purple" onClick={saveCheck} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: '#fff', padding: '13px', borderRadius: '13px', background: '#7C5CFF', marginTop: '4px' }}>
                      <Icon name="save" size={18} color="#fff" />Save check
                    </RippleButton>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ── TAB: Adjustments ──────────────────────────────── */}
        {activeTab === 'adjustments' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Card>
              <SectionTitle icon="tune" title="Balance adjustment" subtitle="Every adjustment is audit-logged with reason and admin ID." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#7E7A8F', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Adjustment type</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
                    {['credit','debit','reward','correction','bonus','manual_review'].map(t => (
                      <button key={t} onClick={() => setAdjForm(p => ({ ...p, type: t }))} style={{ padding: '9px 6px', borderRadius: '10px', cursor: 'pointer', fontFamily: "'Manrope'", fontWeight: 700, fontSize: '11.5px', background: adjForm.type === t ? (t === 'debit' ? 'rgba(255,107,138,0.2)' : 'rgba(22,217,138,0.18)') : 'rgba(255,255,255,0.04)', border: `1px solid ${adjForm.type === t ? (t === 'debit' ? 'rgba(255,107,138,0.4)' : 'rgba(22,217,138,0.3)') : 'rgba(255,255,255,0.08)'}`, color: adjForm.type === t ? (t === 'debit' ? '#FF8DA3' : '#16D98A') : '#8A8699', textTransform: 'capitalize' }}>
                        {t.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#7E7A8F', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount (ETH) <span style={{ color: '#FF6B8A' }}>*</span></label>
                  <input type="number" step="0.0001" min="0.0001" value={adjForm.amount_eth} onChange={e => setAdjForm(p => ({ ...p, amount_eth: e.target.value }))} placeholder="0.0000" style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4F3FA', fontFamily: "'Space Grotesk'", fontSize: '16px', outline: 'none' }} />
                  {adjForm.amount_eth && <div style={{ fontSize: '12px', color: '#7E7A8F', marginTop: '5px' }}>≈ £{(parseFloat(adjForm.amount_eth || '0') * ethPrice).toFixed(2)} GBP at current price</div>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#7E7A8F', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason (audit-logged) <span style={{ color: '#FF6B8A' }}>*</span></label>
                  <input value={adjForm.reason} onChange={e => setAdjForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Manual deposit credit, compensation" style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4F3FA', fontFamily: "'Manrope'", fontSize: '14px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#7E7A8F', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Internal note <span style={{ color: '#FF6B8A' }}>*</span></label>
                  <textarea rows={2} value={adjForm.internal_note} onChange={e => setAdjForm(p => ({ ...p, internal_note: e.target.value }))} placeholder="Why this adjustment was made (private, admin only)" style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4F3FA', fontFamily: "'Manrope'", fontSize: '14px', outline: 'none', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#7E7A8F', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer note (optional, visible in transaction)</label>
                  <input value={adjForm.customer_note} onChange={e => setAdjForm(p => ({ ...p, customer_note: e.target.value }))} placeholder="Optional message shown in customer transaction history" style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4F3FA', fontFamily: "'Manrope'", fontSize: '14px', outline: 'none' }} />
                </div>
                {!adjConfirm ? (
                  <RippleButton variant="ghost" onClick={() => setAdjConfirm(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: '#C9BBFF', padding: '13px', borderRadius: '13px', marginTop: '4px' }}>
                    <Icon name="tune" size={18} color="#C9BBFF" />Review adjustment
                  </RippleButton>
                ) : (
                  <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,181,92,0.08)', border: '1px solid rgba(255,181,92,0.25)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFB55C', marginBottom: '10px' }}>Confirm: {adjForm.type} {adjForm.amount_eth} ETH to {profile.full_name}</div>
                    <div style={{ fontSize: '12.5px', color: '#8A8699', marginBottom: '14px' }}>This action will be permanently audit-logged.</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setAdjConfirm(false)} style={{ flex: 1, padding: '11px', borderRadius: '11px', cursor: 'pointer', fontFamily: "'Manrope'", fontWeight: 700, fontSize: '13px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#8A8699' }}>Cancel</button>
                      <RippleButton variant="purple" onClick={saveAdjustment} disabled={adjSaving} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontSize: '13px', fontWeight: 700, color: '#fff', padding: '11px', borderRadius: '11px', background: adjSaving ? 'rgba(124,92,255,0.5)' : '#7C5CFF' }}>
                        {adjSaving ? 'Applying…' : 'Apply adjustment'}
                      </RippleButton>
                    </div>
                  </div>
                )}
              </div>
            </Card>
            <Card>
              <SectionTitle icon="account_balance_wallet" title="Current balance" />
              <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(22,217,138,0.06)', border: '1px solid rgba(22,217,138,0.15)', textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '32px', color: '#16D98A' }}>{ethBalance.toFixed(6)}</div>
                <div style={{ fontSize: '13px', color: '#7E7A8F', marginTop: '3px' }}>ETH · £{balanceUsd.toFixed(2)} GBP</div>
              </div>
              <div style={{ padding: '14px 16px', borderRadius: '14px', background: 'rgba(255,181,92,0.07)', border: '1px solid rgba(255,181,92,0.2)', fontSize: '12.5px', color: '#C5C1D6', lineHeight: 1.6 }}>
                <Icon name="info" size={15} color="#FFB55C" style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                All adjustments are permanently recorded in the audit log with your admin ID, timestamp, reason, and both old and new balance values.
              </div>
            </Card>
          </div>
        )}

        {/* ── TAB: Deposits ─────────────────────────────────── */}
        {activeTab === 'deposits' && (
          <Card>
            <SectionTitle icon="payments" title="Stripe deposit payments" subtitle="Payments via Stripe checkout that are pending admin review." />
            {deposits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#6F6B82', fontSize: '13px' }}>
                <Icon name="payments" size={32} color="#3A374F" style={{ marginBottom: '8px' }} />
                <div>No deposit payments recorded yet</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {deposits.map(dep => {
                  const isPending = dep.status === 'pending_review';
                  const amountGbp = dep.amount_cents ? (dep.amount_cents / 100).toFixed(2) : '—';
                  const statusColor = isPending ? '#FFB55C' : dep.status === 'credited' ? '#16D98A' : '#8A8699';
                  const statusBg = isPending ? 'rgba(255,181,92,0.12)' : dep.status === 'credited' ? 'rgba(22,217,138,0.12)' : 'rgba(255,255,255,0.06)';
                  return (
                    <div key={dep.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '15px', background: isPending ? 'rgba(255,181,92,0.05)' : 'rgba(255,255,255,0.025)', border: `1px solid ${isPending ? 'rgba(255,181,92,0.22)' : 'rgba(255,255,255,0.07)'}` }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: isPending ? 'rgba(255,181,92,0.14)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name="credit_card" size={20} color={isPending ? '#FFB55C' : '#6F6B82'} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#E9E7F2' }}>
                          £{amountGbp} {(dep.currency ?? 'gbp').toUpperCase()}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#6F6B82', marginTop: '2px' }}>
                          {fmtDate(dep.created_at)} · <code style={{ fontFamily: 'monospace', fontSize: '11px', color: '#4A4763' }}>{dep.stripe_event_id?.slice(0, 24)}…</code>
                        </div>
                      </div>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: statusColor, background: statusBg, padding: '4px 10px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                        {isPending ? 'Pending review' : dep.status.replace(/_/g, ' ')}
                      </span>
                      {isPending && (
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            onClick={() => {
                              setActiveTab('adjustments');
                              setAdjForm(prev => ({
                                ...prev,
                                type: 'credit',
                                amount_eth: '',
                                reason: `Stripe deposit — £${amountGbp} (${dep.stripe_event_id})`,
                                internal_note: `Crediting verified Stripe payment of £${amountGbp}. Event: ${dep.stripe_event_id}`,
                                customer_note: `Your deposit of £${amountGbp} has been credited to your account.`,
                              }));
                            }}
                            style={{ height: '34px', padding: '0 14px', borderRadius: '10px', cursor: 'pointer', fontFamily: "'Manrope'", fontWeight: 700, fontSize: '12.5px', background: 'rgba(22,217,138,0.14)', border: '1px solid rgba(22,217,138,0.3)', color: '#16D98A', whiteSpace: 'nowrap' }}
                          >
                            Credit balance
                          </button>
                          <button
                            disabled={depositUpdating === dep.id}
                            onClick={() => updateDepositStatus(dep.id, 'credited')}
                            style={{ height: '34px', padding: '0 12px', borderRadius: '10px', cursor: depositUpdating === dep.id ? 'default' : 'pointer', fontFamily: "'Manrope'", fontWeight: 700, fontSize: '12px', background: 'rgba(22,217,138,0.08)', border: '1px solid rgba(22,217,138,0.2)', color: '#16D98A', whiteSpace: 'nowrap', opacity: depositUpdating === dep.id ? 0.5 : 1 }}
                            title="Mark this deposit as credited without going through Adjustments"
                          >
                            Mark credited
                          </button>
                          <button
                            disabled={depositUpdating === dep.id}
                            onClick={() => updateDepositStatus(dep.id, 'rejected')}
                            style={{ height: '34px', padding: '0 12px', borderRadius: '10px', cursor: depositUpdating === dep.id ? 'default' : 'pointer', fontFamily: "'Manrope'", fontWeight: 700, fontSize: '12px', background: 'rgba(255,107,138,0.08)', border: '1px solid rgba(255,107,138,0.2)', color: '#FF8DA3', whiteSpace: 'nowrap', opacity: depositUpdating === dep.id ? 0.5 : 1 }}
                            title="Mark this deposit as rejected"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ marginTop: '18px', padding: '13px 15px', borderRadius: '13px', background: 'rgba(255,181,92,0.07)', border: '1px solid rgba(255,181,92,0.18)', fontSize: '12.5px', color: '#C5C1D6', lineHeight: 1.6 }}>
              <Icon name="info" size={15} color="#FFB55C" style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              Clicking &ldquo;Credit balance&rdquo; pre-fills the Adjustments tab with the deposit details. You still need to review and confirm the adjustment there.
            </div>
          </Card>
        )}

        {/* ── TAB: Messages ─────────────────────────────────── */}
        {activeTab === 'messages' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Card>
              <SectionTitle icon="mark_chat_read" title="Send customer message" subtitle="Shown inside the customer's account." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#7E7A8F', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message type</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { val: 'info', label: 'Info', color: '#C9BBFF', bg: 'rgba(124,92,255,0.16)' },
                      { val: 'success', label: 'Success', color: '#16D98A', bg: 'rgba(22,217,138,0.14)' },
                      { val: 'warning', label: 'Warning', color: '#FFB55C', bg: 'rgba(255,181,92,0.14)' },
                      { val: 'error', label: 'Action needed', color: '#FF8DA3', bg: 'rgba(255,107,138,0.14)' },
                    ].map(t => (
                      <button key={t.val} onClick={() => setMsgForm(p => ({ ...p, type: t.val }))} style={{ flex: 1, padding: '9px 8px', borderRadius: '10px', cursor: 'pointer', fontFamily: "'Manrope'", fontWeight: 700, fontSize: '11.5px', background: msgForm.type === t.val ? t.bg : 'rgba(255,255,255,0.04)', border: `1px solid ${msgForm.type === t.val ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'}`, color: msgForm.type === t.val ? t.color : '#7E7A8F' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#7E7A8F', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title <span style={{ color: '#FF6B8A' }}>*</span></label>
                  <input value={msgForm.title} onChange={e => setMsgForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Action required: Add withdrawal wallet" style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4F3FA', fontFamily: "'Manrope'", fontSize: '14px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#7E7A8F', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message <span style={{ color: '#FF6B8A' }}>*</span></label>
                  <textarea rows={4} value={msgForm.body} onChange={e => setMsgForm(p => ({ ...p, body: e.target.value }))} placeholder="Write a clear, professional message to the customer…" style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4F3FA', fontFamily: "'Manrope'", fontSize: '14px', outline: 'none', resize: 'vertical' }} />
                </div>
                <RippleButton variant="purple" onClick={saveMessage} disabled={msgSaving} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: '#fff', padding: '13px', borderRadius: '13px', background: msgSaving ? 'rgba(124,92,255,0.5)' : '#7C5CFF' }}>
                  <Icon name="send" size={18} color="#fff" />{msgSaving ? 'Sending…' : 'Send message'}
                </RippleButton>
              </div>
            </Card>
            <Card>
              <SectionTitle icon="inbox" title="Sent messages" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#6F6B82', fontSize: '13px' }}>
                    <Icon name="mark_chat_read" size={32} color="#3A374F" style={{ marginBottom: '8px' }} />
                    <div>No messages sent yet</div>
                  </div>
                ) : messages.map(m => {
                  const typeColors: Record<string, { color: string; bg: string; border: string }> = {
                    info: { color: '#C9BBFF', bg: 'rgba(124,92,255,0.08)', border: 'rgba(124,92,255,0.2)' },
                    success: { color: '#16D98A', bg: 'rgba(22,217,138,0.08)', border: 'rgba(22,217,138,0.2)' },
                    warning: { color: '#FFB55C', bg: 'rgba(255,181,92,0.08)', border: 'rgba(255,181,92,0.2)' },
                    error: { color: '#FF8DA3', bg: 'rgba(255,107,138,0.08)', border: 'rgba(255,107,138,0.2)' },
                  };
                  const tc = typeColors[m.type] ?? typeColors.info;
                  return (
                    <div key={m.id} style={{ padding: '14px 15px', borderRadius: '14px', background: tc.bg, border: `1px solid ${tc.border}`, opacity: m.is_visible ? 1 : 0.45 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13.5px', fontWeight: 700, color: tc.color }}>{m.title}</div>
                          <div style={{ fontSize: '12.5px', color: '#A39FB5', marginTop: '4px', lineHeight: 1.5 }}>{m.body}</div>
                          <div style={{ fontSize: '11px', color: '#6F6B82', marginTop: '6px' }}>
                            {fmtDate(m.created_at)} · {m.is_read ? 'Read' : 'Unread'} · {m.is_visible ? 'Visible' : 'Hidden'}
                          </div>
                        </div>
                        {m.is_visible && (
                          <button onClick={() => hideMessage(m.id)} style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="visibility_off" size={15} color="#6F6B82" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* ── TAB: Admin notes ──────────────────────────────── */}
        {activeTab === 'notes' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '16px' }}>
            <Card>
              <SectionTitle icon="sticky_note_2" title="Add admin note" subtitle="Private. Never visible to the customer." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <textarea rows={6} value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Write an internal note about this customer… (not visible to customer)" style={{ width: '100%', padding: '13px 15px', borderRadius: '13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4F3FA', fontFamily: "'Manrope'", fontSize: '14px', outline: 'none', resize: 'vertical' }} />
                <RippleButton variant="ghost" onClick={saveNote} disabled={savingNote || !newNote.trim()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: '#C9BBFF', padding: '13px', borderRadius: '13px' }}>
                  <Icon name="save" size={18} color="#C9BBFF" />{savingNote ? 'Saving…' : 'Save note'}
                </RippleButton>
              </div>
            </Card>
            <Card>
              <SectionTitle icon="history" title="Notes history" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#6F6B82', fontSize: '13px' }}>
                    <Icon name="sticky_note_2" size={32} color="#3A374F" style={{ marginBottom: '8px' }} />
                    <div>No admin notes yet</div>
                  </div>
                ) : notes.map(n => (
                  <div key={n.id} style={{ padding: '14px 15px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize: '13.5px', color: '#C5C1D6', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n.note}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                      <div style={{ fontSize: '11px', color: '#6F6B82' }}>{fmtDate(n.created_at)}</div>
                      <button onClick={() => deleteNote(n.id)} style={{ width: '26px', height: '26px', borderRadius: '7px', background: 'rgba(255,107,138,0.1)', border: '1px solid rgba(255,107,138,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="delete" size={14} color="#FF8DA3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── TAB: Timeline ─────────────────────────────────── */}
        {activeTab === 'timeline' && (
          <Card>
            <SectionTitle icon="timeline" title="Customer Journey Timeline" subtitle="Chronological record of every significant event for this customer." />
            {timelineLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: '60px', borderRadius: '12px' }} />)}
              </div>
            ) : timeline.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#6F6B82', fontSize: '13px' }}>
                <Icon name="timeline" size={36} color="#3A374F" style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 700 }}>No events yet</div>
                <div style={{ marginTop: '4px', fontSize: '12px' }}>Events will appear as the customer uses the platform.</div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                {/* Vertical line */}
                <div style={{ position: 'absolute', left: '16px', top: '20px', bottom: '20px', width: '2px', background: 'rgba(255,255,255,0.07)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {timeline.map((ev, i) => (
                    <div key={i} style={{ display: 'flex', gap: '16px', padding: '10px 0', alignItems: 'flex-start', position: 'relative' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: `${ev.color}1A`, border: `2px solid ${ev.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                        <Icon name={ev.icon} size={15} color={ev.color} />
                      </div>
                      <div style={{ flex: 1, paddingTop: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#E9E7F2' }}>{ev.label}</span>
                          {ev.source && <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#6F6B82', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.08)' }}>{ev.source}</span>}
                        </div>
                        {ev.detail && <div style={{ fontSize: '12px', color: '#7E7A8F', marginTop: '2px', lineHeight: 1.5 }}>{ev.detail}</div>}
                        <div style={{ fontSize: '11px', color: '#5A5673', marginTop: '4px' }}>{new Date(ev.ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
