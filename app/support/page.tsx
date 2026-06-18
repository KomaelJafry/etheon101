'use client';
import Link from 'next/link';
import { EtheonCrystal } from '@/components/EtheonBrand';



const s = {
  h2: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '18px', color: '#E9E7F2', margin: '32px 0 12px' } as React.CSSProperties,
  p: { fontSize: '15px', color: '#B9B4CC', lineHeight: 1.75, margin: '0 0 14px' } as React.CSSProperties,
};

export default function SupportPage() {
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
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 'clamp(28px,4vw,46px)', letterSpacing: '-0.03em', margin: 0 }}>Support Center</h1>
          <p style={{ fontSize: '15px', color: '#8A8699', marginTop: '12px' }}>We are here to help.</p>
        </div>

        <div style={{ borderRadius: '26px', padding: '40px 44px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '20px' }}>

          <h2 style={{ ...s.h2, marginTop: 0 }}>Contact Us</h2>
          <p style={s.p}>Email is the fastest way to reach our team. We typically respond within 24 hours on business days.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <a href="mailto:support@etheon.io" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '20px 22px', borderRadius: '16px', background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.2)', textDecoration: 'none', transition: 'border-color 0.15s' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#9b7bff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>General Support</span>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#C9BBFF' }}>support@etheon.io</span>
              <span style={{ fontSize: '13px', color: '#7E7A8F' }}>Account issues, deposits, withdrawals</span>
            </a>
            <a href="mailto:legal@etheon.io" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '20px 22px', borderRadius: '16px', background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.2)', textDecoration: 'none' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#9b7bff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Legal & Privacy</span>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#C9BBFF' }}>legal@etheon.io</span>
              <span style={{ fontSize: '13px', color: '#7E7A8F' }}>Data requests, compliance, legal notices</span>
            </a>
          </div>

          <h2 style={s.h2}>Common Questions</h2>

          <p style={{ ...s.p, fontWeight: 700, color: '#E9E7F2', marginBottom: '6px' }}>How long does a deposit take to be credited?</p>
          <p style={s.p}>All deposits are reviewed manually before being credited. This typically takes 1–2 business days. You will receive confirmation once the deposit has been reviewed.</p>

          <p style={{ ...s.p, fontWeight: 700, color: '#E9E7F2', marginBottom: '6px' }}>My deposit shows as pending — what does that mean?</p>
          <p style={s.p}>Pending means your payment was received by Stripe and is awaiting admin review. No further action is required on your part. Contact <a href="mailto:support@etheon.io" style={{ color: '#C9BBFF' }}>support@etheon.io</a> if it has been more than 3 business days.</p>

          <p style={{ ...s.p, fontWeight: 700, color: '#E9E7F2', marginBottom: '6px' }}>How do I cancel my subscription?</p>
          <p style={s.p}>You can cancel your subscription from your account settings at any time. Your subscription will remain active until the end of the current billing period.</p>

          <p style={{ ...s.p, fontWeight: 700, color: '#E9E7F2', marginBottom: '6px' }}>I can&apos;t log in to my account.</p>
          <p style={{ ...s.p, marginBottom: 0 }}>Use the &ldquo;Forgot password&rdquo; link on the login page to reset your password. If you still cannot access your account, email <a href="mailto:support@etheon.io" style={{ color: '#C9BBFF' }}>support@etheon.io</a> with your registered email address.</p>

        </div>
      </main>
    </div>
  );
}

