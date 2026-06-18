'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '../components/Icon';
import RippleButton from '../components/RippleButton';
import { useContent } from '../hooks/useContent';
import { EtheonCrystal } from '../components/EtheonBrand';

const CIRC = 2 * Math.PI * 52;

export default function LandingPage() {
  const { get } = useContent(['landing']);
  const [gaugeOffset, setGaugeOffset] = useState(CIRC * 0.35);
  const [sessionEth, setSessionEth] = useState(0.00812);
  const [ethPrice] = useState(3284);

  useEffect(() => {
    const id = setInterval(() => {
      setSessionEth(v => v + 0.000000032 * 84);
      setGaugeOffset(v => Math.max(CIRC * 0.1, Math.min(CIRC * 0.9, v + (Math.random() - 0.5) * 4)));
    }, 120);
    return () => clearInterval(id);
  }, []);

  const sessionUsd = `£${(sessionEth * ethPrice).toFixed(2)}`;
  const sessionEthStr = sessionEth.toFixed(6);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#0B0A14', fontFamily: "'Manrope', system-ui, sans-serif", color: '#F4F3FA', overflowX: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-220px', left: '8%', width: '620px', height: '620px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(155,123,255,0.32),transparent 62%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '18%', right: '-160px', width: '540px', height: '540px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(110,139,255,0.22),transparent 62%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* NAV */}
        <nav className="landing-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: '38px' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '11px', background: 'linear-gradient(135deg,#9b7bff,#6e8bff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(155,123,255,0.45)', flexShrink: 0 }}>
                <EtheonCrystal size={20} />
              </div>
              <span style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 600, fontSize: '20px', letterSpacing: '-0.02em' }}>Etheon</span>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '26px', fontSize: '14px', fontWeight: 600, color: '#A39FB5' }}>
              <a href="#mining" style={{ color: '#F4F3FA', textDecoration: 'none', cursor: 'pointer' }}>Mining</a>
              <a href="/login" style={{ color: '#A39FB5', textDecoration: 'none', cursor: 'pointer' }}>Wallet</a>
              <a href="#stats" style={{ color: '#A39FB5', textDecoration: 'none', cursor: 'pointer' }}>Rewards</a>
              <a href="/support" style={{ color: '#A39FB5', textDecoration: 'none', cursor: 'pointer' }}>Company</a>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <RippleButton variant="ghost" style={{ height: '42px', padding: '0 20px', borderRadius: '999px', fontSize: '14px', fontWeight: 700, color: '#E9E7F2' }}>Log in</RippleButton>
            </Link>
            <Link href="/login?tab=signup" style={{ textDecoration: 'none' }}>
              <RippleButton variant="purple" style={{ height: '42px', padding: '0 22px', borderRadius: '999px', fontSize: '14px', fontWeight: 700, color: '#fff', boxShadow: '0 8px 20px rgba(155,123,255,0.4)' }}>Sign up</RippleButton>
            </Link>
          </div>
        </nav>

        {/* HERO */}
        <section className="landing-hero-grid">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(155,123,255,0.14)', border: '1px solid rgba(155,123,255,0.25)', padding: '8px 15px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, color: '#C9BBFF', marginBottom: '26px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16D98A', boxShadow: '0 0 8px #16D98A', display: 'inline-block', flexShrink: 0 }} />
              Etheon Rewards Mining · No rigs required
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 600, fontSize: 'clamp(38px,5.5vw,62px)', lineHeight: 1.02, letterSpacing: '-0.035em' }}>
              {get('landing', 'hero_headline', 'Earn Ethereum,')}<br />
              <span style={{ background: 'linear-gradient(120deg,#b39bff,#6e8bff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{get('landing', 'hero_headline_accent', 'every single day.')}</span>
            </h1>
            <p style={{ fontSize: '18px', color: '#A39FB5', lineHeight: 1.6, margin: '24px 0 32px', maxWidth: '480px' }}>{get('landing', 'hero_subheadline', 'Own virtual hashrate, watch your rewards accrue in real time, and withdraw whenever you want. Etheon handles the rigs — you keep the upside.')}</p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <Link href="/login?tab=signup" style={{ textDecoration: 'none' }}>
                <RippleButton variant="purple" style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '54px', padding: '0 28px', borderRadius: '999px', fontSize: '16px', fontWeight: 700, color: '#fff', boxShadow: '0 12px 30px rgba(155,123,255,0.45)' }}>
                  <Icon name="bolt" size={21} color="#fff" />
                  Start mining
                </RippleButton>
              </Link>
              <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                <RippleButton variant="none" style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '54px', padding: '0 26px', borderRadius: '999px', fontSize: '16px', fontWeight: 700, color: '#C9BBFF', background: 'rgba(155,123,255,0.12)', border: '1px solid rgba(155,123,255,0.28)' }}>
                  View dashboard
                </RippleButton>
              </Link>
            </div>
          </div>

          {/* Hero card */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: '-40px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(155,123,255,0.32),transparent 65%)', filter: 'blur(30px)' }} />
            <div style={{ position: 'relative', borderRadius: '28px', padding: '26px', background: 'linear-gradient(165deg,rgba(30,26,48,0.9),rgba(13,12,22,0.95))', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)', animation: 'etheonFloat 6s ease-in-out infinite' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '15px' }}>Mining farm</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#16D98A' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16D98A', boxShadow: '0 0 8px #16D98A', display: 'inline-block', animation: 'etheonPulse 1.8s ease-in-out infinite' }} />
                  Active
                </span>
              </div>
              <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto' }}>
                <div style={{ position: 'absolute', inset: '18px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(155,123,255,0.3),transparent 66%)', animation: 'etheonGlowBreathe 4s ease-in-out infinite' }} />
                <svg viewBox="0 0 130 130" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', animation: 'etheonSpin 16s linear infinite', opacity: 0.5 }}>
                  <circle cx="65" cy="65" r="61" fill="none" stroke="rgba(155,123,255,0.45)" strokeWidth="1.2" strokeDasharray="2 9" />
                </svg>
                <svg viewBox="0 0 130 130" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <defs>
                    <linearGradient id="etheonRingHero" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#b39bff" />
                      <stop offset="1" stopColor="#6e8bff" />
                    </linearGradient>
                  </defs>
                  <circle cx="65" cy="65" r="52" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
                  <circle cx="65" cy="65" r="52" fill="none" stroke="url(#etheonRingHero)" strokeWidth="9" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={gaugeOffset} style={{ transition: 'stroke-dashoffset .5s ease' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '10.5px', color: '#A39FB5', fontWeight: 600, letterSpacing: '0.05em' }}>HASHRATE</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '34px', lineHeight: 1, marginTop: '2px' }}>84</div>
                  <div style={{ fontSize: '11.5px', color: '#8A8699' }}>TH/s</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '16px', background: 'rgba(155,123,255,0.12)', border: '1px solid rgba(155,123,255,0.22)', marginTop: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#A39FB5', fontWeight: 600 }}>Example earnings</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '20px', color: '#16D98A', marginTop: '2px' }}>{sessionEthStr}</div>
                </div>
                <span style={{ fontSize: '12px', color: '#8A8699' }}>ETH · {sessionUsd}</span>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section id="stats" style={{ maxWidth: '1180px', margin: '0 auto', padding: '56px 32px' }}>
          <div className="resp-grid-stats">
            {[['$0', 'Hardware cost'], ['24/7', 'Automated mining'], ['Real-time', 'Reward tracking'], ['Ethereum', 'Mainnet powered']].map(([val, label]) => (
              <div key={label as string} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 'clamp(28px,3.5vw,42px)', letterSpacing: '-0.02em', background: 'linear-gradient(120deg,#b39bff,#6e8bff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{val}</div>
                <div style={{ fontSize: '14px', color: '#8A8699', marginTop: '6px' }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* STEPS */}
        <section id="mining" style={{ background: '#ECEBF4', color: '#15131F', borderRadius: '40px 40px 0 0', marginTop: '30px' }}>
          <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '72px 32px 80px' }}>
            <div style={{ textAlign: 'center', maxWidth: '620px', margin: '0 auto 50px' }}>
              <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 'clamp(28px,4vw,42px)', letterSpacing: '-0.03em' }}>Three steps to your first reward</h2>
              <p style={{ fontSize: '17px', color: '#5B5870', lineHeight: 1.6, marginTop: '16px' }}>No rigs, no noise, no electricity bills. Start earning Ethereum in minutes.</p>
            </div>
            <div className="resp-grid-3">
              {[
                { icon: 'person_add' as const, bg: 'linear-gradient(135deg,#7c5cff,#6e8bff)', step: '01', title: get('landing','step1_title','Create your account'), desc: get('landing','step1_desc','Sign up in under a minute and deposit funds securely to get going.') },
                { icon: 'bolt' as const, bg: 'linear-gradient(135deg,#6e8bff,#9b7bff)', step: '02', title: get('landing','step2_title','Power your miner'), desc: get('landing','step2_desc','Allocate hashrate with a tap. Scale up or down anytime, instantly.') },
                { icon: 'savings' as const, bg: 'linear-gradient(135deg,#16d98a,#6e8bff)', step: '03', title: get('landing','step3_title','Earn & withdraw'), desc: get('landing','step3_desc','Watch ETH accrue in real time and cash out whenever you like.') },
              ].map(s => (
                <div key={s.step} style={{ background: '#fff', borderRadius: '24px', padding: '30px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 10px 30px rgba(155,123,255,0.06)' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '15px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                    <Icon name={s.icon} size={27} color="#fff" />
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#7C5CFF', marginBottom: '7px' }}>STEP {s.step}</div>
                  <h3 style={{ margin: '0 0 9px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '21px' }}>{s.title}</h3>
                  <p style={{ fontSize: '14.5px', color: '#5B5870', lineHeight: 1.55, margin: 0 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: '#ECEBF4', padding: '0 32px 80px' }}>
          <div style={{ maxWidth: '1180px', margin: '0 auto', position: 'relative', overflow: 'hidden', borderRadius: '32px', padding: '64px 48px', background: 'linear-gradient(135deg,#1a1530,#0B0A14)', border: '1px solid rgba(155,123,255,0.3)' }}>
            <div style={{ position: 'absolute', top: '-60px', right: '-30px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(155,123,255,0.4),transparent 65%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '30px', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 'clamp(26px,3.5vw,40px)', letterSpacing: '-0.03em', color: '#fff' }}>Start mining in minutes.</h2>
                <p style={{ fontSize: '17px', color: '#A39FB5', marginTop: '14px', maxWidth: '440px' }}>No hardware, no noise, no electricity bills. Etheon handles the rigs — you keep the rewards.</p>
              </div>
              <Link href="/login?tab=signup" style={{ textDecoration: 'none', flexShrink: 0 }}>
                <RippleButton variant="purple" style={{ display: 'flex', alignItems: 'center', gap: '9px', height: '56px', padding: '0 32px', borderRadius: '999px', fontSize: '16px', fontWeight: 700, color: '#fff', boxShadow: '0 12px 30px rgba(155,123,255,0.5)' }}>
                  <Icon name="rocket_launch" size={22} color="#fff" />
                  Create free account
                </RippleButton>
              </Link>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ background: '#ECEBF4', color: '#5B5870', padding: '0 32px 50px' }}>
          <div style={{ maxWidth: '1180px', margin: '0 auto', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '9px', background: 'linear-gradient(135deg,#9b7bff,#6e8bff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <EtheonCrystal size={16} />
              </div>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '16px', color: '#15131F' }}>Etheon</span>
              <span style={{ fontSize: '13px', marginLeft: '8px' }}>© 2026 · Etheon Rewards Platform</span>
            </div>
            <div style={{ display: 'flex', gap: '24px', fontSize: '13.5px', fontWeight: 600 }}>
              {['Privacy', 'Terms', 'Security', 'Support'].map(l => (
                <Link key={l} href={`/${l.toLowerCase()}`} style={{ color: '#5B5870', textDecoration: 'none' }}>{l}</Link>
              ))}
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
