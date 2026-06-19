'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Icon from '../../components/Icon';
import RippleButton from '../../components/RippleButton';
import { EtheonCrystal } from '@/components/EtheonBrand';
import { OWNER_ADMIN_EMAIL } from '@/lib/admin-config';

// ── Types ────────────────────────────────────────────────
interface DashboardStats {
  total_customers: number;
  active_subscriptions: number;
  pending_deposits: number;
  total_eth_held: number;
  pending_checks: number;
}
interface PendingDeposit {
  id: string; amount_cents: number; currency: string; created_at: string; user_id: string;
}
interface RecentSignup {
  id: string; full_name: string; email: string; created_at: string; is_active: boolean;
}
interface RecentAction {
  id: string; action: string; target_table: string | null; target_id: string | null; created_at: string; admin_id: string;
}

// ── Helpers ──────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}
function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function fmtGbp(pence: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}
function initials(name: string) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

// ── Skeleton ─────────────────────────────────────────────
function SkeletonLine({ w = '80%', h = '13px' }: { w?: string; h?: string }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: '6px' }} />;
}

// ── Access denied ─────────────────────────────────────────
function AccessDenied() {
  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: "'Manrope',sans-serif" }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'rgba(255,107,138,0.12)', border: '1px solid rgba(255,107,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="lock" size={28} color="#FF6B8A" />
      </div>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '22px', color: '#F5F4FF' }}>Access denied</div>
      <div style={{ fontSize: '13.5px', color: '#7D789E', textAlign: 'center', maxWidth: '300px', lineHeight: 1.6 }}>
        This area is restricted to the platform owner only.
      </div>
      <Link href="/dashboard" style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '11px 22px', borderRadius: '12px', background: 'rgba(155,123,255,0.14)', border: '1px solid rgba(155,123,255,0.3)', color: '#C9BBFF', fontWeight: 700, fontSize: '13.5px', textDecoration: 'none' }}>
        <Icon name="arrow_back" size={16} color="#C9BBFF" />Back to dashboard
      </Link>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, bg, loading }: {
  icon: string; label: string; value: string | number; sub?: string;
  color: string; bg: string; loading: boolean;
}) {
  return (
    <div style={{ borderRadius: '22px', padding: '20px 22px', background: 'linear-gradient(180deg,rgba(255,255,255,0.048),rgba(255,255,255,0.016))', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ width: '42px', height: '42px', borderRadius: '13px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
        <Icon name={icon} size={22} color={color} />
      </div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          <SkeletonLine w="55%" h="26px" />
          <SkeletonLine w="70%" h="11px" />
        </div>
      ) : (
        <>
          <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '26px', letterSpacing: '-0.02em', color: '#F4F3FA' }}>{value}</div>
          <div style={{ fontSize: '12.5px', color: '#8A8699', marginTop: '3px' }}>{label}</div>
          {sub && <div style={{ fontSize: '11.5px', color: color, marginTop: '4px', fontWeight: 600 }}>{sub}</div>}
        </>
      )}
    </div>
  );
}

