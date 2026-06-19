'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import Icon from '../../../components/Icon';
import RippleButton from '../../../components/RippleButton';
import { EtheonCrystal } from '@/components/EtheonBrand';
import { OWNER_ADMIN_EMAIL } from '@/lib/admin-config';

// ── Types ────────────────────────────────────────────────
interface Customer {
  id: string; full_name: string; email: string; role: string;
  eth_balance: number; hashrate_th: number; mining_status: string;
  vip_tier: number | string; is_active: boolean; created_at: string;
  has_wallet: boolean; subscription_status: string; subscription_plan: string | null;
  has_active_subscription: boolean; checks_total: number; checks_complete: number;
}
interface Config { miningThreshold: number; withdrawalThreshold: number; }

// ── Helpers ──────────────────────────────────────────────
function initials(name: string) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join('');
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

type FilterKey = 'all' | 'subscribed' | 'not_subscribed' | 'mining_locked' | 'mining_unlocked' | 'withdrawal_locked' | 'withdrawal_unlocked' | 'no_wallet' | 'inactive';
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'subscribed', label: 'Subscribed' },
  { key: 'not_subscribed', label: 'Not subscribed' },
  { key: 'mining_unlocked', label: 'Mining unlocked' },
  { key: 'mining_locked', label: 'Mining locked' },
  { key: 'withdrawal_unlocked', label: 'Withdrawal unlocked' },
  { key: 'withdrawal_locked', label: 'Withdrawal locked' },
  { key: 'no_wallet', label: 'No wallet' },
  { key: 'inactive', label: 'Inactive' },
];

// ── Badge ────────────────────────────────────────────────
function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ fontSize: '11.5px', fontWeight: 700, color, background: bg, padding: '4px 9px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

// ── Skeleton row ─────────────────────────────────────────
function SkeletonRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: '10px', alignItems: 'center', padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '12px', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
          <div className="skeleton" style={{ height: '12px', width: '60%', borderRadius: '5px' }} />
          <div className="skeleton" style={{ height: '10px', width: '40%', borderRadius: '5px' }} />
        </div>
      </div>
      {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: '12px', borderRadius: '5px' }} />)}
      <div className="skeleton" style={{ height: '30px', borderRadius: '10px' }} />
    </div>
  );
}

const COLS = '2.2fr 1.1fr 1fr 1fr 1fr 1fr 1fr 80px';


function AccessDenied() {
  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: "'Manrope',sans-serif" }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'rgba(255,107,138,0.12)', border: '1px solid rgba(255,107,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="lock" size={28} color="#FF6B8A" />
      </div>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '22px', color: '#F5F4FF' }}>Access denied</div>
      <div style={{ fontSize: '13.5px', color: '#7D789E', textAlign: 'center', maxWidth: '300px', lineHeight: 1.6 }}>This area is restricted to the platform owner only.</div>
      <Link href="/dashboard" style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '11px 22px', borderRadius: '12px', background: 'rgba(155,123,255,0.14)', border: '1px solid rgba(155,123,255,0.3)', color: '#C9BBFF', fontWeight: 700, fontSize: '13.5px', textDecoration: 'none' }}>
        <Icon name="arrow_back" size={16} color="#C9BBFF" />Back to dashboard
      </Link>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────
