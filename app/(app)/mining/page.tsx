'use client';
import { useEffect, useState } from 'react';
import { useApp } from '../AppContext';
import Icon from '../../../components/Icon';
import RippleButton from '../../../components/RippleButton';

const ETH_RATE = 0.000000032;
const fmt = (n: number, d = 6) => n.toFixed(d);

const PRESETS = [
  { label: 'Eco',      pct: 0.25, desc: 'Low power · quiet' },
  { label: 'Balanced', pct: 0.50, desc: 'Optimal efficiency' },
  { label: 'Turbo',    pct: 1.00, desc: 'Max performance' },
];

export default function MiningPage() {
  const { profile, ethPrice } = useApp();
  const cap = profile?.hashrate_capacity_th || 500;

  // Local state for controls — backend has no mining toggle endpoint,
  // so these are optimistic UI states initialized from profile.
  const [isActiveLive, setIsActiveLive] = useState(false);
  const [localHashrate, setLocalHashrate] = useState(0);
  const [sessionEth, setSessionEth] = useState(0);
  const [sessionPct, setSessionPct] = useState(0);
  const [gaugeOffset, setGaugeOffset] = useState(754);
  const [activePreset, setActivePreset] = useState(1);
  const bigC = 2 * Math.PI * 120;

  // Initialize from backend profile once loaded
  useEffect(() => {
    if (!profile) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setIsActiveLive(profile.mining_status === 'active');
    setLocalHashrate(profile.hashrate_th);
    const pct = profile.hashrate_capacity_th > 0 ? profile.hashrate_th / profile.hashrate_capacity_th : 0.5;
    setGaugeOffset(bigC * (1 - pct));
    setActivePreset(PRESETS.reduce((bi, p, i) => Math.abs(pct - p.pct) < Math.abs(pct - PRESETS[bi].pct) ? i : bi, 0));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Gauge wobble animation
  useEffect(() => {
    if (!isActiveLive) return;
    let cur = (localHashrate / (cap || 100)) * 100;
    const id = setInterval(() => {
      cur = Math.max(0, Math.min(100, cur + (Math.random() - 0.5) * 0.5));
      setGaugeOffset(bigC * (1 - cur / 100));
    }, 120);
    return () => clearInterval(id);
  }, [isActiveLive, localHashrate, cap]); // eslint-disable-line react-hooks/exhaustive-deps -- bigC is a constant

  // Session ETH counter — only runs when active
  useEffect(() => {
    if (!isActiveLive || localHashrate <= 0) return;
    const id = setInterval(() => {
      const ratePerTick = (localHashrate * ETH_RATE) / 3600;
      setSessionEth(e => e + ratePerTick);
      setSessionPct(p => { const n = p + 0.3; if (n >= 100) { setSessionEth(0); return 0; } return n; });
    }, 120);
    return () => clearInterval(id);
  }, [isActiveLive, localHashrate]);

  function toggleMining() {
    setIsActiveLive(v => !v);
    if (isActiveLive) {
      // Pausing — freeze gauge
      setGaugeOffset(bigC * (1 - (localHashrate / (cap || 100))));
    }
  }

  function adjustHashrate(delta: number) {
    setLocalHashrate(h => {
      const next = Math.max(0, Math.min(cap, h + delta));
      setGaugeOffset(bigC * (1 - next / (cap || 100)));
      return next;
    });
  }

  function applyPreset(i: number) {
    setActivePreset(i);
    const next = Math.round(cap * PRESETS[i].pct);
    setLocalHashrate(next);
    setGaugeOffset(bigC * (1 - PRESETS[i].pct));
  }

  const hashrate   = localHashrate;
  const powerPct   = cap > 0 ? Math.min(100, Math.round((hashrate / cap) * 100)) : 0;
  const sessionUsd = (sessionEth * ethPrice).toFixed(2);
  const dailyEth   = fmt(hashrate * ETH_RATE * 86400);
  const dailyUsd   = (hashrate * ETH_RATE * 86400 * ethPrice).toFixed(2);
  const weeklyEth  = fmt(hashrate * ETH_RATE * 86400 * 7);
  const weeklyUsd  = (hashrate * ETH_RATE * 86400 * 7 * ethPrice).toFixed(2);
  const monthlyEth = fmt(hashrate * ETH_RATE * 86400 * 30);
  const monthlyUsd = (hashrate * ETH_RATE * 86400 * 30 * ethPrice).toFixed(2);

  const miners = [
    { name: 'Etheon Rig Alpha',  sub: `Antares ASIC · ${Math.round(cap * 0.6)} TH`, status: isActiveLive ? 'Mining' : 'Offline', sColor: isActiveLive?'#16D98A':'#FF6B8A', sBg: isActiveLive?'rgba(22,217,138,0.14)':'rgba(255,107,138,0.14)' },
    { name: 'Quantum Core S2',   sub: `Hydro-cooled · ${Math.round(cap * 0.4)} TH`,  status: isActiveLive ? 'Mining' : 'Offline', sColor: isActiveLive?'#16D98A':'#FF6B8A', sBg: isActiveLive?'rgba(22,217,138,0.14)':'rgba(255,107,138,0.14)' },
    { name: 'Boost Pack Alpha',  sub: '0 TH · Reserved',                               status: 'Standby',  sColor: '#FFB55C', sBg: 'rgba(255,181,92,0.14)' },
  ];

  const statTiles = [
    { icon: 'bolt',              color: '#C9BBFF', val: `${Math.round(hashrate)}`, unit: `/ ${Math.round(cap)}`, label: 'Power, TH' },
    { icon: 'eco',               color: '#6E8BFF', val: '20',    unit: 'W/TH', label: 'Efficiency' },
    { icon: 'schedule',          color: '#16D98A', val: isActiveLive ? '99.98' : '0.00', unit: '%', label: 'Uptime' },
    { icon: 'device_thermostat', color: '#FFB55C', val: isActiveLive ? '61' : '28', unit: '°C', label: 'Temp' },
  ];

  return (
    <div className="resp-grid-2-mining">

      {/* LEFT */}
      <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>

        {/* Gauge hero */}
        <div className="anim-slide-up" style={{ position:'relative', overflow:'hidden', borderRadius:'26px', padding:'26px 28px 28px', background:'linear-gradient(165deg,rgba(124,92,255,0.14),rgba(11,10,20,0.6) 65%)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ position:'absolute', top:'-80px', left:'50%', transform:'translateX(-50%)', width:'360px', height:'360px', borderRadius:'50%', background:'radial-gradient(circle,rgba(124,92,255,0.22),transparent 62%)', pointerEvents:'none', animation:'etheonGlowBreathe 5s ease-in-out infinite' }} />

          <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
            <div>
              <div className="sg" style={{ fontWeight:700, fontSize:'18px' }}>Mining farm</div>
              <div style={{ fontSize:'12.5px', color:'#6F6B82', marginTop:'2px' }}>Etheon Pool · ETH-Sim v3</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'7px', background:isActiveLive?'rgba(22,217,138,0.1)':'rgba(255,107,138,0.1)', border:`1px solid ${isActiveLive?'rgba(22,217,138,0.25)':'rgba(255,107,138,0.25)'}`, padding:'7px 14px', borderRadius:'999px' }}>
              <span className={isActiveLive?'anim-pulse':''} style={{ width:'7px', height:'7px', borderRadius:'50%', background:isActiveLive?'#16D98A':'#FF6B8A', boxShadow:`0 0 8px ${isActiveLive?'#16D98A':'#FF6B8A'}`, display:'inline-block' }} />
              <span style={{ fontSize:'12.5px', fontWeight:700, color:isActiveLive?'#16D98A':'#FF6B8A' }}>{isActiveLive?'Active':'Paused'}</span>
            </div>
          </div>

          <div style={{ position:'relative', width:'280px', height:'280px', margin:'10px auto 4px' }}>
            <svg viewBox="0 0 300 300" style={{ position:'absolute', inset:0, width:'100%', height:'100%', animation:'etheonSpin 22s linear infinite', opacity:0.4 }}>
              <circle cx="150" cy="150" r="142" fill="none" stroke="rgba(124,92,255,0.35)" strokeWidth="1.5" strokeDasharray="2 10" strokeLinecap="round" />
            </svg>
            <div style={{ position:'absolute', inset:'32px', borderRadius:'50%', background:'radial-gradient(circle,rgba(124,92,255,0.28),transparent 68%)', animation:'etheonGlowBreathe 4s ease-in-out infinite' }} />
            <svg viewBox="0 0 300 300" style={{ position:'absolute', inset:0, width:'100%', height:'100%', transform:'rotate(-90deg)' }}>
              <defs>
                <linearGradient id="mineRingBig" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#b39bff" />
                  <stop offset="0.5" stopColor="#7C5CFF" />
                  <stop offset="1" stopColor="#6e8bff" />
                </linearGradient>
              </defs>
              <circle cx="150" cy="150" r="120" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="13" />
              <circle cx="150" cy="150" r="120" fill="none" stroke={isActiveLive?"url(#mineRingBig)":"rgba(255,107,138,0.5)"} strokeWidth="13" strokeLinecap="round"
                strokeDasharray={bigC.toFixed(1)} strokeDashoffset={gaugeOffset.toFixed(1)}
                style={{ transition:'stroke-dashoffset .5s ease, stroke .5s ease', filter:'drop-shadow(0 0 10px rgba(124,92,255,0.7))' }} />
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <div style={{ fontSize:'11px', color:'#A39FB5', fontWeight:700, letterSpacing:'0.06em' }}>HASHRATE</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:'5px', marginTop:'3px' }}>
                <span className="sg" style={{ fontWeight:700, fontSize:'48px', letterSpacing:'-0.03em', lineHeight:1 }}>{hashrate.toFixed(1)}</span>
                <span style={{ fontSize:'15px', color:'#8A8699', fontWeight:600 }}>TH/s</span>
              </div>
              <div style={{ marginTop:'12px', paddingTop:'12px', borderTop:'1px solid rgba(255,255,255,0.1)', width:'130px', textAlign:'center' }}>
                <div style={{ fontSize:'10px', color:'#8A8699', fontWeight:700, letterSpacing:'0.05em' }}>SESSION EARNED</div>
                <div className="sg" style={{ fontWeight:700, fontSize:'20px', color:'#16D98A', marginTop:'3px', letterSpacing:'-0.01em' }}>{fmt(sessionEth)}</div>
                <div style={{ fontSize:'11.5px', color:'#6F6B82', marginTop:'1px' }}>ETH · ${sessionUsd}</div>
              </div>
            </div>
          </div>

          <div style={{ position:'relative', marginTop:'4px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'8px', fontWeight:600 }}>
              <span style={{ color:'#A39FB5' }}>Next reward payout</span>
              <span className="sg" style={{ color:'#C9BBFF' }}>{sessionPct.toFixed(0)}%</span>
            </div>
            <div style={{ height:'7px', borderRadius:'999px', background:'rgba(255,255,255,0.07)', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:'999px', background:'linear-gradient(90deg,#9b7bff,#6e8bff)', width:`${sessionPct}%`, transition:'width .3s ease', boxShadow:'0 0 10px rgba(124,92,255,0.7)' }} />
            </div>
          </div>

          <RippleButton variant={isActiveLive ? 'pause' : 'purple'} onClick={toggleMining}
            style={{ width:'100%', marginTop:'18px', display:'flex', alignItems:'center', justifyContent:'center', gap:'9px', fontSize:'15px', padding:'15px', borderRadius:'15px', ...(isActiveLive ? {} : { boxShadow:'0 8px 26px rgba(124,92,255,0.45)' }) }}>
            <Icon name={isActiveLive ? 'pause' : 'play_arrow'} size={20} color={isActiveLive ? '#FF8DA3' : '#fff'} />
            {isActiveLive ? 'Pause mining' : 'Start mining'}
          </RippleButton>
        </div>

        {/* Stat tiles */}
        <div className="resp-grid-4">
          {statTiles.map(s => (
            <div key={s.label} className="card-hover" style={{ borderRadius:'18px', padding:'16px', background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <Icon name={s.icon} size={22} color={s.color} />
              <div className="sg" style={{ fontWeight:700, fontSize:'20px', marginTop:'10px', letterSpacing:'-0.01em' }}>
                {s.val}<span style={{ fontSize:'12px', color:'#6F6B82', fontWeight:500 }}> {s.unit}</span>
              </div>
              <div style={{ fontSize:'11.5px', color:'#6F6B82', marginTop:'2px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>

        {/* Power allocation */}
        <div className="anim-slide-up" style={{ borderRadius:'24px', padding:'22px', background:'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div className="sg" style={{ fontWeight:700, fontSize:'15px', marginBottom:'3px' }}>Power allocation</div>
          <div style={{ fontSize:'12px', color:'#6F6B82', marginBottom:'18px' }}>Set how much hashrate to run.</div>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', marginBottom:'14px' }}>
            <RippleButton variant="ghost" onClick={() => adjustHashrate(-5)} style={{ width:'44px', height:'44px', borderRadius:'13px', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
              <Icon name="remove" size={22} color="#E9E7F2" />
            </RippleButton>
            <div style={{ textAlign:'center' }}>
              <div className="sg" style={{ fontWeight:700, fontSize:'32px', letterSpacing:'-0.025em', lineHeight:1 }}>{Math.round(hashrate)}</div>
              <div style={{ fontSize:'11px', color:'#6F6B82', marginTop:'3px' }}>TH/s · {powerPct}% of {cap} TH</div>
            </div>
            <RippleButton variant="ghost" onClick={() => adjustHashrate(5)} style={{ width:'44px', height:'44px', borderRadius:'13px', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
              <Icon name="add" size={22} color="#E9E7F2" />
            </RippleButton>
          </div>

          <div style={{ height:'7px', borderRadius:'999px', background:'rgba(255,255,255,0.07)', overflow:'hidden', marginBottom:'16px' }}>
            <div style={{ height:'100%', borderRadius:'999px', background:'linear-gradient(90deg,#9b7bff,#6e8bff)', width:`${powerPct}%`, transition:'width .3s ease' }} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
            {PRESETS.map((p, i) => {
              const isOn = activePreset === i;
              return (
                <RippleButton key={p.label} variant="none" onClick={() => applyPreset(i)} className="preset-btn"
                  style={{ padding:'11px 8px', borderRadius:'13px', fontSize:'13px', transition:'all .18s ease', background:isOn?'rgba(124,92,255,0.18)':'rgba(255,255,255,0.04)', border:`1px solid ${isOn?'rgba(124,92,255,0.42)':'rgba(255,255,255,0.08)'}`, color:isOn?'#C9BBFF':'#A39FB5', boxShadow:isOn?'0 4px 14px rgba(124,92,255,0.22)':'none' }}>
                  <div style={{ fontWeight:700 }}>{p.label}</div>
                  <div style={{ fontSize:'10px', marginTop:'2px', opacity:0.7 }}>{p.desc}</div>
                </RippleButton>
              );
            })}
          </div>
        </div>

        {/* Estimated rewards */}
        <div style={{ borderRadius:'24px', padding:'22px', background:'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div className="sg" style={{ fontWeight:700, fontSize:'15px', marginBottom:'14px' }}>Estimated rewards</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {[
              { label:'Daily',   eth:dailyEth,   usd:dailyUsd,   accent:true },
              { label:'Weekly',  eth:weeklyEth,  usd:weeklyUsd,  accent:false },
              { label:'Monthly', eth:monthlyEth, usd:monthlyUsd, accent:false },
            ].map(r => (
              <div key={r.label} className="card-hover" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 15px', borderRadius:'14px', background:r.accent?'rgba(124,92,255,0.1)':'rgba(255,255,255,0.03)', border:`1px solid ${r.accent?'rgba(124,92,255,0.2)':'rgba(255,255,255,0.06)'}` }}>
                <span style={{ fontSize:'13.5px', color:'#C5C1D6', fontWeight:600 }}>{r.label}</span>
                <div style={{ textAlign:'right' }}>
                  <div className="sg" style={{ fontWeight:700, fontSize:'15px' }}>{r.eth} ETH</div>
                  <div style={{ fontSize:'11px', color:'#6F6B82', marginTop:'1px' }}>${r.usd}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:'12px', padding:'10px 12px', borderRadius:'12px', background:'rgba(255,181,92,0.08)', border:'1px solid rgba(255,181,92,0.2)', fontSize:'12px', color:'#FFB55C', display:'flex', gap:'8px', alignItems:'flex-start' }}>
            <Icon name="info" size={16} color="#FFB55C" style={{ flexShrink:0, marginTop:'1px' }} />
            Estimates are based on current hashrate and simulated network difficulty. Actual results vary.
          </div>
        </div>

        {/* Your miners */}
        <div style={{ borderRadius:'24px', padding:'22px', background:'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
            <div className="sg" style={{ fontWeight:700, fontSize:'15px' }}>Your miners</div>
            <RippleButton variant="ghost" style={{ display:'flex', alignItems:'center', gap:'5px', height:'32px', padding:'0 12px', borderRadius:'999px', fontSize:'12.5px', color:'#C9BBFF' }}>
              <Icon name="add" size={15} color="#C9BBFF" />Add
            </RippleButton>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {miners.map(m => (
              <div key={m.name} className="card-hover" style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px', borderRadius:'14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:'rgba(124,92,255,0.15)', border:'1px solid rgba(124,92,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name="settings" size={20} color="#9DB0FF" />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'13.5px', fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.name}</div>
                  <div style={{ fontSize:'11.5px', color:'#6F6B82', marginTop:'2px' }}>{m.sub}</div>
                </div>
                <span style={{ fontSize:'11.5px', fontWeight:700, color:m.sColor, background:m.sBg, padding:'5px 10px', borderRadius:'999px', flexShrink:0 }}>{m.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
