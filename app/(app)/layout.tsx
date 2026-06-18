'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { AppProvider, useApp } from './AppContext';
import Icon from '../../components/Icon';
import RippleButton from '../../components/RippleButton';
import { ToastProvider } from '../../components/Toast';
import { EtheonCrystal } from '../../components/EtheonBrand';

const NAV = [
  { href: '/dashboard',    icon: 'grid_view',              label: 'Dashboard' },
  { href: '/mining',       icon: 'bolt',                   label: 'Mining' },
  { href: '/wallet',       icon: 'account_balance_wallet', label: 'Wallet' },
  { href: '/transactions', icon: 'swap_horiz',             label: 'Transactions' },
  { href: '/withdrawals',  icon: 'north_east',             label: 'Withdrawals' },
  { href: '/account',      icon: 'verified_user',          label: 'Account status' },
  { href: '/settings',     icon: 'settings',               label: 'Settings' },
];

const ROUTE_META: Record<string, { title: string; sub: string }> = {
  '/dashboard':    { title: 'Dashboard',       sub: 'Your mining overview and balances' },
  '/mining':       { title: 'Mining console',  sub: 'Manage hashrate and live earnings' },
  '/wallet':       { title: 'Wallet',          sub: 'Deposit, hold and convert your assets' },
  '/transactions': { title: 'Transactions',    sub: 'Every deposit, reward and withdrawal' },
  '/withdrawals':  { title: 'Withdrawals',     sub: 'Cash out your earned Ethereum' },
  '/account':      { title: 'Account status',  sub: 'Your verification progress and unlock status' },
  '/settings':     { title: 'Settings',        sub: 'Account preferences and security' },
};

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

const VIP_LABEL = ['Standard', 'Bronze', 'Silver', 'Gold', 'Platinum'];

function addRippleToEl(e: React.MouseEvent, el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.4;
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;
  const wave = document.createElement('span');
  wave.className = 'ripple-wave';
  wave.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
  el.appendChild(wave);
  setTimeout(() => wave.remove(), 600);
}

