'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { EtheonCrystal } from '@/components/EtheonBrand';



const s = {
  h2: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '18px', color: '#E9E7F2', margin: '32px 0 12px' } as React.CSSProperties,
  p: { fontSize: '15px', color: '#B9B4CC', lineHeight: 1.75, margin: '0 0 14px' } as React.CSSProperties,
  li: { fontSize: '15px', color: '#B9B4CC', lineHeight: 1.75, marginBottom: '6px' } as React.CSSProperties,
};

export default function SecurityPage() {
  useEffect(() => { document.title = 'Security | Etheon'; }, []);
  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', color: '#F4F3FA', fontFamily: "'Manrope', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '900px', margin: '0 auto', padding: '22px 32px', width: '100%' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg,#9b7bff,#6e8bff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EtheonCrystal size={20} />
          </div>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '18px', letterSpacing: '-0.02em' }}>Etheon</span>
        </Link>
        <Link href="/" style={{ fontSize: '13.5px', fontWeight: 600, color: '#C9BBFF', textDecoration: 'none' }}>← Back</Link>
      </nav>

      <main style={{ flex: 1, maxWidth: '900px', margin: '0 auto', padding: '48px 32px 80px', width: '100%' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 'clamp(28px,4vw,46px)', letterSpacing: '-0.03em', margin: 0 }}>Security</h1>
          <p style={{ fontSize: '15px', color: '#8A8699', marginTop: '12px' }}>How we protect your account and funds.</p>
        </div>

        <div style={{ borderRadius: '26px', padding: '40px 44px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>

          <h2 style={{ ...s.h2, marginTop: 0 }}>Encryption</h2>
          <p style={s.p}>All data in transit is encrypted using TLS 1.2 or higher. Data at rest is encrypted using AES-256 at the infrastructure layer provided by Supabase. Your password is never stored in plain text — it is hashed using bcrypt before storage.</p>

          <h2 style={s.h2}>Payment Security</h2>
          <p style={s.p}>We do not store credit card numbers, CVV codes, or banking credentials. All card processing is handled by Stripe, a PCI DSS Level 1 certified payment processor. Card data never touches our servers.</p>

          <h2 style={s.h2}>Authentication</h2>
          <p style={s.p}>Account authentication is provided by Supabase Auth using industry-standard JWT tokens with short expiry windows. Sessions are invalidated on logout. We recommend using a strong, unique password for your Etheon account.</p>

          <h2 style={s.h2}>Access Controls</h2>
          <p style={s.p}>Access to production infrastructure is restricted to authorised personnel only. Our database uses row-level security policies to ensure users can only access their own data. Admin functions are gated behind separate role-based access controls.</p>

          <h2 style={s.h2}>Deposit Review</h2>
          <p style={s.p}>All deposits are subject to manual admin review before being credited to your account. This step exists to prevent fraud, errors, and unauthorised transactions. We will notify you once your deposit has been reviewed.</p>

          <h2 style={s.h2}>Responsible Disclosure</h2>
          <p style={s.p}>If you discover a security vulnerability in the Etheon platform, please report it to us at <a href="mailto:legal@etheon.io" style={{ color: '#C9BBFF', fontWeight: 600 }}>legal@etheon.io</a> before public disclosure. We take all reports seriously and will respond within 48 hours. We ask that you give us reasonable time to investigate and address the issue before disclosure.</p>
          <p style={{ ...s.p, marginBottom: 0 }}>Please do not access or modify other users&apos; data, perform denial of service attacks, or use automated scanning tools against our infrastructure.</p>

        </div>
      </main>
    </div>
  );
}

