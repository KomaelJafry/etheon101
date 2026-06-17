'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { AppProvider, useApp } from './AppContext';
import Icon from '../../components/Icon';
import RippleButton from '../../components/RippleButton';

function EtheonLogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <polygon points="12,3 22,21 2,21" fill="white" />
    </svg>
  );
}

const NAV = [
  { href: '/dashboard',    icon: 'grid_view',              label: 'Dashboard' },
  { href: '/mining',       icon: 'bolt',                   label: 'Mining' },
  { href: '/wallet',       icon: 'account_balance_wallet', label: 'Wallet' },
  { href: '/transactions', icon: 'swap_horiz',             label: 'Transactions' },
  { href: '/withdrawals',  icon: 'north_east',             label: 'Withdrawals' },
  { href: '/settings',     icon: 'settings',               label: 'Settings' },
];

const ROUTE_META: Record<string, { title: string; sub: string }> = {
  '/dashboard':    { title: 'Dashboard',      sub: 'Your mining overview and balances' },
  '/mining':       { title: 'Mining console', sub: 'Manage hashrate and live earnings' },
  '/wallet':       { title: 'Wallet',         sub: 'Deposit, hold and convert your assets' },
  '/transactions': { title: 'Transactions',   sub: 'Every deposit, reward and withdrawal' },
  '/withdrawals':  { title: 'Withdrawals',    sub: 'Cash out your earned Ethereum' },
  '/settings':     { title: 'Settings',       sub: 'Account preferences and security' },
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

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, ethPrice } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={closeSidebar} />

      <aside className={`app-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'0 8px 24px' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'11px', background:'linear-gradient(135deg,#9b7bff,#6e8bff)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 20px rgba(124,92,255,0.5)', flexShrink:0 }}>
            <EtheonLogoMark size={20} />
          </div>
          <div>
            <div className="sg" style={{ fontWeight:700, fontSize:'17px', letterSpacing:'-0.02em', lineHeight:1 }}>Etheon</div>
            <div style={{ fontSize:'10px', color:'#6F6B82', fontWeight:700, letterSpacing:'0.06em', marginTop:'2px' }}>MINING PLATFORM</div>
          </div>
        </div>

        <nav style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className="nav-link ripple-root"
                style={{ position:'relative', display:'flex', alignItems:'center', gap:'12px', textDecoration:'none', fontWeight:active?700:600, fontSize:'14px', padding:'10px 12px', borderRadius:'12px', background:active?'rgba(124,92,255,0.16)':'transparent', color:active?'#E9E7F2':'#8A8699', overflow:'hidden' }}
                onClick={e => { closeSidebar(); addRippleToEl(e, e.currentTarget); }}
              >
                {active && <span style={{ position:'absolute', left:'-14px', top:'50%', transform:'translateY(-50%)', width:'3px', height:'20px', borderRadius:'3px', background:'#7C5CFF' }} />}
                <Icon name={icon} size={20} color={active ? '#C9BBFF' : '#6F6B82'} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', gap:'12px' }}>
          <div style={{ position:'relative', overflow:'hidden', borderRadius:'16px', padding:'16px', background:'linear-gradient(150deg,rgba(124,92,255,0.24),rgba(110,139,255,0.1))', border:'1px solid rgba(124,92,255,0.3)' }}>
            <div style={{ position:'absolute', top:'-28px', right:'-28px', width:'80px', height:'80px', borderRadius:'50%', background:'radial-gradient(circle,rgba(155,123,255,0.55),transparent 70%)', pointerEvents:'none' }} />
            <div className="sg" style={{ fontWeight:700, fontSize:'13.5px', marginBottom:'4px' }}>Upgrade hashrate</div>
            <div style={{ fontSize:'11.5px', color:'#B9B4CC', lineHeight:1.45, marginBottom:'12px' }}>Add power and boost your daily ETH yield.</div>
            <RippleButton variant="purple" onClick={() => { closeSidebar(); router.push('/mining'); }} style={{ display:'block', width:'100%', fontSize:'13px', color:'#fff', padding:'9px', borderRadius:'11px', boxShadow:'0 6px 18px rgba(124,92,255,0.45)' }}>
              Upgrade now
            </RippleButton>
          </div>

          <div className="card-hover ripple-root" onClick={handleSignOut}
            style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px', borderRadius:'13px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', cursor:'pointer', position:'relative', overflow:'hidden' }}
            onMouseDown={e => addRippleToEl(e, e.currentTarget as HTMLDivElement)}
          >
            <div style={{ width:'34px', height:'34px', borderRadius:'10px', background:'linear-gradient(135deg,#3a3550,#222031)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Space Grotesk'", fontWeight:700, fontSize:'13px', color:'#C9BBFF', flexShrink:0 }}>
              {profile ? initials(profile.full_name || 'U') : '?'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'13px', fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{profile?.full_name || 'My account'}</div>
              <div style={{ fontSize:'11px', color:'#6F6B82', marginTop:'1px' }}>{VIP_LABEL[profile?.vip_tier ?? 0]} tier</div>
            </div>
            <Icon name="expand_more" size={17} color="#6F6B82" />
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

            <RippleButton variant="ghost" style={{ width:'40px', height:'40px', borderRadius:'999px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, padding:0 }}>
              <Icon name="notifications" size={20} color="#C5C1D6" />
              <span className="notif-badge" />
            </RippleButton>

            <RippleButton variant="purple" onClick={() => router.push('/wallet')} style={{ display:'flex', alignItems:'center', gap:'6px', height:'40px', padding:'0 18px', borderRadius:'999px', fontSize:'13.5px', color:'#fff', whiteSpace:'nowrap', flexShrink:0 }}>
              <Icon name="add" size={17} color="#fff" />
              Deposit
            </RippleButton>
          </div>
        </header>

        <div className="app-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <Shell>{children}</Shell>
    </AppProvider>
  );
}
