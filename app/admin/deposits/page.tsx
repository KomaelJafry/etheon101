'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Icon from '../../../components/Icon';
import RippleButton from '../../../components/RippleButton';
import { OWNER_ADMIN_EMAIL } from '@/lib/admin-config';

interface Deposit {
  id: string;
  stripe_event_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  user_id: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  profiles: { id: string; full_name: string; email: string; eth_balance: number; is_active: boolean } | null;
}

const STATUS_TABS = [
  { key: 'pending_review', label: 'Pending',  color: '#FFB55C' },
  { key: 'credited',       label: 'Credited', color: '#16D98A' },
  { key: 'rejected',       label: 'Rejected', color: '#FF6B8A' },
  { key: 'refunded',       label: 'Refunded', color: '#8A8699' },
  { key: 'all',            label: 'All',      color: '#9b7bff' },
];

function fmtGbp(pence: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}
function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function depositAge(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function initials(name: string) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending_review: { label: 'Pending review', color: '#FFB55C', bg: 'rgba(255,181,92,0.15)' },
    credited:       { label: 'Credited',        color: '#16D98A', bg: 'rgba(22,217,138,0.14)' },
    rejected:       { label: 'Rejected',         color: '#FF6B8A', bg: 'rgba(255,107,138,0.14)' },
    refunded:       { label: 'Refunded',         color: '#8A8699', bg: 'rgba(255,255,255,0.08)' },
  };
  const m = map[status] ?? { label: status, color: '#8A8699', bg: 'rgba(255,255,255,0.06)' };
  return <span style={{ fontSize: '11px', fontWeight: 700, color: m.color, background: m.bg, padding: '3px 9px', borderRadius: '999px', whiteSpace: 'nowrap' }}>{m.label}</span>;
}

