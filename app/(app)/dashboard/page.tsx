'use client';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useApp } from '../AppContext';
import Icon from '../../../components/Icon';
import RippleButton from '../../../components/RippleButton';
import UnlockProgressCard from '../../../components/UnlockProgressCard';
import { useContent } from '../../../hooks/useContent';

type Period = '30D' | '90D' | 'All';

async function startSubscribeCheckout(): Promise<{ url: string }> {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'growth' }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

interface Txn {
  id: string; type: string; amount_eth: number;
  status: string; description: string; created_at: string;
}

function makeSparkline(balance: number, seed: number, points: number) {
  const n = points;
  const pts: number[] = [];
  let cur = 0;
  let rng = seed;
  function rand() { rng = (rng * 1664525 + 1013904223) & 0xffffffff; return (rng >>> 0) / 0xffffffff; }
  for (let i = 0; i < n; i++) { cur += (balance / n) * (0.3 + rand() * 1.2); pts.push(cur); }
  const max = Math.max(...pts), min = Math.min(...pts);
  const W = 600, H = 100;
  const mapped = pts.map((v, i) => ({ x: (i / (n - 1)) * W, y: H - ((v - min) / (max - min || 1)) * H * 0.88 - H * 0.06 }));
  const line = 'M ' + mapped.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ');
  return { line, area: line + ` L ${W},${H} L 0,${H} Z`, vb: `0 0 ${W} ${H}` };
}

const PERIOD_LABELS: Record<Period, string[]> = {
  '30D': ['May 24', 'May 28', 'Jun 3', 'Jun 10', 'Jun 17'],
  '90D': ['Mar 18', 'Apr 5', 'Apr 22', 'May 9', 'Jun 17'],
  'All': ['Jan 1', 'Feb 15', 'Apr 1', 'May 10', 'Jun 17'],
};
const PERIOD_POINTS: Record<Period, number> = { '30D': 20, '90D': 40, 'All': 60 };
const PERIOD_SEED: Record<Period, number> = { '30D': 12345, '90D': 67890, 'All': 99999 };

const TX_ICON: Record<string, { icon: string; bg: string; fg: string }> = {
  mining_reward: { icon: 'bolt',       bg: 'rgba(124,92,255,0.18)', fg: '#C9BBFF' },
  deposit:       { icon: 'add',        bg: 'rgba(22,217,138,0.16)', fg: '#16D98A' },
  withdrawal:    { icon: 'north_east', bg: 'rgba(255,107,138,0.16)', fg: '#FF6B8A' },
  adjustment:    { icon: 'tune',       bg: 'rgba(255,181,92,0.16)',  fg: '#FFB55C' },
};
const txMeta = (t: string) => TX_ICON[t] ?? { icon: 'swap_horiz', bg: 'rgba(255,255,255,0.08)', fg: '#C5C1D6' };
const VIP_LABEL = ['Standard', 'Bronze', 'Silver', 'Gold', 'Platinum'];

function SkeletonCard({ h = 80 }: { h?: number }) {
  return <div className="skeleton" style={{ height: h, borderRadius: '16px', margin: '8px 0' }} />;
}

