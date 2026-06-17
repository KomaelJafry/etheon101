'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import Icon from '../../components/Icon';
import RippleButton from '../../components/RippleButton';
import { useContent } from '../../hooks/useContent';

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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (params.get('tab') === 'signup') setTab('signup');
    const urlError = params.get('error');
    if (urlError === 'auth_failed') setErr('Google sign-in could not be completed. Please try again or use email.');
    else if (urlError === 'admin_required') setErr('Admin access required. Please sign in with an admin account.');
  }, []);

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

  const { get } = useContent(['auth']);
  const isLogin = tab === 'login';

  function switchTab(t: 'login' | 'signup') {
    setTab(t);
    setErr('');
    setForgotMsg('');
  }

  async function handleForgotPassword() {
    if (!email) { setErr('Enter your email address above, then click "Forgot password".'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
    });
    setLoading(false);
    if (error) { setErr('Could not send reset email. Please try again.'); }
    else { setForgotMsg('Check your inbox for a password reset link.'); }
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
          <div style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 600, fontSize: 'clamp(26px,3.5vw,38px)', lineHeight: 1.1, letterSpacing: '-0.03em', maxWidth: '420px' }}>{get('auth', 'brand_panel_headline', 'The simplest way to mine Ethereum.')}</div>
          <p style={{ fontSize: '16px', color: '#A39FB5', lineHeight: 1.6, marginTop: '18px', maxWidth: '400px' }}>{get('auth', 'brand_panel_subtext', 'No rigs to buy, no power bills to pay. Allocate hashrate and watch your rewards climb in real time.')}</p>
          <div style={{ display: 'flex', gap: '30px', marginTop: '34px', flexWrap: 'wrap' }}>
            {[['5M+', 'Active miners'], ['99.98%', 'Uptime'], ['$0', 'Setup fee']].map(([val, label]) => (
              <div key={label}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '30px', background: 'linear-gradient(120deg,#b39bff,#6e8bff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{val}</div>
                <div style={{ fontSize: '13px', color: '#8A8699', marginTop: '3px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '11px', padding: '16px', borderRadius: '18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', maxWidth: '400px' }}>
          <Icon name="verified_user" size={22} color="#16D98A" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: '#B9B4CC', lineHeight: 1.5 }}>{get('auth','security_badge_text','Bank-grade encryption · 2FA on every account · cold-storage custody')}</span>
        </div>
      </div>

      {/* Form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0 30px 30px 0', padding: '48px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.08)', borderLeft: 'none', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 600, fontSize: '30px', letterSpacing: '-0.02em' }}>{isLogin ? get('auth','login_headline','Welcome back') : get('auth','signup_headline','Create account')}</h2>
          <p style={{ fontSize: '14.5px', color: '#8A8699', margin: '8px 0 26px' }}>{isLogin ? get('auth','login_subtext','Sign in to your Etheon account.') : get('auth','signup_subtext','Start earning Ethereum today.')}</p>

          {/* Tab toggle */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '4px', marginBottom: '24px' }}>
            <RippleButton variant="none" onClick={() => switchTab('login')} className={isLogin ? 'anim-tab-slide' : ''} style={{ flex: 1, padding: '11px', borderRadius: '11px', border: 'none', fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '14px', transition: 'all .18s ease', background: isLogin ? '#fff' : 'transparent', color: isLogin ? '#0B0A14' : '#8A8699' }}>Log in</RippleButton>
            <RippleButton variant="none" onClick={() => switchTab('signup')} className={!isLogin ? 'anim-tab-slide' : ''} style={{ flex: 1, padding: '11px', borderRadius: '11px', border: 'none', fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '14px', transition: 'all .18s ease', background: !isLogin ? '#fff' : 'transparent', color: !isLogin ? '#0B0A14' : '#8A8699' }}>Sign up</RippleButton>
          </div>

          {/* Google sign-in */}
          <button
            type="button"
            onClick={async () => {
              setLoading(true); setErr('');
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/auth/callback` },
              });
              if (error) { setErr('Google sign-in failed. Please try again.'); setLoading(false); }
            }}
            disabled={loading}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '13px', borderRadius: '13px', marginBottom: '10px', fontSize: '14px', fontWeight: 700, color: '#E9E7F2', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92A8.78 8.78 0 0 0 17.64 9.2Z" fill="#4285F4"/><path d="M9 18a8.6 8.6 0 0 0 5.96-2.18l-2.92-2.26A5.43 5.43 0 0 1 9 14.8a5.4 5.4 0 0 1-5.08-3.73H.92v2.34A9 9 0 0 0 9 18Z" fill="#34A853"/><path d="M3.92 11.07A5.41 5.41 0 0 1 3.64 9c0-.72.12-1.42.28-2.07V4.59H.92A9 9 0 0 0 0 9c0 1.45.35 2.82.92 4.05l3-2.34-.28-.64Z" fill="#FBBC05"/><path d="M9 3.58a4.86 4.86 0 0 1 3.44 1.34l2.58-2.58A8.64 8.64 0 0 0 9 0 9 9 0 0 0 .92 4.59l3 2.34A5.4 5.4 0 0 1 9 3.58Z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
          {/* Wallet connect — coming soon */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '13px', marginBottom: '22px', fontSize: '13.5px', fontWeight: 700, color: '#4A4763', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'default' }} title="Wallet connect coming soon">
            <Icon name="account_balance_wallet" size={18} color="#4A4763" />Wallet connect — coming soon
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
              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span onClick={handleForgotPassword} style={{ fontSize: '13px', fontWeight: 600, color: '#C9BBFF', cursor: 'pointer' }}>Forgot password?</span>
                </div>
                {forgotMsg && <div style={{ marginTop: '10px', padding: '10px 13px', borderRadius: '11px', background: 'rgba(22,217,138,0.1)', border: '1px solid rgba(22,217,138,0.3)', fontSize: '13px', color: '#16D98A' }}>{forgotMsg}</div>}
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