// ── Review Drawer ────────────────────────────────────────────
function ReviewDrawer({ deposit, onClose, onAction }: {
  deposit: Deposit;
  onClose: () => void;
  onAction: (id: string, status: 'credited' | 'rejected' | 'refunded') => Promise<void>;
}) {
  const [confirming, setConfirming] = useState<'credited' | 'rejected' | 'refunded' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [noteErr, setNoteErr] = useState('');

  const isPending  = deposit.status === 'pending_review';
  const isTerminal = ['credited', 'rejected', 'refunded'].includes(deposit.status);

  async function confirm() {
    if (!confirming) return;
    if (!note.trim()) { setNoteErr('An admin note is required before actioning this deposit.'); return; }
    setBusy(true);
    await onAction(deposit.id, confirming);
    setBusy(false);
    setConfirming(null);
    setNote('');
    onClose();
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 200, width: 'min(520px, 95vw)', background: '#0F0E1E', borderLeft: '1px solid rgba(255,255,255,0.09)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '18px' }}>Deposit Review</div>
            <div style={{ fontSize: '12px', color: '#7E7A8F', marginTop: '2px' }}>ID: {deposit.id.slice(0, 16)}…</div>
          </div>
          <button onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: '#C5C1D6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={18} color="#C5C1D6" />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Amount */}
          <div style={{ borderRadius: '18px', padding: '20px 22px', background: 'linear-gradient(135deg,rgba(155,123,255,0.14),rgba(110,139,255,0.08))', border: '1px solid rgba(155,123,255,0.25)', marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: '#8A8699', marginBottom: '4px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Deposit Amount</div>
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: '32px', fontWeight: 700, color: '#F4F3FA' }}>{fmtGbp(deposit.amount_cents)}</div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
              <StatusBadge status={deposit.status} />
              <span style={{ fontSize: '12px', color: '#6F6B82' }}>{fmtDateTime(deposit.created_at)} · {depositAge(deposit.created_at)}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div style={{ borderRadius: '16px', padding: '18px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#7E7A8F', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Payment Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                ['Event ID',   deposit.stripe_event_id || '—'],
                ['Currency',   (deposit.currency || 'GBP').toUpperCase()],
                ['Amount',     fmtGbp(deposit.amount_cents)],
                ['Status',     deposit.status.replace('_', ' ')],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: '11px', color: '#6F6B82', marginBottom: '3px' }}>{k}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#E9E7F2', fontFamily: k === 'Event ID' ? 'monospace' : undefined, wordBreak: 'break-all' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer */}
          {deposit.profiles && (
            <div style={{ borderRadius: '16px', padding: '18px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#7E7A8F', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Customer</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#3a3550,#252036)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '14px', color: '#C9BBFF', flexShrink: 0 }}>
                  {initials(deposit.profiles.full_name)}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#E9E7F2' }}>{deposit.profiles.full_name || '—'}</div>
                  <div style={{ fontSize: '12px', color: '#7E7A8F', marginTop: '2px' }}>{deposit.profiles.email}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#6F6B82', marginBottom: '2px' }}>Current Balance</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#C9BBFF' }}>{(deposit.profiles.eth_balance ?? 0).toFixed(4)} ETH</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#6F6B82', marginBottom: '2px' }}>Account Status</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: deposit.profiles.is_active ? '#16D98A' : '#FF6B8A' }}>
                    {deposit.profiles.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>
              <Link href={`/admin/customers/${deposit.profiles.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '14px', fontSize: '12px', fontWeight: 700, color: '#9b7bff', textDecoration: 'none' }}>
                <Icon name="open_in_new" size={13} color="#9b7bff" /> View full customer profile
              </Link>
            </div>
          )}

          {/* Reviewed by / at */}
          {isTerminal && deposit.reviewed_by && (
            <div style={{ borderRadius: '14px', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#6F6B82', marginBottom: '3px' }}>Reviewed by</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#C9BBFF' }}>secondabenjamin.2000@gmail.com</div>
              </div>
              {deposit.reviewed_at && (
                <div>
                  <div style={{ fontSize: '11px', color: '#6F6B82', marginBottom: '3px' }}>Reviewed at</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#C9BBFF' }}>{fmtDateTime(deposit.reviewed_at)}</div>
                </div>
              )}
            </div>
          )}

          {/* Terminal status notice */}
          {isTerminal && (
            <div style={{ borderRadius: '14px', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <Icon name="lock" size={16} color="#8A8699" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ fontSize: '13px', color: '#8A8699', lineHeight: 1.5 }}>
                This deposit has a terminal status of <strong style={{ color: '#E9E7F2' }}>{deposit.status.replace('_', ' ')}</strong> and cannot be actioned again.
              </div>
            </div>
          )}

          {/* Confirm panel */}
          {confirming && (
            <div style={{ borderRadius: '16px', padding: '18px', background: confirming === 'credited' ? 'rgba(22,217,138,0.07)' : 'rgba(255,107,138,0.07)', border: `1px solid ${confirming === 'credited' ? 'rgba(22,217,138,0.3)' : 'rgba(255,107,138,0.3)'}`, marginTop: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '10px', color: confirming === 'credited' ? '#16D98A' : '#FF6B8A' }}>
                Confirm: Mark as {confirming}
              </div>
              <div style={{ fontSize: '13px', color: '#B6B3D9', marginBottom: '14px' }}>
                {confirming === 'credited'
                  ? `This will immediately credit £${(deposit.amount_cents / 100).toFixed(2)} to the customer's GBP balance and create a transaction record. This action cannot be undone.`
                  : `You are about to mark this deposit as ${confirming}. This action cannot be undone.`}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#7E7A8F', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Admin Note <span style={{ color: '#FF6B8A' }}>*</span>
                </label>
                <textarea
                  value={note}
                  onChange={e => { setNote(e.target.value); setNoteErr(''); }}
                  placeholder="Reason for this action (required)…"
                  rows={3}
                  style={{ width: '100%', borderRadius: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${noteErr ? 'rgba(255,107,138,0.5)' : 'rgba(255,255,255,0.12)'}`, color: '#F4F3FA', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
                />
                {noteErr && <div style={{ fontSize: '12px', color: '#FF6B8A', marginTop: '4px' }}>{noteErr}</div>}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <RippleButton
                  variant={confirming === 'credited' ? 'purple' : 'danger'}
                  onClick={confirm}
                  disabled={busy}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '40px', borderRadius: '12px', fontWeight: 700, fontSize: '13.5px' }}
                >
                  {busy ? 'Processing…' : `Confirm ${confirming}`}
                </RippleButton>
                <RippleButton variant="ghost" onClick={() => { setConfirming(null); setNote(''); setNoteErr(''); }} style={{ height: '40px', padding: '0 16px', borderRadius: '12px', fontWeight: 700, fontSize: '13.5px' }}>
                  Cancel
                </RippleButton>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions — only when pending */}
        {isPending && !confirming && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '10px' }}>
            <RippleButton variant="purple" onClick={() => setConfirming('credited')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '44px', borderRadius: '13px', fontWeight: 700, fontSize: '14px' }}>
              <Icon name="check_circle" size={17} color="#fff" /> Mark Credited
            </RippleButton>
            <RippleButton variant="danger" onClick={() => setConfirming('rejected')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '44px', borderRadius: '13px', fontWeight: 700, fontSize: '14px' }}>
              <Icon name="cancel" size={17} color="#FF8DA3" /> Reject
            </RippleButton>
            <RippleButton variant="ghost" onClick={() => setConfirming('refunded')} style={{ height: '44px', padding: '0 14px', borderRadius: '13px', fontWeight: 700, fontSize: '13px' }}>
              Refund
            </RippleButton>
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function AdminDepositsPage() {
  const router = useRouter();
  const [deposits, setDeposits]     = useState<Deposit[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeStatus, setActiveStatus] = useState('pending_review');
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState<Deposit | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => { document.title = 'Deposits | Etheon Admin'; }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      if ((user.email ?? '').toLowerCase() !== OWNER_ADMIN_EMAIL) { setAccessDenied(true); return; }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: activeStatus, limit: '100' });
    if (search) params.set('search', search);
    const res = await fetch(`/api/admin/deposits?${params}`);
    if (res.ok) {
      const json = await res.json();
      setDeposits(json.deposits ?? []);
    }
    setLoading(false);
  }, [activeStatus, search]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function handleAction(depositId: string, status: 'credited' | 'rejected' | 'refunded') {
    const res = await fetch(`/api/admin/customers/${deposits.find(d => d.id === depositId)?.user_id}/deposits/${depositId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed');
    await load();
  }

  if (accessDenied) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B0A14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#FF6B8A', fontFamily: "'Space Grotesk'" }}>
          <Icon name="lock" size={40} color="#FF6B8A" />
          <div style={{ marginTop: '12px', fontSize: '18px', fontWeight: 700 }}>Access denied</div>
          <Link href="/admin" style={{ display: 'block', marginTop: '12px', color: '#9b7bff', textDecoration: 'none', fontSize: '13px' }}>← Back to admin</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', color: '#F4F3FA', fontFamily: "'Manrope', system-ui, sans-serif", padding: '32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Link href="/admin" style={{ fontSize: '13px', color: '#7E7A8F', textDecoration: 'none' }}>Admin</Link>
              <span style={{ color: '#3A3750' }}>/</span>
              <span style={{ fontSize: '13px', color: '#C9BBFF', fontWeight: 700 }}>Deposits</span>
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '26px' }}>Deposit Operations</h1>
            <div style={{ fontSize: '13px', color: '#8A8699', marginTop: '3px' }}>Review, credit, and manage all deposit events</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#C9BBFF', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
              <Icon name="arrow_back" size={15} color="#C9BBFF" />Back
            </Link>
          </div>
        </div>

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setActiveStatus(t.key)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: `1px solid ${activeStatus === t.key ? t.color : 'rgba(255,255,255,0.08)'}`, background: activeStatus === t.key ? `${t.color}22` : 'rgba(255,255,255,0.03)', color: activeStatus === t.key ? t.color : '#7E7A8F', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 14px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '20px', maxWidth: '400px' }}>
          <Icon name="search" size={17} color="#6F6B82" style={{ flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email, name, or event ID…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#F4F3FA', fontSize: '13px', fontFamily: 'inherit' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6F6B82', padding: 0 }}><Icon name="close" size={15} color="#6F6B82" /></button>}
        </div>

        {/* Results count */}
        <div style={{ fontSize: '12px', color: '#6F6B82', marginBottom: '14px' }}>
          {loading ? 'Loading…' : `${deposits.length} deposit${deposits.length !== 1 ? 's' : ''}`}
        </div>

        {/* Table */}
        <div style={{ borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.2fr 1fr 1.2fr 120px', gap: '12px', padding: '12px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: '11px', fontWeight: 700, color: '#6F6B82', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>Customer</span>
            <span>Amount</span>
            <span>Date</span>
            <span>Age</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          {loading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#4A4763' }}>Loading deposits…</div>
          ) : deposits.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <Icon name="check_circle" size={36} color="#16D98A" />
              <div style={{ fontWeight: 700, color: '#16D98A', marginTop: '10px', fontSize: '14px' }}>No {activeStatus === 'pending_review' ? 'pending' : activeStatus} deposits</div>
              <div style={{ color: '#4A4763', fontSize: '12px', marginTop: '4px' }}>All caught up.</div>
            </div>
          ) : deposits.map((dep, i) => {
            const p = dep.profiles;
            const isEven = i % 2 === 0;
            return (
              <div key={dep.id}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.2fr 1fr 1.2fr 120px', gap: '12px', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: isEven ? 'transparent' : 'rgba(255,255,255,0.01)', alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s' }}
                onClick={() => setSelected(dep)}
              >
                {/* Customer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg,#3a3550,#222031)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '11px', color: '#C9BBFF', flexShrink: 0 }}>
                    {initials(p?.full_name ?? '?')}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#E9E7F2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p?.full_name || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#7E7A8F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p?.email || dep.user_id.slice(0, 16) + '…'}</div>
                  </div>
                </div>
                {/* Amount */}
                <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '14px', color: '#F4F3FA' }}>{fmtGbp(dep.amount_cents)}</div>
                {/* Date */}
                <div>
                  <div style={{ fontSize: '12px', color: '#7E7A8F' }}>{fmtDateTime(dep.created_at)}</div>
                  {dep.reviewed_at && <div style={{ fontSize: '11px', color: '#4A4763', marginTop: '2px' }}>Reviewed {fmtDateTime(dep.reviewed_at)}</div>}
                </div>
                {/* Age */}
                <div style={{ fontSize: '12px', color: dep.status === 'pending_review' ? '#FFB55C' : '#7E7A8F', fontWeight: dep.status === 'pending_review' ? 700 : 400 }}>{depositAge(dep.created_at)}</div>
                {/* Status */}
                <StatusBadge status={dep.status} />
                {/* Action */}
                <RippleButton variant="ghost" onClick={e => { e.stopPropagation(); setSelected(dep); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '32px', padding: '0 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>
                  Review <Icon name="chevron_right" size={14} color="#C9BBFF" />
                </RippleButton>
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <ReviewDrawer
          deposit={selected}
          onClose={() => setSelected(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
}
