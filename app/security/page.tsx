'use client';
import Link from 'next/link';
import { useContent } from '../../hooks/useContent';

function EtheonLogo() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
      <polygon points="12,3 22,21 2,21" fill="white" />
    </svg>
  );
}

export default function SecurityPage() {
  const { get } = useContent(['legal']);
  const email = get('global', 'support_email', 'legal@etheon.io');
  const intro = get('legal', 'security_intro', 'We are preparing a detailed security disclosure covering our encryption standards, data handling practices, and responsible disclosure policy.');

  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', color: '#F4F3FA', fontFamily: "'Manrope', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '900px', margin: '0 auto', padding: '22px 32px', width: '100%' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg,#9b7bff,#6e8bff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EtheonLogo />
          </div>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '18px', letterSpacing: '-0.02em' }}>Etheon</span>
        </Link>
        <Link href="/" style={{ fontSize: '13.5px', fontWeight: 600, color: '#C9BBFF', textDecoration: 'none' }}>← Back</Link>
      </nav>

      <main style={{ flex: 1, maxWidth: '900px', margin: '0 auto', padding: '48px 32px 80px', width: '100%' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 'clamp(28px,4vw,46px)', letterSpacing: '-0.03em', margin: 0 }}>Security</h1>
          <p style={{ fontSize: '15px', color: '#8A8699', marginTop: '12px' }}>Last updated June 17, 2026</p>
        </div>

        <div style={{ borderRadius: '26px', padding: '40px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '32px 0' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(124,92,255,0.15)', border: '1px solid rgba(124,92,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width={32} height={32} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#9b7bff" strokeWidth="1.5"/><path d="M12 8v4M12 16h.01" stroke="#9b7bff" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '22px', marginBottom: '10px' }}>Security coming soon</div>
              <div style={{ fontSize: '15px', color: '#8A8699', lineHeight: 1.6, maxWidth: '420px' }}>{intro}</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '32px', padding: '20px 24px', borderRadius: '18px', background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.18)', fontSize: '14px', color: '#B9B4CC', lineHeight: 1.6 }}>
          For questions, email us at{' '}
          <a href={`mailto:${email}`} style={{ color: '#C9BBFF', fontWeight: 600 }}>{email}</a>
        </div>
      </main>
    </div>
  );
}
