'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { EtheonCrystal } from '@/components/EtheonBrand';



const s = {
  h2: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '18px', color: '#E9E7F2', margin: '32px 0 12px' } as React.CSSProperties,
  p: { fontSize: '15px', color: '#B9B4CC', lineHeight: 1.75, margin: '0 0 14px' } as React.CSSProperties,
  li: { fontSize: '15px', color: '#B9B4CC', lineHeight: 1.75, marginBottom: '6px' } as React.CSSProperties,
};

export default function PrivacyPage() {
  useEffect(() => { document.title = 'Privacy Policy | Etheon'; }, []);
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
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 'clamp(28px,4vw,46px)', letterSpacing: '-0.03em', margin: 0 }}>Privacy Policy</h1>
          <p style={{ fontSize: '15px', color: '#8A8699', marginTop: '12px' }}>Effective date: June 18, 2026</p>
        </div>

        <div style={{ borderRadius: '26px', padding: '40px 44px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>

          <p style={s.p}>Etheon (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the Etheon platform at etheon.site. This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information. By using the platform you agree to the practices described here.</p>

          <h2 style={s.h2}>1. Information We Collect</h2>
          <p style={s.p}><strong style={{ color: '#E9E7F2' }}>Account information.</strong> When you register, we collect your email address, full name, and a hashed password. We do not store your password in plain text.</p>
          <p style={s.p}><strong style={{ color: '#E9E7F2' }}>Payment information.</strong> We do not store your card number, CVV, or banking details. Payment processing is handled by Stripe, Inc. We receive and store transaction identifiers, amounts, and payment status. See Stripe&apos;s privacy policy at stripe.com/privacy.</p>
          <p style={s.p}><strong style={{ color: '#E9E7F2' }}>Usage data.</strong> We collect standard server-side logs including IP addresses, browser type, pages visited, and timestamps. This data is used to operate and secure the platform.</p>
          <p style={s.p}><strong style={{ color: '#E9E7F2' }}>Communications.</strong> If you contact support, we retain the content of that communication to help resolve your request.</p>

          <h2 style={s.h2}>2. How We Use Your Information</h2>
          <ul style={{ paddingLeft: '20px', margin: '0 0 14px' }}>
            <li style={s.li}>To create and manage your account</li>
            <li style={s.li}>To process deposits, subscriptions, and related transactions</li>
            <li style={s.li}>To send account and transaction notifications</li>
            <li style={s.li}>To respond to support requests</li>
            <li style={s.li}>To detect and prevent fraud and abuse</li>
            <li style={s.li}>To comply with legal obligations</li>
          </ul>
          <p style={s.p}>We do not sell your personal information to third parties.</p>

          <h2 style={s.h2}>3. Cookies</h2>
          <p style={s.p}>We use session cookies to maintain your authenticated session. We do not use third-party advertising cookies. Analytics may use first-party cookies to measure aggregate usage. You can disable cookies in your browser settings; doing so will prevent you from remaining logged in.</p>

          <h2 style={s.h2}>4. Data Sharing</h2>
          <p style={s.p}>We share data only with the following categories of parties:</p>
          <ul style={{ paddingLeft: '20px', margin: '0 0 14px' }}>
            <li style={s.li}><strong style={{ color: '#E9E7F2' }}>Stripe</strong> — payment processing. Your payment data is governed by Stripe&apos;s terms.</li>
            <li style={s.li}><strong style={{ color: '#E9E7F2' }}>Supabase</strong> — database and authentication infrastructure hosted in the ap-southeast-1 region.</li>
            <li style={s.li}><strong style={{ color: '#E9E7F2' }}>Vercel</strong> — hosting and edge infrastructure.</li>
            <li style={s.li}><strong style={{ color: '#E9E7F2' }}>Law enforcement</strong> — when required by applicable law or valid legal process.</li>
          </ul>

          <h2 style={s.h2}>5. Data Retention</h2>
          <p style={s.p}>We retain your account data for as long as your account is active. If you close your account, we will delete or anonymise your personal data within 90 days, except where we are required to retain it for legal or financial compliance reasons (typically 7 years for transaction records).</p>

          <h2 style={s.h2}>6. Security</h2>
          <p style={s.p}>We use TLS encryption for all data in transit. Data at rest is encrypted using AES-256 at the infrastructure layer. Access to production data is restricted to authorised personnel. We conduct periodic security reviews. No system is perfectly secure; in the event of a breach affecting your data we will notify you as required by applicable law.</p>

          <h2 style={s.h2}>7. Your Rights</h2>
          <p style={s.p}>Depending on your jurisdiction, you may have rights to:</p>
          <ul style={{ paddingLeft: '20px', margin: '0 0 14px' }}>
            <li style={s.li}>Access the personal data we hold about you</li>
            <li style={s.li}>Request correction of inaccurate data</li>
            <li style={s.li}>Request deletion of your data (subject to legal retention requirements)</li>
            <li style={s.li}>Object to or restrict certain processing</li>
            <li style={s.li}>Receive a portable copy of your data</li>
          </ul>
          <p style={s.p}>To exercise any of these rights, email us at <a href="mailto:legal@etheon.io" style={{ color: '#C9BBFF' }}>legal@etheon.io</a>. We will respond within 30 days.</p>

          <h2 style={s.h2}>8. Children</h2>
          <p style={s.p}>The Etheon platform is not directed at children under 18. We do not knowingly collect personal data from minors. If you believe a minor has created an account, contact us and we will remove the account.</p>

          <h2 style={s.h2}>9. Changes to This Policy</h2>
          <p style={s.p}>We may update this policy from time to time. When we do, we will update the effective date at the top of this page and, for material changes, notify you by email or by a notice on the platform.</p>

          <h2 style={s.h2}>10. Contact</h2>
          <p style={{ ...s.p, marginBottom: 0 }}>For privacy questions or requests, contact us at <a href="mailto:legal@etheon.io" style={{ color: '#C9BBFF', fontWeight: 600 }}>legal@etheon.io</a> or <a href="mailto:support@etheon.io" style={{ color: '#C9BBFF', fontWeight: 600 }}>support@etheon.io</a>.</p>

        </div>
      </main>
    </div>
  );
}