export default function DashboardPage() {
  const { profile, ethPrice, loading: appLoading } = useApp();
  const { get } = useContent(['mining']);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const [txns, setTxns]       = useState<Txn[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [liveEth, setLiveEth] = useState(0);
  const [gaugeOffset, setGaugeOffset] = useState(163);
  const [period, setPeriod]   = useState<Period>('30D');
  const C = 2 * Math.PI * 52;

  const spark = useMemo(
    () => makeSparkline(profile?.eth_balance ?? 0.5, PERIOD_SEED[period], PERIOD_POINTS[period]),
    [profile?.eth_balance, period]
  );

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
      if (data) setTxns(data);
      setTxLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- supabase client is stable

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!profile) return;
    setLiveEth(profile.eth_balance);
    setGaugeOffset(C * (1 - (profile.hashrate_capacity_th > 0 ? Math.min(1, profile.hashrate_th / profile.hashrate_capacity_th) : 0.5)));
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!profile || profile.mining_status !== 'active') return;
    const rate = (profile.hashrate_th * 0.000000032) / 3600;
    const id = setInterval(() => setLiveEth(e => e + rate), 1000);
    return () => clearInterval(id);
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const cap = profile.hashrate_capacity_th || 100;
    let cur = (profile.hashrate_th / cap) * 100;
    const id = setInterval(() => { cur = Math.max(0, Math.min(100, cur + (Math.random() - 0.5) * 0.5)); setGaugeOffset(C * (1 - cur / 100)); }, 120);
    return () => clearInterval(id);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps -- C is a constant derived from Math.PI

  const usdBal  = (liveEth * ethPrice + (profile?.gbp_balance ?? 0)).toFixed(2);
  const vipTier = profile?.vip_tier ?? 0;
  const util    = profile && profile.hashrate_capacity_th > 0 ? Math.round((profile.hashrate_th / profile.hashrate_capacity_th) * 100) : 50;

  const allocation = [
    { label: 'Active miners',   val: `£${(liveEth * ethPrice * 0.62).toFixed(2)}`, pct: 62, color: '#9b7bff' },
    { label: 'Wallet balance',  val: `£${(liveEth * ethPrice * 0.27).toFixed(2)}`, pct: 27, color: '#6e8bff' },
    { label: 'Pending rewards', val: `£${(liveEth * ethPrice * 0.11).toFixed(2)}`, pct: 11, color: '#16D98A' },
  ];

  const quickActions = [
    { icon: 'add',          label: 'Deposit',  href: '/deposit' },
    { icon: 'north_east',   label: 'Withdraw', href: '/withdrawals' },
    { icon: 'shopping_bag', label: 'Buy ETH',  href: '/wallet' },
    { icon: 'swap_vert',    label: 'Convert',  href: '/wallet' },
  ];

  async function handleSubscribe() {
    if (!profile) { window.location.href = '/login'; return; }
    setSubLoading(true);
    setSubError(null);
    try {
      const { url } = await startSubscribeCheckout();
      if (url) window.location.href = url;
      else setSubError('No checkout URL returned. Please try again.');
    } catch (err) {
      setSubError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubLoading(false);
    }
  }

  function addRipple(e: React.MouseEvent, el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.6;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const wave = document.createElement('span');
    wave.className = 'ripple-wave';
    wave.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
    el.appendChild(wave);
    setTimeout(() => wave.remove(), 600);
  }

  const isLoading = appLoading;

  const miningThreshold = parseFloat(get('mining', 'mining_minimum_start_balance_usd', '100')) || 100;
  const withdrawThreshold = parseFloat(get('mining', 'withdrawal_unlock_balance_usd', '1000')) || 1000;
  const depositHref = get('mining', 'deposit_cta_href', '/deposit');
  const gbpBalance  = profile?.gbp_balance ?? 0;
  const balanceUsd  = (profile?.eth_balance ?? 0) * ethPrice + (profile?.gbp_balance ?? 0);
  const isSubscribed =
    (profile?.is_active ?? false) ||
    (profile?.admin_subscription_override === true && profile?.admin_subscription_status === 'active');
  const miningUnlocked = isSubscribed && balanceUsd >= miningThreshold;
  const withdrawalUnlocked = balanceUsd >= withdrawThreshold;

  return (
    <div className="resp-grid-2-lheavy">

      {/* LEFT */}
      <div style={{ display:'flex', flexDirection:'column', gap:'18px', minWidth:0 }}>

        {/* Balance hero */}
        <div className="anim-slide-up" style={{ position:'relative', overflow:'hidden', borderRadius:'24px', padding:'24px 26px', background:'linear-gradient(160deg,rgba(124,92,255,0.14),rgba(255,255,255,0.02) 60%)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ position:'absolute', top:'-50px', right:'-30px', width:'220px', height:'220px', borderRadius:'50%', background:'radial-gradient(circle,rgba(124,92,255,0.3),transparent 65%)', pointerEvents:'none' }} />
          <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'12px' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'7px', fontSize:'12.5px', color:'#A39FB5', fontWeight:600 }}>
                <Icon name="account_balance_wallet" size={16} color="#A39FB5" />
                Total balance
              </div>
              {isLoading ? <SkeletonCard h={52} /> : (
                <div style={{ display:'flex', alignItems:'flex-end', gap:'12px', marginTop:'10px' }}>
                  <div className="sg" style={{ fontWeight:700, fontSize:'44px', letterSpacing:'-0.03em', lineHeight:'0.95' }}>£{usdBal}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:'4px', background:'rgba(22,217,138,0.14)', color:'#16D98A', fontWeight:700, fontSize:'12.5px', padding:'4px 10px', borderRadius:'999px', marginBottom:'5px' }}>
                    <Icon name="trending_up" size={14} color="#16D98A" />+2.41%
                  </div>
                </div>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'10px', fontSize:'13.5px', color:'#A39FB5' }}>
                <div style={{ width:'17px', height:'17px', borderRadius:'50%', background:'linear-gradient(135deg,#6e8bff,#9b7bff)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name="diamond" size={11} color="#fff" />
                </div>
                <span className="sg" style={{ color:'#E9E7F2', fontWeight:600 }}>{liveEth.toFixed(6)} ETH</span>
              </div>
              {gbpBalance > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'6px', fontSize:'13px', color:'#A39FB5' }}>
                  <Icon name="currency_pound" size={16} color="#16D98A" />
                  <span style={{ color:'#16D98A', fontWeight:700 }}>£{gbpBalance.toFixed(2)} in account</span>
                </div>
              )}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(22,217,138,0.1)', border:'1px solid rgba(22,217,138,0.25)', padding:'7px 13px', borderRadius:'999px', flexShrink:0 }}>
              <span className="anim-pulse" style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#16D98A', boxShadow:'0 0 8px #16D98A', display:'inline-block' }} />
              <span style={{ fontSize:'12px', fontWeight:700, color:'#16D98A' }}>{profile?.mining_status === 'active' ? 'Earning live' : 'Mining paused'}</span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="resp-grid-4" style={{ marginTop:'22px' }}>
            {quickActions.map(qa => (
              <Link key={qa.label} href={qa.href} style={{ textDecoration:'none' }}>
                <div className="ripple-root card-hover"
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', padding:'14px 8px', borderRadius:'16px', border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', cursor:'pointer', position:'relative', overflow:'hidden' }}
                  onMouseDown={e => addRipple(e, e.currentTarget as HTMLDivElement)}
                >
                  <Icon name={qa.icon} size={22} color="#C9BBFF" />
                  <span style={{ fontSize:'12.5px', fontWeight:700, color:'#E9E7F2', textAlign:'center' }}>{qa.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Earnings chart */}
        <div style={{ borderRadius:'24px', padding:'22px 24px', background:'linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px', flexWrap:'wrap', gap:'10px' }}>
            <div>
              <div className="sg" style={{ fontWeight:700, fontSize:'16px' }}>Mining earnings</div>
              <div style={{ fontSize:'12px', color:'#6F6B82', marginTop:'2px' }}>Rewards accumulated over time</div>
            </div>
            <div style={{ display:'flex', gap:'2px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'999px', padding:'3px' }}>
              {(['30D', '90D', 'All'] as Period[]).map((t) => (
                <RippleButton key={t} variant="none" onClick={() => setPeriod(t)}
                  style={{ fontSize:'12px', fontWeight:period===t?700:600, color:period===t?'#0B0A14':'#8A8699', background:period===t?'#fff':'transparent', padding:'5px 12px', borderRadius:'999px' }}>
                  {t}
                </RippleButton>
              ))}
            </div>
          </div>
          {isLoading ? <SkeletonCard h={150} /> : (
            <svg key={period} viewBox={spark.vb} preserveAspectRatio="none" style={{ width:'100%', height:'150px', display:'block', overflow:'visible' }}>
              <defs>
                <linearGradient id="dashArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="rgba(124,92,255,0.4)" />
                  <stop offset="1" stopColor="rgba(124,92,255,0)" />
                </linearGradient>
              </defs>
              <path d={spark.area} fill="url(#dashArea)" />
              <path d={spark.line} fill="none" stroke="#9b7bff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#6F6B82', marginTop:'8px' }} className="sg">
            {PERIOD_LABELS[period].map(l => <span key={l}>{l}</span>)}
          </div>
        </div>

        {/* Recent activity */}
        <div style={{ borderRadius:'24px', padding:'20px 22px', background:'linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
            <div className="sg" style={{ fontWeight:700, fontSize:'16px' }}>Recent activity</div>
            <Link href="/transactions" style={{ display:'flex', alignItems:'center', gap:'4px', color:'#C9BBFF', fontWeight:700, fontSize:'12.5px', textDecoration:'none' }}>
              View all <Icon name="arrow_forward" size={15} color="#C9BBFF" />
            </Link>
          </div>
          {txLoading ? (
            [1,2,3].map(i => <SkeletonCard key={i} h={56} />)
          ) : txns.length === 0 ? (
            <div style={{ padding:'32px', textAlign:'center' }}>
              <Icon name="swap_horiz" size={36} color="#3A3750" />
              <div style={{ marginTop:'12px', fontSize:'14px', fontWeight:700, color:'#6F6B82' }}>No transactions yet</div>
              <div style={{ fontSize:'13px', color:'#4A4763', marginTop:'4px' }}>Start mining to earn your first reward.</div>
            </div>
          ) : txns.map(t => {
            const m = txMeta(t.type);
            const label = t.type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
            const positive = t.amount_eth >= 0;
            return (
              <div key={t.id} className="card-hover" style={{ display:'flex', alignItems:'center', gap:'13px', padding:'12px 0', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width:'40px', height:'40px', borderRadius:'13px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:m.bg }}>
                  <Icon name={m.icon} size={20} color={m.fg} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'13.5px', fontWeight:700 }}>{label}</div>
                  <div style={{ fontSize:'11.5px', color:'#6F6B82', marginTop:'2px' }}>{new Date(t.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div className="sg" style={{ fontWeight:700, fontSize:'13.5px', color:positive?'#16D98A':'#FF6B8A' }}>{positive?'+':''}{t.amount_eth.toFixed(6)} ETH</div>
                  <div style={{ fontSize:'11px', color:'#6F6B82', marginTop:'2px' }}>£{Math.abs(t.amount_eth * ethPrice).toFixed(2)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ display:'flex', flexDirection:'column', gap:'18px', minWidth:0 }}>

        {/* Subscription conversion panel — shown only for unsubscribed users */}
        {!isSubscribed && (
          <div className="anim-slide-up" style={{ borderRadius:'24px', padding:'24px', background:'linear-gradient(160deg,rgba(124,92,255,0.14),rgba(11,10,20,0.5))', border:'1px solid rgba(124,92,255,0.28)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
              <Icon name="lock" size={18} color="#FF6B8A" />
              <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'14px', color:'#FF6B8A' }}>Rewards Mining Locked</span>
            </div>
            <p style={{ fontSize:'13px', color:'#8A8699', lineHeight:1.55, margin:'0 0 18px' }}>
              An active subscription is required to participate in Etheon Rewards Mining. Activate a plan to unlock mining sessions and reward cycles.
            </p>
            <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:'13px', padding:'14px', marginBottom:'16px', border:'1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#6F6B82', letterSpacing:'0.05em', marginBottom:'10px' }}>WHAT YOU UNLOCK</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'7px' }}>
                {[['bolt','Mining session activation'],['loop','Daily reward cycles'],['trending_up','Progress tracking'],['analytics','Account analytics']].map(([icon, label]) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <Icon name={icon} size={15} color="#9B7BFF" />
                    <span style={{ fontSize:'13px', color:'#C5C1D6' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={handleSubscribe} disabled={subLoading}
              style={{ width:'100%', padding:'13px', borderRadius:'13px', background:'#7C5CFF', border:'none', color:'#fff', fontWeight:700, fontSize:'14px', cursor:subLoading?'not-allowed':'pointer', opacity:subLoading?0.7:1, boxShadow:'0 8px 22px rgba(124,92,255,0.42)', marginBottom:'8px' }}>
              {subLoading ? 'Redirecting to checkout…' : 'Choose Growth — Most Popular'}
            </button>
            {subError && <div style={{ padding:'10px 12px', borderRadius:'10px', background:'rgba(255,107,138,0.1)', border:'1px solid rgba(255,107,138,0.25)', fontSize:'12.5px', color:'#FF6B8A', marginBottom:'8px' }}>{subError}</div>}
            <div style={{ textAlign:'center' }}>
              <a href="/pricing" style={{ fontSize:'12.5px', color:'#6F6B82', fontWeight:600, textDecoration:'none' }}>Compare plans →</a>
            </div>
          </div>
        )}

        {/* Mining status */}
        <div className="anim-slide-up" style={{ position:'relative', overflow:'hidden', borderRadius:'24px', padding:'22px', background:'linear-gradient(170deg,rgba(124,92,255,0.12),rgba(11,10,20,0.5))', border:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
            <div className="sg" style={{ fontWeight:700, fontSize:'15px' }}>Mining status</div>
            <div style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', fontWeight:700, color:profile?.mining_status==='active'?'#16D98A':'#FF6B8A' }}>
              <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:profile?.mining_status==='active'?'#16D98A':'#FF6B8A', boxShadow:`0 0 7px ${profile?.mining_status==='active'?'#16D98A':'#FF6B8A'}`, display:'inline-block' }} />
              {profile?.mining_status === 'active' ? 'Active' : 'Paused'}
            </div>
          </div>

          <div style={{ position:'relative', width:'190px', height:'190px', margin:'6px auto 4px' }}>
            <div className="anim-glow-fast" style={{ position:'absolute', inset:'12px', borderRadius:'50%', background:'radial-gradient(circle,rgba(124,92,255,0.28),transparent 68%)' }} />
            <svg viewBox="0 0 130 130" style={{ position:'absolute', inset:0, width:'100%', height:'100%', transform:'rotate(-90deg)' }}>
              <defs>
                <linearGradient id="dashRing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#9b7bff" /><stop offset="1" stopColor="#6e8bff" />
                </linearGradient>
              </defs>
              <circle cx="65" cy="65" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
              <circle cx="65" cy="65" r="52" fill="none" stroke="url(#dashRing)" strokeWidth="9" strokeLinecap="round"
                strokeDasharray={C.toFixed(1)} strokeDashoffset={gaugeOffset.toFixed(1)}
                style={{ transition:'stroke-dashoffset .5s ease', filter:'drop-shadow(0 0 6px rgba(124,92,255,0.6))' }} />
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <div style={{ fontSize:'10px', color:'#A39FB5', fontWeight:700, letterSpacing:'0.05em' }}>HASHRATE</div>
              {isLoading ? <SkeletonCard h={36} /> : (
                <>
                  <div className="sg" style={{ fontWeight:700, fontSize:'32px', letterSpacing:'-0.02em', lineHeight:1, marginTop:'2px' }}>{(profile?.hashrate_th ?? 0).toFixed(1)}</div>
                  <div style={{ fontSize:'11.5px', color:'#6F6B82', marginTop:'1px' }}>TH/s · {util}%</div>
                </>
              )}
            </div>
          </div>

          <RippleButton variant="purple" onClick={() => window.location.href='/mining'} style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', marginTop:'8px', fontSize:'13.5px', color:'#fff', padding:'12px', borderRadius:'13px', boxShadow:'0 8px 22px rgba(124,92,255,0.42)' }}>
            Open mining console
          </RippleButton>
        </div>

        {/* Portfolio allocation */}
        <div style={{ borderRadius:'24px', padding:'20px 22px', background:'linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div className="sg" style={{ fontWeight:700, fontSize:'15px', marginBottom:'14px' }}>Portfolio allocation</div>
          {isLoading ? <SkeletonCard h={8} /> : (
            <div style={{ display:'flex', height:'8px', borderRadius:'999px', overflow:'hidden', gap:'3px', marginBottom:'16px' }}>
              {allocation.map(a => <div key={a.label} style={{ height:'100%', borderRadius:'999px', width:`${a.pct}%`, background:a.color }} />)}
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:'11px' }}>
            {allocation.map(a => (
              <div key={a.label} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{ width:'8px', height:'8px', borderRadius:'3px', background:a.color, flexShrink:0 }} />
                <span style={{ flex:1, fontSize:'13px', color:'#C5C1D6', fontWeight:600 }}>{a.label}</span>
                {isLoading ? <SkeletonCard h={14} /> : (
                  <>
                    <span className="sg" style={{ fontWeight:600, fontSize:'13px' }}>{a.val}</span>
                    <span style={{ fontSize:'11.5px', color:'#6F6B82', width:'30px', textAlign:'right' }}>{a.pct}%</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mining unlock progress */}
        <UnlockProgressCard
          title={get('mining','mining_unlock_title','Unlock Rewards Mining')}
          body={get('mining','mining_unlock_body',`Reach £${miningThreshold} balance and subscribe to start earning daily rewards.`)}
          currentUsd={balanceUsd}
          targetUsd={miningThreshold}
          ctaLabel={!isSubscribed ? 'Subscribe to unlock' : miningUnlocked ? 'Go to mining' : get('mining','mining_unlock_cta_label','Add funds to unlock')}
          ctaHref={!isSubscribed ? '#' : miningUnlocked ? '/mining' : depositHref}
          onCtaClick={!isSubscribed ? handleSubscribe : undefined}
          ctaLoading={!isSubscribed ? subLoading : undefined}
          ctaError={!isSubscribed ? subError : undefined}
          unlocked={miningUnlocked}
          unlockedLabel={get('mining','mining_ready_text','Mining active')}
        />

        {/* Estimated rewards preview — shown to unsubscribed users */}
        {!isSubscribed && (
          <div style={{ borderRadius:'20px', padding:'20px 22px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
              <Icon name="info" size={16} color="#FFB55C" />
              <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'14px' }}>Reward Examples</span>
            </div>
            <p style={{ fontSize:'12px', color:'#6F6B82', lineHeight:1.55, margin:'0 0 14px' }}>
              Illustrative examples only. Actual rewards depend on account status, activity, platform rules, and eligibility requirements. Not guaranteed.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {[['Daily','£20 – £50'],['Weekly','£140 – £350'],['Monthly','£600 – £1,500']].map(([label, range]) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 13px', borderRadius:'11px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize:'13px', color:'#A39FB5', fontWeight:600 }}>{label} example</span>
                  <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'14px', color:'#C9BBFF' }}>{range}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Withdrawal unlock progress */}
        <UnlockProgressCard
          title={get('mining','withdrawal_unlock_title','Withdrawal Unlock Progress')}
          body={get('mining','withdrawal_unlock_body',`Withdrawals unlock at £${withdrawThreshold.toLocaleString()} total balance.`)}
          currentUsd={balanceUsd}
          targetUsd={withdrawThreshold}
          ctaLabel={withdrawalUnlocked ? get('mining','withdrawal_unlock_cta_label','Request withdrawal') : 'Build your balance'}
          ctaHref={withdrawalUnlocked ? '/withdrawals' : depositHref}
          unlocked={withdrawalUnlocked}
          unlockedLabel="Withdrawals unlocked"
          accentColor="#16D98A"
        />

        {/* VIP status — 5 tiers: Standard Bronze Silver Gold Platinum */}
        <div style={{ borderRadius:'24px', padding:'20px 22px', background:'linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
            <div className="sg" style={{ fontWeight:700, fontSize:'15px' }}>VIP status</div>
            <span style={{ fontSize:'12px', fontWeight:700, color:'#C9BBFF', background:'rgba(124,92,255,0.16)', padding:'4px 11px', borderRadius:'999px' }}>{VIP_LABEL[Math.min(vipTier, 4)]}</span>
          </div>
          {/* 5 tiers = 5 dots at 0%, 25%, 50%, 75%, 100% */}
          <div style={{ position:'relative', height:'5px', borderRadius:'999px', background:'rgba(255,255,255,0.07)', margin:'8px 4px 18px' }}>
            <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${(vipTier / 4) * 100}%`, borderRadius:'999px', background:'linear-gradient(90deg,#9b7bff,#6e8bff)', transition:'width 0.5s ease' }} />
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{ position:'absolute', top:'50%', transform:'translate(-50%,-50%)', left:`${(i / 4) * 100}%`, width:'16px', height:'16px', borderRadius:'50%', background:i <= vipTier?'#7C5CFF':'#1a1828', border:'2px solid #0D0C1A', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {i < vipTier && <Icon name="check" size={10} color="#fff" />}
              </div>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10.5px', color:'#6F6B82', fontWeight:600, paddingLeft:'4px', paddingRight:'4px' }}>
            {VIP_LABEL.map((l, i) => <span key={l} style={{ color:i===vipTier?'#C9BBFF':undefined }}>{l}</span>)}
          </div>
          <div style={{ marginTop:'14px', fontSize:'12px', color:'#6F6B82', lineHeight:1.55 }}>
            {vipTier < 4 ? <>Mine more this month to unlock <span style={{ color:'#C9BBFF', fontWeight:700 }}>{VIP_LABEL[vipTier+1]}</span> rewards.</> : 'You have reached the highest tier. Enjoy maximum rewards.'}
          </div>
        </div>
      </div>
    </div>
  );
}
