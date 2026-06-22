'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Icon from '../../../components/Icon';
import RippleButton from '../../../components/RippleButton';
import { OWNER_ADMIN_EMAIL } from '@/lib/admin-config';

interface Withdrawal {
  id: string;
  amount_eth: number;
  amount_usd: number | null;
  status: string;
  description: string | null;
  created_at: string;
  user_id: string;
  profiles: { id: string; full_name: string; email: string; eth_balance: number; eth_wallet_address: string | null; is_active: boolean } | null;
}

const STATUS_TABS = [
  { key: 'pending',   label: 'Pending',   color: '#FFB55C' },
  { key: 'approved',  label: 'Approved',  color: '#6E8BFF' },
  { key: 'completed', label: 'Paid',      color: '#16D98A' },
  { key: 'failed',    label: 'Rejected',  color: '#FF6B8A' },
  { key: 'all',       label: 'All',       color: '#9b7bff' },
];

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
    pending:   { label: 'Pending',   color: '#FFB55C', bg: 'rgba(255,181,92,0.15)' },
    approved:  { label: 'Approved',  color: '#6E8BFF', bg: 'rgba(110,139,255,0.15)' },
    completed: { label: 'Paid',      color: '#16D98A', bg: 'rgba(22,217,138,0.14)' },
    failed:    { label: 'Rejected',  color: '#FF6B8A', bg: 'rgba(255,107,138,0.14)' },
  };
  const m = map[status] ?? { label: status, color: '#8A8699', bg: 'rgba(255,255,255,0.06)' };
  return <span style={{ fontSize: '11px', fontWeight: 700, color: m.color, background: m.bg, padding: '3px 9px', borderRadius: '999px', whiteSpace: 'nowrap' }}>{m.label}</span>;
}

