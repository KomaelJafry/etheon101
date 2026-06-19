'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Icon from '../../components/Icon';
import RippleButton from '../../components/RippleButton';
import { EtheonCrystal } from '@/components/EtheonBrand';
import { OWNER_ADMIN_EMAIL } from '@/lib/admin-config';

function SkeletonRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', gap: '12px', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="skeleton" style={{ width: '38px', height: '38px', borderRadius: '12px', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <div className="skeleton" style={{ height: '13px', width: '55%', borderRadius: '6px' }} />
          <div className="skeleton" style={{ height: '10px', width: '30%', borderRadius: '6px' }} />
        </div>
      </div>
      {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: '13px', borderRadius: '6px' }} />)}
    </div>
  );
}

interface UserRow {
  id: string; full_name: string; role: string; eth_balance: number;
  hashrate_th: number; mining_status: string; vip_tier: number; is_active: boolean; created_at: string;
}

function initials(name: string) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}


const VIP_TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum'] as const;
const VIP_LABEL = ['Standard', 'Bronze', 'Silver', 'Gold', 'Platinum'];
const STAT_CARDS = (users: UserRow[]) => [
  { icon: 'group', label: 'Total users', val: users.length, color: '#7C5CFF', bg: 'rgba(124,92,255,0.14)' },
  { icon: 'bolt', label: 'Active miners', val: users.filter(u => u.mining_status === 'active').length, color: '#16D98A', bg: 'rgba(22,217,138,0.14)' },
  { icon: 'diamond', label: 'Total ETH held', val: users.reduce((s, u) => s + (u.eth_balance || 0), 0).toFixed(4), color: '#9b7bff', bg: 'rgba(155,123,255,0.14)' },
  { icon: 'admin_panel_settings', label: 'Admins', val: users.filter(u => u.role === 'admin').length, color: '#FFB55C', bg: 'rgba(255,181,92,0.14)' },
];

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

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = 'Admin | Etheon'; }, []);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

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
      const res = await fetch('/api/admin/users');
      if (!res.ok) { setAccessDenied(true); setLoading(false); return; }
      const json = await res.json();
      setUsers(json.users || []);
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- router and supabase client are stable

  if (accessDenied) return <AccessDenied />;

  const filtered = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(search.toLowerCase())
  );

  async function saveEdit() {
    if (!editUser) return;
    setSaving(true); setSaveMsg('');
    const res = await fetch(`/api/admin/users/${editUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eth_balance: editUser.eth_balance,
        hashrate_th: editUser.hashrate_th,
        vip_tier: editUser.vip_tier,
        mining_status: editUser.mining_status,
        is_active: editUser.is_active,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === editUser.id ? editUser : u));
      setSaveMsg('Saved');
      setTimeout(() => { setSaveMsg(''); setEditUser(null); }, 1200);
    } else {
      setSaveMsg(json.error || 'Could not save changes.');
    }
    setSaving(false);
  }

  const stats = STAT_CARDS(users);

  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', color: '#F4F3FA', fontFamily: "'Manrope', system-ui, sans-serif", padding: '32px' }}>
      <div style={{ position: 'fixed', top: '-220px', left: '8%', width: '620px', height: '620px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,92,255,0.18),transparent 62%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1280px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg,#9b7bff,#6e8bff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(124,92,255,0.4)' }}>
                <EtheonCrystal size={22} />
              </div>
              <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '20px', letterSpacing: '-0.02em' }}>Etheon</span>
              <span style={{ padding: '4px 11px', borderRadius: '999px', background: 'rgba(255,181,92,0.14)', border: '1px solid rgba(255,181,92,0.25)', fontSize: '11.5px', fontWeight: 700, color: '#FFB55C' }}>Admin</span>
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '26px', letterSpacing: '-0.02em' }}>User management</h1>
            <div style={{ fontSize: '13px', color: '#8A8699', marginTop: '3px' }}>Manage accounts, balances, and miner settings</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/admin/customers" style={{ textDecoration: 'none' }}>
              <RippleButton variant="ghost" style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '42px', padding: '0 18px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, color: '#C9BBFF' }}>
                <Icon name="group" size={17} color="#C9BBFF" />Customers
              </RippleButton>
            </Link>
            <Link href="/admin/content" style={{ textDecoration: 'none' }}>
              <RippleButton variant="ghost" style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '42px', padding: '0 18px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, color: '#C9BBFF' }}>
                <Icon name="edit_note" size={17} color="#C9BBFF" />Content
              </RippleButton>
            </Link>
            <Link href="/admin/system" style={{ textDecoration: 'none' }}>
              <RippleButton variant="ghost" style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '42px', padding: '0 18px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, color: '#C9BBFF' }}>
                <Icon name="monitor_heart" size={17} color="#C9BBFF" />System
              </RippleButton>
            </Link>
            <a href="/dashboard" style={{ textDecoration: 'none' }}>
              <RippleButton variant="ghost" style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '42px', padding: '0 18px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, color: '#C9BBFF' }}>
                <Icon name="arrow_back" size={17} color="#C9BBFF" />Back to app
              </RippleButton>
            </a>
          </div>
        </div>

        {/* Stat cards */}
        <div className="resp-grid-4" style={{ gap: '16px', marginBottom: '24px' }}>
          {stats.map(s => (
            <div key={s.label} style={{ borderRadius: '22px', padding: '20px 22px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '13px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <Icon name={s.icon} size={22} color={s.color} />
              </div>
              <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '26px', letterSpacing: '-0.02em' }}>{s.val}</div>
              <div style={{ fontSize: '12.5px', color: '#8A8699', marginTop: '3px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ borderRadius: '26px', overflow: 'hidden', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '17px' }}>All accounts</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', height: '40px', padding: '0 14px', borderRadius: '999px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#8A8699', fontSize: '13.5px', width: '220px' }}>
              <Icon name="search" size={18} color="#8A8699" style={{ flexShrink: 0 }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: '#F4F3FA', fontFamily: "'Manrope'", fontSize: '13.5px' }} />
            </div>
          </div>

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', gap: '12px', padding: '12px 24px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#6F6B82', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span>User</span><span>Balance</span><span>Hashrate</span><span>Status</span><span>VIP</span><span />
          </div>

          {loading ? (
            <>{[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}</>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
              <Icon name="person_search" size={44} color="#3A3750" />
              <div style={{ marginTop: '14px', fontSize: '15px', fontWeight: 700, color: '#6F6B82' }}>No users found</div>
              <div style={{ fontSize: '13px', color: '#4A4763', marginTop: '5px' }}>Try a different search term.</div>
            </div>
          ) : filtered.map(u => {
            const isActive = u.mining_status === 'active';
            return (
              <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', gap: '12px', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg,#3a3550,#222031)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '14px', color: '#C9BBFF', flexShrink: 0 }}>
                    {initials(u.full_name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.full_name || '—'}</div>
                    <div style={{ fontSize: '11.5px', color: u.role === 'admin' ? '#FFB55C' : '#7E7A8F', marginTop: '2px', fontWeight: u.role === 'admin' ? 700 : 400 }}>{u.role}</div>
                  </div>
                </div>
                <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '13.5px', color: '#16D98A' }}>{(u.eth_balance || 0).toFixed(4)} ETH</span>
                <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '13.5px' }}>{u.hashrate_th || 0} TH</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: isActive ? '#16D98A' : '#FF6B8A', background: isActive ? 'rgba(22,217,138,0.12)' : 'rgba(255,107,138,0.12)', padding: '5px 10px', borderRadius: '999px', display: 'inline-block' }}>
                  {isActive ? 'Active' : 'Paused'}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#C9BBFF', background: 'rgba(124,92,255,0.14)', padding: '5px 10px', borderRadius: '999px', display: 'inline-block' }}>
                  {typeof u.vip_tier === 'string' ? u.vip_tier : VIP_LABEL[Math.min(u.vip_tier || 0, 4)]}
                </span>
                <RippleButton variant="ghost" onClick={() => { setEditUser({ ...u }); setSaveMsg(''); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', height: '34px', padding: '0 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, color: '#C9BBFF' }}>
                  <Icon name="edit" size={15} color="#C9BBFF" />Edit
                </RippleButton>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit modal */}
      {editUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) setEditUser(null); }}>
          <div style={{ width: '100%', maxWidth: '500px', borderRadius: '28px', padding: '28px', background: '#111020', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
              <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '19px' }}>Edit account</div>
              <button onClick={() => setEditUser(null)} style={{ width: '34px', height: '34px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: '#C5C1D6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={19} color="#C5C1D6" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {([
                { key: 'eth_balance', label: 'ETH Balance', type: 'number', step: '0.0001' },
                { key: 'hashrate_th', label: 'Hashrate (TH)', type: 'number', step: '1' },
              ] as { key: keyof UserRow; label: string; type: string; step: string }[]).map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#A39FB5', marginBottom: '7px' }}>{f.label}</label>
                  <input
                    type={f.type}
                    step={f.step}
                    value={(editUser as unknown as Record<string, number>)[f.key] || 0}
                    onChange={e => setEditUser(prev => prev ? { ...prev, [f.key]: parseFloat(e.target.value) || 0 } : null)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4F3FA', fontFamily: "'Space Grotesk'", fontSize: '15px', outline: 'none' }}
                  />
                </div>
              ))}

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#A39FB5', marginBottom: '7px' }}>VIP Tier</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {VIP_TIERS.map(tier => (
                    <button key={tier} onClick={() => setEditUser(prev => prev ? { ...prev, vip_tier: tier as unknown as number } : null)} style={{ padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontFamily: "'Manrope'", fontWeight: 700, fontSize: '12.5px', background: editUser.vip_tier === (tier as unknown as number) ? 'rgba(124,92,255,0.22)' : 'rgba(255,255,255,0.04)', border: `1px solid ${editUser.vip_tier === (tier as unknown as number) ? 'rgba(124,92,255,0.4)' : 'rgba(255,255,255,0.08)'}`, color: editUser.vip_tier === (tier as unknown as number) ? '#C9BBFF' : '#A39FB5' }}>
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#A39FB5', marginBottom: '7px' }}>Mining status</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['active', 'paused'].map(s => (
                    <button key={s} onClick={() => setEditUser(prev => prev ? { ...prev, mining_status: s } : null)} style={{ flex: 1, padding: '10px', borderRadius: '11px', cursor: 'pointer', fontFamily: "'Manrope'", fontWeight: 700, fontSize: '13px', background: editUser.mining_status === s ? (s === 'active' ? 'rgba(22,217,138,0.2)' : 'rgba(255,107,138,0.2)') : 'rgba(255,255,255,0.04)', border: `1px solid ${editUser.mining_status === s ? (s === 'active' ? 'rgba(22,217,138,0.4)' : 'rgba(255,107,138,0.4)') : 'rgba(255,255,255,0.08)'}`, color: editUser.mining_status === s ? (s === 'active' ? '#16D98A' : '#FF6B8A') : '#A39FB5', textTransform: 'capitalize' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#A39FB5', marginBottom: '7px' }}>Role</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['user', 'admin'].map(r => (
                    <button key={r} onClick={() => setEditUser(prev => prev ? { ...prev, role: r } : null)} style={{ flex: 1, padding: '10px', borderRadius: '11px', cursor: 'pointer', fontFamily: "'Manrope'", fontWeight: 700, fontSize: '13px', background: editUser.role === r ? 'rgba(255,181,92,0.18)' : 'rgba(255,255,255,0.04)', border: `1px solid ${editUser.role === r ? 'rgba(255,181,92,0.35)' : 'rgba(255,255,255,0.08)'}`, color: editUser.role === r ? '#FFB55C' : '#A39FB5', textTransform: 'capitalize' }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {saveMsg && (
                <div style={{ padding: '10px 14px', borderRadius: '12px', fontSize: '13.5px', color: saveMsg === 'Saved' ? '#16D98A' : '#FF6B8A', background: saveMsg === 'Saved' ? 'rgba(22,217,138,0.1)' : 'rgba(255,107,138,0.1)', border: `1px solid ${saveMsg === 'Saved' ? 'rgba(22,217,138,0.3)' : 'rgba(255,107,138,0.3)'}` }}>{saveMsg}</div>
              )}

              <RippleButton variant="purple" onClick={saveEdit} disabled={saving} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, color: '#fff', padding: '14px', borderRadius: '14px', background: saving ? 'rgba(124,92,255,0.5)' : '#7C5CFF', boxShadow: '0 8px 22px rgba(124,92,255,0.35)', marginTop: '4px', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : 'Save changes'}
              </RippleButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

