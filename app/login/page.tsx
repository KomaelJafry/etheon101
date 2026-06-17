'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import Icon from '../../components/Icon';
import RippleButton from '../../components/RippleButton';

function EtheonLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <polygon points="12,3 22,21 2,21" fill="white" />
    </svg>
  );
}

function InputRow({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 15px', borderRadius: '13px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <Icon name={icon} size={20} color="#6F6B82" style={{ flexShrink: 0 }} />
      {children}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'signup') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab('signup');
    }
  }, []);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr('');
    if (tab === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setErr(error.message); setLoading(false); return; }
      router.push('/dashboard');
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (error) { setErr(error.message); setLoading(false); return; }
      if (data.user) {
        await supabase.from('profiles').upsert({ id: data.user.id, full_name: name, email });
        router.push('/dashboard');
      }
    }
    setLoading(false);
  }

  const isLogin = tab === 'login';

  function switchTab(t: 'login' | 'signup') {
    setTab(t);
    setErr('');
  }

  return (
    <div className="login-shell">
      <div style={{ position: 'fixed', top: '-220px', left: '8%', width: '620px', height: '620px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,92,255,0.32),transparent 62%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '18%', right: '-160px', width: '540px', height: '540px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(110,139,255,0.22),transparent 62%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Brand panel */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '30px 0 0 30px', padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(160deg,#1a1530,#0B0A14)', border: '1px solid rgba(255,255,255,0.08)', borderRight: 'none', zIndex: 1 }}>
        <div style={{ position: 'absolute', top: '-80px', left: '-40px', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,92,255,0.35),transparent 62%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-100px', right: '-60px', width: '340px', height: '340px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(110,139,255,0.28),transparent 62%)', filter: 'blur(30px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '11px', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg,#9b7bff,#6e8bff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(124,92,255,0.45)', flexShrink: 0 }}>
              <EtheonLogo size={22} />
            </div>
            <span style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 600, fontSize: '21px', letterSpacing: '-0.02em' }}>Etheon</span>
          </Link>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 600, fontSize: 'clamp(26px,3.5vw,38px)', lineHeight: 1.1, letterSpacing: '-0.03em', maxWidth: '420px' }}>The simplest way to mine Ethereum.</div>
          <p style={{ fontSize: '16px', color: '#A39FB5', lineHeight: 1.6, marginTop: '18px', maxWidth: '400px' }}>No rigs to buy, no power bills to pay. Allocate hashrate and watch your rewards climb in real time.</p>
          <div style={{ display: 'flex', gap: '30px', marginTop: '34px', flexWrap: 'wrap' }}>
            {[['5M+', 'Active miners'], ['99.98%', 'Uptime'], ['$0', 'Hardware']].map(([val, label]) => (
              <div key={label}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '30px', background: 'linear-gradient(120deg,#b39bff,#6e8bff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{val}</div>
                <div style={{ fontSize: '13px', color: '#8A8699', marginTop: '3px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '11px', padding: '16px', borderRadius: '18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', maxWidth: '400px' }}>
          <Icon name="verified_user" size={22} color="#16D98A" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: '#B9B4CC', lineHeight: 1.5 }}>Bank-grade encryption · 2FA on every account · cold-storage custody</span>
        </div>
      </div>

      {/* Form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0 30px 30px 0', padding: '48px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.08)', borderLeft: 'none', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 600, fontSize: '30px', letterSpacing: '-0.02em' }}>{isLogin ? 'Welcome back' : 'Create account'}</h2>
          <p style={{ fontSize: '14.5px', color: '#8A8699', margin: '8px 0 26px' }}>{isLogin ? 'Sign in to your Etheon account.' : 'Start earning Ethereum today.'}</p>

          {/* Tab toggle */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '4px', marginBottom: '24px' }}>
            <RippleButton variant="none" onClick={() => switchTab('login')} className={isLogin ? 'anim-tab-slide' : ''} style={{ flex: 1, padding: '11px', borderRadius: '11px', border: 'none', fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '14px', transition: 'all .18s ease', background: isLogin ? '#fff' : 'transparent', color: isLogin ? '#0B0A14' : '#8A8699' }}>Log in</RippleButton>
            <RippleButton variant="none" onClick={() => switchTab('signup')} className={!isLogin ? 'anim-tab-slide' : ''} style={{ flex: 1, padding: '11px', borderRadius: '11px', border: 'none', fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '14px', transition: 'all .18s ease', background: !isLogin ? '#fff' : 'transparent', color: !isLogin ? '#0B0A14' : '#8A8699' }}>Sign up</RippleButton>
          </div>

          {/* Social buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '22px' }}>
            <RippleButton variant="ghost" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '13px', fontSize: '13.5px', fontWeight: 700, color: '#E9E7F2' }}>
              <Icon name="mail" size={18} color="#E9E7F2" />Google
            </RippleButton>
            <RippleButton variant="ghost" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '13px', fontSize: '13.5px', fontWeight: 700, color: '#E9E7F2' }}>
              <Icon name="account_balance_wallet" size={18} color="#E9E7F2" />Wallet
            </RippleButton>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '22px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '12px', color: '#6F6B82' }}>or with email</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {err && (
            <div style={{ padding: '12px 14px', borderRadius: '12px', marginBottom: '16px', background: 'rgba(255,107,138,0.1)', border: '1px solid rgba(255,107,138,0.3)', fontSize: '13.5px', color: '#FF6B8A' }}>{err}</div>
          )}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#A39FB5', marginBottom: '8px' }}>Full name</label>
                <InputRow icon="person">
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Alex Karras" required style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: '#F4F3FA', fontFamily: "'Manrope', sans-serif", fontSize: '15px' }} />
                </InputRow>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#A39FB5', marginBottom: '8px' }}>Email address</label>
              <InputRow icon="mail">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: '#F4F3FA', fontFamily: "'Manrope', sans-serif", fontSize: '15px' }} />
              </InputRow>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#A39FB5', marginBottom: '8px' }}>Password</label>
              <InputRow icon="lock">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: '#F4F3FA', fontFamily: "'Manrope', sans-serif", fontSize: '15px' }} />
                <RippleButton type="button" variant="none" onClick={() => setShowPw(p => !p)} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <Icon name={showPw ? 'visibility' : 'visibility_off'} size={20} color="#6F6B82" />
                </RippleButton>
              </InputRow>
            </div>

            {isLogin && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '22px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#C9BBFF', cursor: 'pointer' }}>Forgot password?</span>
              </div>
            )}
            {!isLogin && <div style={{ marginBottom: '22px' }} />}

            <RippleButton type="submit" variant="purple" disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, color: '#fff', padding: '15px', borderRadius: '14px', background: loading ? 'rgba(124,92,255,0.5)' : '#7C5CFF', boxShadow: '0 10px 26px rgba(124,92,255,0.42)', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Please wait…' : (isLogin ? 'Log in' : 'Create account')}
              {!loading && <Icon name="arrow_forward" size={19} color="#fff" />}
            </RippleButton>
          </form>

          <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '14px', color: '#8A8699' }}>
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <span onClick={() => switchTab(isLogin ? 'signup' : 'login')} style={{ color: '#C9BBFF', fontWeight: 700, cursor: 'pointer' }}>{isLogin ? 'Sign up' : 'Log in'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