// ── Action Drawer ─────────────────────────────────────────────
function ActionDrawer({ w, onClose, onAction }: {
  w: Withdrawal;
  onClose: () => void;
  onAction: (id: string, status: 'approved' | 'completed' | 'failed', note: string) => Promise<{ refund_applied?: boolean }>;
}) {
  const [confirming, setConfirming] = useState<'approved' | 'completed' | 'failed' | null>(null);
  const [note, setNote]             = useState('');
  const [noteErr, setNoteErr]       = useState('');
  const [busy, setBusy]             = useState(false);
  const [lastResult, setLastResult] = useState<{ refund_applied?: boolean } | null>(null);

  const isPending  = w.status === 'pending';
  const isApproved = w.status === 'approved';
  const isTerminal = w.status === 'completed' || w.status === 'failed';

  async function confirm() {
    if (!confirming) return;
    if (!note.trim()) { setNoteErr('An admin note is required.'); return; }
    setBusy(true);
    const result = await onAction(w.id, confirming, note);
    setLastResult(result);
    setBusy(false);
    onClose();
  }

  const confirmColor: Record<string, string> = {
    approved:  '#6E8BFF',
    completed: '#16D98A',
    failed:    '#FF6B8A',
  };
  const confirmLabel: Record<string, string> = {
    approved:  'Approve withdrawal',
    completed: 'Confirm paid',
    failed:    'Reject & refund ETH',
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 200, width: 'min(480px, 95vw)', background: '#0F0E1E', borderLeft: '1px solid rgba(255,255,255,0.09)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '18px' }}>Withdrawal Review</div>
            <div style={{ fontSize: '12px', color: '#7E7A8F', marginTop: '2px' }}>ID: {w.id.slice(0, 16)}…</div>
          </div>
          <button onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: '#C5C1D6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={18} color="#C5C1D6" />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Amount */}
          <div style={{ borderRadius: '18px', padding: '20px 22px', background: 'linear-gradient(135deg,rgba(110,139,255,0.14),rgba(155,123,255,0.08))', border: '1px solid rgba(110,139,255,0.25)', marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: '#8A8699', marginBottom: '4px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Withdrawal Amount</div>
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: '32px', fontWeight: 700, color: '#F4F3FA' }}>{Math.abs(w.amount_eth)} ETH</div>
            {w.amount_usd && <div style={{ fontSize: '13px', color: '#8A8699', marginTop: '4px' }}>≈ £{w.amount_usd.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <StatusBadge status={w.status} />
              <span style={{ fontSize: '12px', color: '#6F6B82' }}>{fmtDateTime(w.created_at)} · {depositAge(w.created_at)}</span>
            </div>
          </div>

          {/* Workflow guide */}
          <div style={{ borderRadius: '14px', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#6F6B82', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Workflow</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              {['Pending', 'Approved', 'Paid'].map((step, i, arr) => (
                <span key={step} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '999px', fontWeight: 700,
                    background: w.status === step.toLowerCase() ? 'rgba(124,92,255,0.2)' : 'rgba(255,255,255,0.05)',
                    color: w.status === step.toLowerCase() ? '#C9BBFF' :
                           w.status === 'failed' ? '#FF6B8A' :
                           (i < ['pending', 'approved', 'completed'].indexOf(w.status)) ? '#16D98A' : '#6F6B82',
                    border: w.status === step.toLowerCase() ? '1px solid rgba(124,92,255,0.35)' : '1px solid transparent',
                  }}>{step}</span>
                  {i < arr.length - 1 && <Icon name="chevron_right" size={14} color="#3A3750" />}
                </span>
              ))}
              {w.status === 'failed' && (
                <>
                  <Icon name="chevron_right" size={14} color="#3A3750" />
                  <span style={{ padding: '3px 10px', borderRadius: '999px', fontWeight: 700, background: 'rgba(255,107,138,0.15)', color: '#FF6B8A', border: '1px solid rgba(255,107,138,0.3)' }}>Rejected</span>
                </>
              )}
            </div>
          </div>

          {/* Customer */}
          {w.profiles && (
            <div style={{ borderRadius: '16px', padding: '18px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#7E7A8F', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Customer</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#3a3550,#252036)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '14px', color: '#C9BBFF', flexShrink: 0 }}>
                  {initials(w.profiles.full_name)}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#E9E7F2' }}>{w.profiles.full_name || '—'}</div>
                  <div style={{ fontSize: '12px', color: '#7E7A8F', marginTop: '2px' }}>{w.profiles.email}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#6F6B82', marginBottom: '2px' }}>Current Balance</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#C9BBFF' }}>{(w.profiles.eth_balance ?? 0).toFixed(4)} ETH</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#6F6B82', marginBottom: '2px' }}>Account Status</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: w.profiles.is_active ? '#16D98A' : '#FF6B8A' }}>{w.profiles.is_active ? 'Active' : 'Inactive'}</div>
                </div>
              </div>
              {w.profiles.eth_wallet_address && (
                <div>
                  <div style={{ fontSize: '11px', color: '#6F6B82', marginBottom: '2px' }}>Withdrawal Wallet</div>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#B6B3D9', wordBreak: 'break-all', background: 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: '8px', marginTop: '4px' }}>{w.profiles.eth_wallet_address}</div>
                </div>
              )}
              <Link href={`/admin/customers/${w.profiles.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '14px', fontSize: '12px', fontWeight: 700, color: '#9b7bff', textDecoration: 'none' }}>
                <Icon name="open_in_new" size={13} color="#9b7bff" /> View full customer profile
              </Link>
            </div>
          )}

          {w.description && (
            <div style={{ borderRadius: '14px', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: '#6F6B82', marginBottom: '4px', fontWeight: 700 }}>DESCRIPTION</div>
              <div style={{ fontSize: '13px', color: '#B6B3D9' }}>{w.description}</div>
            </div>
          )}

          {/* Terminal notice */}
          {isTerminal && (
            <div style={{ borderRadius: '14px', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <Icon name="lock" size={16} color="#8A8699" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ fontSize: '13px', color: '#8A8699', lineHeight: 1.5 }}>
                This withdrawal has a terminal status of <strong style={{ color: '#E9E7F2' }}>{w.status}</strong> and cannot be actioned again.
                {w.status === 'failed' && <span style={{ display: 'block', marginTop: '4px', color: '#16D98A' }}>✓ Customer ETH balance was refunded.</span>}
              </div>
            </div>
          )}

          {/* Refund notice for approved state */}
          {isApproved && (
            <div style={{ borderRadius: '14px', padding: '14px 16px', background: 'rgba(110,139,255,0.08)', border: '1px solid rgba(110,139,255,0.25)', display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '16px' }}>
              <Icon name="info" size={16} color="#6E8BFF" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ fontSize: '13px', color: '#9AABDF', lineHeight: 1.5 }}>
                This withdrawal is approved and ready for payout. Send {Math.abs(w.amount_eth)} ETH to the customer&apos;s wallet, then mark as Paid. ETH balance was already held at submission.
              </div>
            </div>
          )}

          {lastResult?.refund_applied && (
            <div style={{ borderRadius: '14px', padding: '12px 14px', background: 'rgba(22,217,138,0.08)', border: '1px solid rgba(22,217,138,0.3)', fontSize: '13px', color: '#16D98A', marginBottom: '14px' }}>
              ✓ ETH balance refunded to customer.
            </div>
          )}

          {/* Confirm panel */}
          {confirming && (
            <div style={{ borderRadius: '16px', padding: '18px', background: `${confirming === 'failed' ? 'rgba(255,107,138,0.07)' : confirming === 'completed' ? 'rgba(22,217,138,0.07)' : 'rgba(110,139,255,0.07)'}`, border: `1px solid ${confirming === 'failed' ? 'rgba(255,107,138,0.3)' : confirming === 'completed' ? 'rgba(22,217,138,0.3)' : 'rgba(110,139,255,0.3)'}`, marginTop: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '10px', color: confirmColor[confirming] }}>
                Confirm: {confirmLabel[confirming]}
              </div>
              {confirming === 'failed' && (
                <div style={{ fontSize: '13px', color: '#B6B3D9', marginBottom: '12px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(22,217,138,0.06)', border: '1px solid rgba(22,217,138,0.2)' }}>
                  ✓ Customer ETH balance will be automatically refunded when you confirm.
                </div>
              )}
              <textarea value={note} onChange={e => { setNote(e.target.value); setNoteErr(''); }} placeholder="Admin note (required)…" rows={3} style={{ width: '100%', borderRadius: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${noteErr ? 'rgba(255,107,138,0.5)' : 'rgba(255,255,255,0.12)'}`, color: '#F4F3FA', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', outline: 'none', marginBottom: '8px' }} />
              {noteErr && <div style={{ fontSize: '12px', color: '#FF6B8A', marginBottom: '10px' }}>{noteErr}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <RippleButton
                  variant={confirming === 'failed' ? 'danger' : 'purple'}
                  onClick={confirm}
                  disabled={busy}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px', borderRadius: '12px', fontWeight: 700, fontSize: '13.5px' }}>
                  {busy ? 'Processing…' : confirmLabel[confirming]}
                </RippleButton>
                <RippleButton variant="ghost" onClick={() => { setConfirming(null); setNote(''); }} style={{ height: '40px', padding: '0 14px', borderRadius: '12px', fontWeight: 700 }}>Cancel</RippleButton>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!isTerminal && !confirming && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {isPending && (
              <RippleButton variant="purple" onClick={() => setConfirming('approved')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '44px', borderRadius: '13px', fontWeight: 700, fontSize: '14px', minWidth: '120px' }}>
                <Icon name="thumb_up" size={17} color="#fff" /> Approve
              </RippleButton>
            )}
            {isApproved && (
              <RippleButton variant="purple" onClick={() => setConfirming('completed')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '44px', borderRadius: '13px', fontWeight: 700, fontSize: '14px', minWidth: '120px', background: '#16D98A' }}>
                <Icon name="check_circle" size={17} color="#fff" /> Mark Paid
              </RippleButton>
            )}
            <RippleButton variant="danger" onClick={() => setConfirming('failed')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '44px', borderRadius: '13px', fontWeight: 700, fontSize: '14px', minWidth: '120px' }}>
              <Icon name="cancel" size={17} color="#FF8DA3" /> Reject
            </RippleButton>
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function AdminWithdrawalsPage() {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeStatus, setActiveStatus] = useState('pending');
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState<Withdrawal | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => { document.title = 'Withdrawals | Etheon Admin'; }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      if ((user.email ?? '').toLowerCase() !== OWNER_ADMIN_EMAIL) { setAccessDenied(true); }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: activeStatus, limit: '100' });
    if (search) params.set('search', search);
    const res = await fetch(`/api/admin/withdrawals?${params}`);
    if (res.ok) { const json = await res.json(); setWithdrawals(json.withdrawals ?? []); }
    setLoading(false);
  }, [activeStatus, search]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function handleAction(id: string, status: 'approved' | 'completed' | 'failed', note: string): Promise<{ refund_applied?: boolean }> {
    const res = await fetch('/api/admin/withdrawals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, note }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? 'Failed');
    }
    const json = await res.json() as { refund_applied?: boolean };
    await load();
    return json;
  }

  if (accessDenied) return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#FF6B8A' }}>
        <Icon name="lock" size={40} color="#FF6B8A" />
        <div style={{ marginTop: '12px', fontSize: '18px', fontWeight: 700, fontFamily: "'Space Grotesk'" }}>Access denied</div>
        <Link href="/admin" style={{ display: 'block', marginTop: '12px', color: '#9b7bff', textDecoration: 'none', fontSize: '13px' }}>← Back to admin</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', color: '#F4F3FA', fontFamily: "'Manrope', system-ui, sans-serif", padding: '32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Link href="/admin" style={{ fontSize: '13px', color: '#7E7A8F', textDecoration: 'none' }}>Admin</Link>
              <span style={{ color: '#3A3750' }}>/</span>
              <span style={{ fontSize: '13px', color: '#C9BBFF', fontWeight: 700 }}>Withdrawals</span>
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '26px' }}>Withdrawal Operations</h1>
            <div style={{ fontSize: '13px', color: '#8A8699', marginTop: '3px' }}>Review, approve, and track all withdrawal requests</div>
          </div>
          <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#C9BBFF', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
            <Icon name="arrow_back" size={15} color="#C9BBFF" />Back
          </Link>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setActiveStatus(t.key)}
              style={{ padding: '8px 16px', borderRadius: '10px', border: `1px solid ${activeStatus === t.key ? t.color : 'rgba(255,255,255,0.08)'}`, background: activeStatus === t.key ? `${t.color}22` : 'rgba(255,255,255,0.03)', color: activeStatus === t.key ? t.color : '#7E7A8F', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 14px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '20px', maxWidth: '400px' }}>
          <Icon name="search" size={17} color="#6F6B82" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email or name…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#F4F3FA', fontSize: '13px', fontFamily: 'inherit' }} />
        </div>

        <div style={{ borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1.2fr 100px', gap: '12px', padding: '12px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: '11px', fontWeight: 700, color: '#6F6B82', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>Customer</span><span>Amount</span><span>Date</span><span>Age</span><span>Status</span><span>Action</span>
          </div>
          {loading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#4A4763' }}>Loading…</div>
          ) : withdrawals.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <Icon name="check_circle" size={36} color="#16D98A" />
              <div style={{ fontWeight: 700, color: '#16D98A', marginTop: '10px', fontSize: '14px' }}>No {activeStatus} withdrawals</div>
            </div>
          ) : withdrawals.map((w, i) => {
            const p = w.profiles;
            return (
              <div key={w.id} onClick={() => setSelected(w)}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1.2fr 100px', gap: '12px', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: w.status === 'pending' ? 'rgba(255,181,92,0.03)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg,#3a3550,#222031)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '11px', color: '#C9BBFF', flexShrink: 0 }}>{initials(p?.full_name ?? '?')}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#E9E7F2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p?.full_name || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#7E7A8F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p?.email || '—'}</div>
                  </div>
                </div>
                <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '14px', color: '#F4F3FA' }}>{Math.abs(w.amount_eth)} ETH</div>
                <div style={{ fontSize: '12px', color: '#7E7A8F' }}>{fmtDateTime(w.created_at)}</div>
                <div style={{ fontSize: '12px', color: w.status === 'pending' ? '#FFB55C' : '#7E7A8F', fontWeight: w.status === 'pending' ? 700 : 400 }}>{depositAge(w.created_at)}</div>
                <StatusBadge status={w.status} />
                <RippleButton variant="ghost" onClick={e => { e.stopPropagation(); setSelected(w); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '32px', padding: '0 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>
                  Review <Icon name="chevron_right" size={14} color="#C9BBFF" />
                </RippleButton>
              </div>
            );
          })}
        </div>
      </div>

      {selected && <ActionDrawer w={selected} onClose={() => setSelected(null)} onAction={handleAction} />}
    </div>
  );
}