// ── Nav link ─────────────────────────────────────────────
function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a href={href} style={{ textDecoration: 'none' }}>
      <RippleButton variant="ghost" style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '42px', padding: '0 18px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, color: '#C9BBFF' }}>
        <Icon name={icon} size={17} color="#C9BBFF" />{label}
      </RippleButton>
    </a>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingDeposits, setPendingDeposits] = useState<PendingDeposit[]>([]);
  const [recentSignups, setRecentSignups] = useState<RecentSignup[]>([]);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);

  useEffect(() => { document.title = 'Admin | Etheon'; }, []);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      if ((user.email ?? '').toLowerCase() !== OWNER_ADMIN_EMAIL) {
        setAccessDenied(true); setLoading(false); return;
      }
      const res = await fetch('/api/admin/dashboard');
      if (!res.ok) { setAccessDenied(true); setLoading(false); return; }
      const json = await res.json();
      setStats(json.stats);
      setPendingDeposits(json.pending_deposits ?? []);
      setRecentSignups(json.recent_signups ?? []);
      setRecentActions(json.recent_actions ?? []);
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (accessDenied) return <AccessDenied />;

  const statCards = [
    {
      icon: 'group', label: 'Total customers',
      value: stats?.total_customers ?? 0,
      color: '#7C5CFF', bg: 'rgba(124,92,255,0.14)',
    },
    {
      icon: 'workspace_premium', label: 'Active subscriptions',
      value: stats?.active_subscriptions ?? 0,
      color: '#16D98A', bg: 'rgba(22,217,138,0.14)',
    },
    {
      icon: 'pending_actions', label: 'Pending deposit reviews',
      value: stats?.pending_deposits ?? 0,
      sub: stats && stats.pending_deposits > 0 ? 'Needs review' : undefined,
      color: stats?.pending_deposits ? '#FFB55C' : '#8A8699',
      bg: stats?.pending_deposits ? 'rgba(255,181,92,0.14)' : 'rgba(255,255,255,0.06)',
    },
    {
      icon: 'diamond', label: 'Total ETH held',
      value: loading ? '—' : `${(stats?.total_eth_held ?? 0).toFixed(4)} ETH`,
      color: '#9b7bff', bg: 'rgba(155,123,255,0.14)',
    },
    {
      icon: 'checklist', label: 'Pending verifications',
      value: stats?.pending_checks ?? 0,
      sub: stats && stats.pending_checks > 0 ? 'Checks pending' : undefined,
      color: stats?.pending_checks ? '#FF6B8A' : '#8A8699',
      bg: stats?.pending_checks ? 'rgba(255,107,138,0.14)' : 'rgba(255,255,255,0.06)',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', color: '#F4F3FA', fontFamily: "'Manrope', system-ui, sans-serif", padding: '32px' }}>
      <div style={{ position: 'fixed', top: '-220px', left: '8%', width: '620px', height: '620px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,92,255,0.18),transparent 62%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1280px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg,#9b7bff,#6e8bff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(124,92,255,0.4)' }}>
                <EtheonCrystal size={22} />
              </div>
              <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '20px', letterSpacing: '-0.02em' }}>Etheon</span>
              <span style={{ padding: '4px 11px', borderRadius: '999px', background: 'rgba(255,181,92,0.14)', border: '1px solid rgba(255,181,92,0.25)', fontSize: '11.5px', fontWeight: 700, color: '#FFB55C' }}>Admin</span>
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '26px', letterSpacing: '-0.02em' }}>Operations centre</h1>
            <div style={{ fontSize: '13px', color: '#8A8699', marginTop: '3px' }}>Owner control panel · live data from Supabase</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <NavLink href="/admin/customers" icon="group" label="Customers" />
            <NavLink href="/admin/content" icon="edit_note" label="Content" />
            <NavLink href="/admin/system" icon="monitor_heart" label="System" />
            <NavLink href="/dashboard" icon="arrow_back" label="Back to app" />
          </div>
        </div>

        {/* Stat widgets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '16px', marginBottom: '28px' }}>
          {statCards.map(s => (
            <StatCard key={s.label} {...s} loading={loading} />
          ))}
        </div>

        {/* Two-column lower section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

          {/* Pending deposit reviews */}
          <div style={{ borderRadius: '24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,181,92,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="pending_actions" size={18} color="#FFB55C" />
                </div>
                <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '15px' }}>Pending deposit reviews</span>
              </div>
              <Link href="/admin/customers" style={{ fontSize: '12px', fontWeight: 700, color: '#9b7bff', textDecoration: 'none' }}>View all →</Link>
            </div>
            <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {loading ? (
                [1,2,3].map(i => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <SkeletonLine w="60%" /><SkeletonLine w="40%" h="10px" />
                  </div>
                ))
              ) : pendingDeposits.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#4A4763', fontSize: '13px' }}>
                  <Icon name="check_circle" size={28} color="#16D98A" style={{ marginBottom: '6px' }} />
                  <div style={{ color: '#16D98A', fontWeight: 700 }}>No pending deposits</div>
                </div>
              ) : pendingDeposits.map(dep => (
                <div key={dep.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '13px', background: 'rgba(255,181,92,0.06)', border: '1px solid rgba(255,181,92,0.2)' }}>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#E9E7F2' }}>{fmtGbp(dep.amount_cents)}</div>
                    <div style={{ fontSize: '11px', color: '#8A8699', marginTop: '2px' }}>{fmtDateTime(dep.created_at)}</div>
                  </div>
                  <Link href={`/admin/customers/${dep.user_id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '9px', background: 'rgba(255,181,92,0.14)', border: '1px solid rgba(255,181,92,0.3)', color: '#FFB55C', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                    Review <Icon name="open_in_new" size={12} color="#FFB55C" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Recent signups */}
          <div style={{ borderRadius: '24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(22,217,138,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="person_add" size={18} color="#16D98A" />
                </div>
                <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '15px' }}>Recent signups</span>
              </div>
              <Link href="/admin/customers" style={{ fontSize: '12px', fontWeight: 700, color: '#9b7bff', textDecoration: 'none' }}>View all →</Link>
            </div>
            <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loading ? (
                [1,2,3,4].map(i => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <SkeletonLine w="55%" /><SkeletonLine w="35%" h="10px" />
                    </div>
                  </div>
                ))
              ) : recentSignups.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#4A4763', fontSize: '13px' }}>No customers yet</div>
              ) : recentSignups.map(u => (
                <Link key={u.id} href={`/admin/customers/${u.id}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none', transition: 'background 0.1s' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: u.is_active ? 'linear-gradient(135deg,#3a3550,#252036)' : 'rgba(255,107,138,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '12px', color: '#C9BBFF', flexShrink: 0 }}>
                    {initials(u.full_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#E9E7F2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.full_name || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#7E7A8F', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#5A5673', flexShrink: 0 }}>{fmtDate(u.created_at)}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent admin actions */}
        <div style={{ borderRadius: '24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(124,92,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="history" size={18} color="#9b7bff" />
            </div>
            <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '15px' }}>Recent admin actions</span>
          </div>
          <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loading ? (
              [1,2,3,4,5].map(i => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <SkeletonLine w="45%" /><SkeletonLine w="25%" h="10px" />
                  </div>
                </div>
              ))
            ) : recentActions.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#4A4763', fontSize: '13px' }}>No admin actions recorded yet</div>
            ) : recentActions.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 10px', borderRadius: '11px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(124,92,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="manage_accounts" size={15} color="#9b7bff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#C9BBFF', fontFamily: 'monospace' }}>
                    {a.action.replace(/_/g, ' ')}
                  </div>
                  {a.target_table && (
                    <div style={{ fontSize: '10.5px', color: '#5A5673', marginTop: '1px' }}>
                      {a.target_table}{a.target_id ? ` · ${a.target_id.slice(0, 12)}…` : ''}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '10.5px', color: '#4A4763', flexShrink: 0 }}>{fmtDateTime(a.created_at)}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