export default function CustomersPage() {
  useEffect(() => { document.title = 'Customers | Etheon Admin'; }, []);
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [config, setConfig] = useState<Config>({ miningThreshold: 100, withdrawalThreshold: 1000 });
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [ethPrice, setEthPrice] = useState(3000);

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
      const [custRes, priceRes] = await Promise.all([
        fetch('/api/admin/customers?limit=200'),
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd').catch(() => null),
      ]);
      if (!custRes.ok) { setAccessDenied(true); setLoading(false); return; }
      const custJson = await custRes.json();
      setCustomers(custJson.users ?? []);
      setConfig(custJson.config ?? { miningThreshold: 100, withdrawalThreshold: 1000 });
      if (priceRes?.ok) {
        const priceJson = await priceRes.json();
        setEthPrice(priceJson?.ethereum?.usd ?? 3000);
      }
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const balanceUsd = (eth: number) => eth * ethPrice;
  const miningLocked = (eth: number) => balanceUsd(eth) < config.miningThreshold;
  const withdrawalLocked = (eth: number) => balanceUsd(eth) < config.withdrawalThreshold;

  const filtered = useMemo(() => {
    let list = customers;
    const q = search.toLowerCase();
    if (q) {
      list = list.filter(c =>
        (c.full_name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        c.id.includes(q)
      );
    }
    switch (filter) {
      case 'subscribed': return list.filter(c => c.has_active_subscription);
      case 'not_subscribed': return list.filter(c => !c.has_active_subscription);
      case 'mining_unlocked': return list.filter(c => !miningLocked(c.eth_balance));
      case 'mining_locked': return list.filter(c => miningLocked(c.eth_balance));
      case 'withdrawal_unlocked': return list.filter(c => !withdrawalLocked(c.eth_balance));
      case 'withdrawal_locked': return list.filter(c => withdrawalLocked(c.eth_balance));
      case 'no_wallet': return list.filter(c => !c.has_wallet);
      case 'inactive': return list.filter(c => !c.is_active);
      default: return list;
    }
  }, [customers, search, filter, ethPrice, config]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stats
  const stats = useMemo(() => [
    { icon: 'group', label: 'Total customers', val: customers.length, color: '#7C5CFF', bg: 'rgba(124,92,255,0.14)' },
    { icon: 'workspace_premium', label: 'Active subscribers', val: customers.filter(c => c.has_active_subscription).length, color: '#16D98A', bg: 'rgba(22,217,138,0.14)' },
    { icon: 'bolt', label: 'Mining unlocked', val: customers.filter(c => !miningLocked(c.eth_balance)).length, color: '#9b7bff', bg: 'rgba(155,123,255,0.14)' },
    { icon: 'north_east', label: 'Withdrawal unlocked', val: customers.filter(c => !withdrawalLocked(c.eth_balance)).length, color: '#FFB55C', bg: 'rgba(255,181,92,0.14)' },
  ], [customers, ethPrice, config]); // eslint-disable-line react-hooks/exhaustive-deps

  const subColor = (s: string) => {
    if (['active', 'trialing'].includes(s)) return { color: '#16D98A', bg: 'rgba(22,217,138,0.12)' };
    if (s === 'none') return { color: '#6F6B82', bg: 'rgba(255,255,255,0.06)' };
    return { color: '#FF6B8A', bg: 'rgba(255,107,138,0.12)' };
  };

  if (accessDenied) return <AccessDenied />;

  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', color: '#F4F3FA', fontFamily: "'Manrope', system-ui, sans-serif", padding: '28px' }}>
      <div style={{ position: 'fixed', top: '-200px', left: '5%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,92,255,0.15),transparent 62%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '26px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginBottom: '4px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'linear-gradient(135deg,#9b7bff,#6e8bff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <EtheonCrystal size={20} />
              </div>
              <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '18px', letterSpacing: '-0.02em' }}>Etheon</span>
              <span style={{ padding: '3px 10px', borderRadius: '999px', background: 'rgba(255,181,92,0.14)', border: '1px solid rgba(255,181,92,0.25)', fontSize: '11px', fontWeight: 700, color: '#FFB55C' }}>Admin</span>
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '24px', letterSpacing: '-0.02em' }}>Customer management</h1>
            <div style={{ fontSize: '13px', color: '#8A8699', marginTop: '2px' }}>View and manage all customer accounts, balances, and unlock status</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { href: '/admin', icon: 'manage_accounts', label: 'Users' },
              { href: '/admin/content', icon: 'edit_note', label: 'Content' },
              { href: '/dashboard', icon: 'arrow_back', label: 'Back to app' },
            ].map(({ href, icon, label }) => (
              <a key={href} href={href} style={{ textDecoration: 'none' }}>
                <RippleButton variant="ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '40px', padding: '0 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, color: '#C9BBFF' }}>
                  <Icon name={icon} size={16} color="#C9BBFF" />{label}
                </RippleButton>
              </a>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="resp-grid-4" style={{ gap: '14px', marginBottom: '22px' }}>
          {stats.map(s => (
            <div key={s.label} style={{ borderRadius: '20px', padding: '18px 20px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <Icon name={s.icon} size={20} color={s.color} />
              </div>
              <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '24px', letterSpacing: '-0.02em' }}>{loading ? '—' : s.val}</div>
              <div style={{ fontSize: '12px', color: '#8A8699', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters + Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: '7px 14px', borderRadius: '999px', cursor: 'pointer', fontFamily: "'Manrope'", fontWeight: 700, fontSize: '12px', background: filter === f.key ? 'rgba(124,92,255,0.22)' : 'rgba(255,255,255,0.04)', border: `1px solid ${filter === f.key ? 'rgba(124,92,255,0.4)' : 'rgba(255,255,255,0.08)'}`, color: filter === f.key ? '#C9BBFF' : '#8A8699' }}>
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '38px', padding: '0 14px', borderRadius: '999px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', minWidth: '220px' }}>
            <Icon name="search" size={17} color="#8A8699" style={{ flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, or ID…" style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: '#F4F3FA', fontFamily: "'Manrope'", fontSize: '13px' }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6F6B82', padding: 0, display: 'flex' }}><Icon name="close" size={15} color="#6F6B82" /></button>}
          </div>
        </div>

        {/* Table */}
        <div style={{ borderRadius: '24px', overflow: 'hidden', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: '10px', padding: '12px 22px', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.07em', color: '#6F6B82', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span>Customer</span>
            <span>Balance</span>
            <span>Mining</span>
            <span>Withdrawal</span>
            <span>Subscription</span>
            <span>Checks</span>
            <span>Joined</span>
            <span />
          </div>

          {loading ? (
            <>{[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}</>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <Icon name="person_search" size={44} color="#3A3750" />
              <div style={{ marginTop: '12px', fontSize: '15px', fontWeight: 700, color: '#6F6B82' }}>No customers found</div>
              <div style={{ fontSize: '13px', color: '#4A4763', marginTop: '4px' }}>Try a different search or filter.</div>
            </div>
          ) : filtered.map(c => {
            const usd = balanceUsd(c.eth_balance);
            const mLocked = miningLocked(c.eth_balance);
            const wLocked = withdrawalLocked(c.eth_balance);
            const sc = subColor(c.subscription_status);
            const subLabel = c.subscription_status === 'none' ? 'None' : c.subscription_status.charAt(0).toUpperCase() + c.subscription_status.slice(1);

            return (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: COLS, gap: '10px', alignItems: 'center', padding: '13px 22px', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}>
                {/* Customer cell */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: c.is_active ? 'linear-gradient(135deg,#3a3550,#252036)' : 'rgba(255,107,138,0.1)', border: c.is_active ? 'none' : '1px solid rgba(255,107,138,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '13px', color: c.is_active ? '#C9BBFF' : '#FF8DA3', flexShrink: 0 }}>
                    {initials(c.full_name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.full_name || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#7E7A8F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>{c.email}</div>
                  </div>
                </div>

                {/* Balance */}
                <div>
                  <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '13px', color: '#16D98A' }}>£{usd.toFixed(2)}</div>
                  <div style={{ fontSize: '10.5px', color: '#6F6B82', marginTop: '1px' }}>{(c.eth_balance || 0).toFixed(5)} ETH</div>
                </div>

                {/* Mining lock */}
                <Badge label={mLocked ? 'Locked' : 'Unlocked'} color={mLocked ? '#FFB55C' : '#16D98A'} bg={mLocked ? 'rgba(255,181,92,0.12)' : 'rgba(22,217,138,0.12)'} />

                {/* Withdrawal lock */}
                <Badge label={wLocked ? 'Locked' : 'Unlocked'} color={wLocked ? '#FF6B8A' : '#16D98A'} bg={wLocked ? 'rgba(255,107,138,0.12)' : 'rgba(22,217,138,0.12)'} />

                {/* Subscription */}
                <Badge label={subLabel} color={sc.color} bg={sc.bg} />

                {/* Checks */}
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: c.checks_total > 0 ? (c.checks_complete === c.checks_total ? '#16D98A' : '#C9BBFF') : '#6F6B82' }}>
                  {c.checks_total > 0 ? `${c.checks_complete}/${c.checks_total}` : '—'}
                </div>

                {/* Joined */}
                <div style={{ fontSize: '11.5px', color: '#7E7A8F' }}>{fmtDate(c.created_at)}</div>

                {/* Action */}
                <RippleButton variant="ghost" onClick={() => router.push(`/admin/customers/${c.id}`)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '32px', padding: '0 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, color: '#C9BBFF' }}>
                  <Icon name="open_in_new" size={14} color="#C9BBFF" />View
                </RippleButton>
              </div>
            );
          })}
        </div>

        {!loading && (
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#4A4763', textAlign: 'right' }}>
            Showing {filtered.length} of {customers.length} customers · ETH indicative rate: £{ethPrice.toLocaleString()} (CoinGecko USD proxy)
          </div>
        )}
      </div>
    </div>
  );
}