function UpgradeModal({ onClose }: { onClose: () => void }) {
  const [period, setPeriod] = useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function startCheckout() {
    setLoading(true); setErr('');
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing_period: period }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setErr(data.error || 'Unable to start checkout. Please try again.');
        setLoading(false);
      }
    } catch {
      setErr('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', padding:'20px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width:'100%', maxWidth:'420px', borderRadius:'28px', padding:'30px', background:'#111020', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 40px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
          <div style={{ fontFamily:"'Space Grotesk'", fontWeight:700, fontSize:'20px' }}>Upgrade your plan</div>
          <button onClick={onClose} style={{ width:'34px', height:'34px', borderRadius:'10px', border:'none', cursor:'pointer', background:'rgba(255,255,255,0.06)', color:'#C5C1D6', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="close" size={19} color="#C5C1D6" />
          </button>
        </div>
        <div style={{ fontSize:'13px', color:'#8A8699', marginBottom:'22px' }}>Choose a billing period to add hashrate and boost your daily earnings.</div>

        <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'20px' }}>
          {(['monthly', 'annual'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'16px', borderRadius:'16px', background: period===p ? 'rgba(155,123,255,0.16)' : 'rgba(255,255,255,0.04)', border:`1.5px solid ${period===p ? 'rgba(155,123,255,0.45)' : 'rgba(255,255,255,0.08)'}`, cursor:'pointer', textAlign:'left', width:'100%', fontFamily:"'Manrope',sans-serif" }}>
              <div style={{ width:'20px', height:'20px', borderRadius:'50%', border:`2px solid ${period===p ? '#9B7BFF' : 'rgba(255,255,255,0.2)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {period===p && <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:'#9B7BFF' }} />}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:'14px', color:'#F4F3FA', textTransform:'capitalize' }}>{p}</div>
                <div style={{ fontSize:'12px', color:'#8A8699', marginTop:'2px' }}>{p==='annual' ? 'Save up to 20% vs monthly' : 'Billed each month, cancel anytime'}</div>
              </div>
              {p==='annual' && <span style={{ marginLeft:'auto', fontSize:'11px', fontWeight:700, color:'#16D98A', background:'rgba(22,217,138,0.14)', padding:'3px 8px', borderRadius:'999px', flexShrink:0 }}>Best value</span>}
            </button>
          ))}
        </div>

        {err && <div style={{ padding:'10px 14px', borderRadius:'12px', marginBottom:'14px', background:'rgba(255,107,138,0.1)', border:'1px solid rgba(255,107,138,0.3)', fontSize:'13px', color:'#FF6B8A' }}>{err}</div>}

        <RippleButton variant="purple" onClick={startCheckout} disabled={loading} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontSize:'15px', fontWeight:700, color:'#fff', padding:'15px', borderRadius:'14px', background: loading ? 'rgba(155,123,255,0.5)' : '#9B7BFF', boxShadow:'0 8px 22px rgba(155,123,255,0.35)', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Redirecting…' : 'Continue to payment'}
          {!loading && <Icon name="arrow_forward" size={18} color="#fff" />}
        </RippleButton>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, ethPrice } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const meta = ROUTE_META[pathname] ?? { title: 'Etheon', sub: '' };
  const closeSidebar = () => setSidebarOpen(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="app-shell">
      {upgradeOpen && <UpgradeModal onClose={() => setUpgradeOpen(false)} />}

      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={closeSidebar} />

      <aside className={`app-sidebar${sidebarOpen ? ' open' : ''}`}>
        <Link href="/dashboard" style={{ display:'flex', alignItems:'center', gap:'10px', padding:'0 8px 24px', textDecoration:'none', color:'inherit' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'11px', background:'linear-gradient(135deg,#9B7BFF,#6E8BFF)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 20px rgba(155,123,255,0.5)', flexShrink:0 }}>
            <EtheonCrystal size={21} />
          </div>
          <div>
            <div className="sg" style={{ fontWeight:700, fontSize:'17px', letterSpacing:'-0.02em', lineHeight:1 }}>Etheon</div>
            <div style={{ fontSize:'10px', color:'#6F6B82', fontWeight:700, letterSpacing:'0.06em', marginTop:'2px' }}>MINING PLATFORM</div>
          </div>
        </Link>

        <nav style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className="nav-link ripple-root"
                style={{ position:'relative', display:'flex', alignItems:'center', gap:'12px', textDecoration:'none', fontWeight:active?700:600, fontSize:'14px', padding:'10px 12px', borderRadius:'12px', background:active?'rgba(155,123,255,0.16)':'transparent', color:active?'#E9E7F2':'#8A8699', overflow:'hidden' }}
                onClick={e => { closeSidebar(); addRippleToEl(e, e.currentTarget); }}
              >
                {active && <span style={{ position:'absolute', left:'-14px', top:'50%', transform:'translateY(-50%)', width:'3px', height:'20px', borderRadius:'3px', background:'#9B7BFF' }} />}
                <Icon name={icon} size={20} color={active ? '#C9BBFF' : '#6F6B82'} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', gap:'12px' }}>
          <div style={{ position:'relative', overflow:'hidden', borderRadius:'16px', padding:'16px', background:'linear-gradient(150deg,rgba(155,123,255,0.24),rgba(110,139,255,0.1))', border:'1px solid rgba(155,123,255,0.3)' }}>
            <div style={{ position:'absolute', top:'-28px', right:'-28px', width:'80px', height:'80px', borderRadius:'50%', background:'radial-gradient(circle,rgba(155,123,255,0.55),transparent 70%)', pointerEvents:'none' }} />
            <div className="sg" style={{ fontWeight:700, fontSize:'13.5px', marginBottom:'4px' }}>Upgrade hashrate</div>
            <div style={{ fontSize:'11.5px', color:'#B9B4CC', lineHeight:1.45, marginBottom:'12px' }}>Add power and boost your daily ETH yield.</div>
            <RippleButton variant="purple" onClick={() => { closeSidebar(); setUpgradeOpen(true); }} style={{ display:'block', width:'100%', fontSize:'13px', color:'#fff', padding:'9px', borderRadius:'11px', boxShadow:'0 6px 18px rgba(155,123,255,0.45)' }}>
              Upgrade now
            </RippleButton>
          </div>

          {/* Profile chip → navigate to /settings */}
          <div className="card-hover ripple-root" onClick={() => { closeSidebar(); router.push('/settings'); }}
            style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px', borderRadius:'13px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', cursor:'pointer', position:'relative', overflow:'hidden' }}
            onMouseDown={e => addRippleToEl(e, e.currentTarget as HTMLDivElement)}
          >
            <div style={{ width:'34px', height:'34px', borderRadius:'10px', background:'linear-gradient(135deg,#3a3550,#222031)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Space Grotesk'", fontWeight:700, fontSize:'13px', color:'#C9BBFF', flexShrink:0 }}>
              {profile ? initials(profile.full_name || 'U') : '?'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'13px', fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{profile?.full_name || 'My account'}</div>
              <div style={{ fontSize:'11px', color:'#6F6B82', marginTop:'1px' }}>{VIP_LABEL[Math.min(profile?.vip_tier ?? 0, 4)]} tier</div>
            </div>
            <Icon name="settings" size={17} color="#6F6B82" />
          </div>
        </div>
      </aside>

      <main className="app-main">
        <header className="app-topbar">
          <RippleButton variant="ghost" className="sidebar-toggle-btn" onClick={() => setSidebarOpen(o => !o)} style={{ padding:0 }}>
            <Icon name="menu" size={22} color="#C5C1D6" />
          </RippleButton>

          <div style={{ flexShrink:0, minWidth:0, flex:'0 1 auto' }}>
            <h1 className="sg" style={{ margin:0, fontWeight:700, fontSize:'21px', letterSpacing:'-0.025em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{meta.title}</h1>
            <div style={{ fontSize:'12.5px', color:'#6F6B82', marginTop:'2px' }}>{meta.sub}</div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:'9px', flex:1, justifyContent:'flex-end', minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', height:'40px', padding:'0 14px', borderRadius:'999px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', color:'#6F6B82', fontSize:'13px', maxWidth:'220px', flex:'1 1 auto', overflow:'hidden', cursor:'text', minWidth:0 }}>
              <Icon name="search" size={17} color="#6F6B82" style={{ flexShrink:0 }} />
              <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>Search…</span>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:'8px', height:'40px', padding:'0 14px', borderRadius:'999px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
              <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:'linear-gradient(135deg,#5b7fff,#9b7bff)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="verified_user" size={12} color="#fff" />
              </div>
              <span className="sg" style={{ fontWeight:700, fontSize:'13px' }}>${ethPrice.toFixed(2)}</span>
              <span style={{ fontSize:'12px', fontWeight:700, color:'#16D98A' }}>+2.4%</span>
            </div>

            <div style={{ position:'relative' }}>
              <RippleButton variant="ghost" onClick={() => setNotifOpen(o => !o)} style={{ width:'40px', height:'40px', borderRadius:'999px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, padding:0 }}>
                <Icon name="notifications" size={20} color="#C5C1D6" />
                <span className="notif-badge" />
              </RippleButton>
              {notifOpen && (
                <>
                  <div style={{ position:'fixed', inset:0, zIndex:49 }} onClick={() => setNotifOpen(false)} />
                  <div style={{ position:'absolute', top:'48px', right:0, zIndex:50, width:'280px', borderRadius:'18px', padding:'16px', background:'#111020', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 20px 50px rgba(0,0,0,0.5)' }}>
                    <div style={{ fontWeight:700, fontSize:'14px', marginBottom:'12px' }}>Notifications</div>
                    <div style={{ textAlign:'center', padding:'20px 0' }}>
                      <Icon name="notifications_none" size={32} color="#3A3750" />
                      <div style={{ fontSize:'13px', color:'#6F6B82', marginTop:'8px' }}>No new notifications</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <RippleButton variant="purple" onClick={() => router.push('/deposit')} style={{ display:'flex', alignItems:'center', gap:'6px', height:'40px', padding:'0 18px', borderRadius:'999px', fontSize:'13.5px', color:'#fff', whiteSpace:'nowrap', flexShrink:0 }}>
              <Icon name="add" size={17} color="#fff" />
              Deposit
            </RippleButton>
          </div>
        </header>

        <div className="app-content">
          {children}
        </div>
      </main>

      {/* Hidden sign-out trigger — invoked from settings page */}
      <button id="__signout" style={{ display:'none' }} onClick={handleSignOut} />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </AppProvider>
  );
}
