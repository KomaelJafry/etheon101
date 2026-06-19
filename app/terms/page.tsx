'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { EtheonCrystal } from '@/components/EtheonBrand';



const s = {
  h2: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '18px', color: '#E9E7F2', margin: '32px 0 12px' } as React.CSSProperties,
  p: { fontSize: '15px', color: '#B9B4CC', lineHeight: 1.75, margin: '0 0 14px' } as React.CSSProperties,
  li: { fontSize: '15px', color: '#B9B4CC', lineHeight: 1.75, marginBottom: '6px' } as React.CSSProperties,
};

export default function TermsPage() {
  useEffect(() => { document.title = 'Terms of Service | Etheon'; }, []);
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
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 'clamp(28px,4vw,46px)', letterSpacing: '-0.03em', margin: 0 }}>Terms of Service</h1>
          <p style={{ fontSize: '15px', color: '#8A8699', marginTop: '12px' }}>Effective date: June 18, 2026</p>
        </div>

        <div style={{ borderRadius: '26px', padding: '40px 44px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>

          <p style={s.p}>These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the Etheon platform operated at etheon.site (&ldquo;Platform&rdquo;). By creating an account or using the Platform you agree to these Terms. If you do not agree, do not use the Platform.</p>

          <h2 style={s.h2}>1. Eligibility</h2>
          <p style={s.p}>You must be at least 18 years old and legally capable of entering into binding contracts in your jurisdiction to use the Platform. By using the Platform you represent that you meet these requirements. The Platform is not available in jurisdictions where it would be prohibited by law.</p>

          <h2 style={s.h2}>2. Account Responsibilities</h2>
          <p style={s.p}>You are responsible for maintaining the confidentiality of your login credentials. You must not share your account with others or allow unauthorised access. You are responsible for all activity that occurs under your account. Notify us immediately at <a href="mailto:support@etheon.io" style={{ color: '#C9BBFF' }}>support@etheon.io</a> if you suspect unauthorised access.</p>

          <h2 style={s.h2}>3. Subscription Services</h2>
          <p style={s.p}>Certain features of the Platform require a paid subscription. Subscription fees are charged in advance on a monthly or annual basis via Stripe. Subscriptions renew automatically unless cancelled before the renewal date. Cancellation stops future charges but does not entitle you to a refund for the current billing period unless required by applicable law.</p>
          <p style={s.p}>We reserve the right to modify subscription pricing with at least 14 days&apos; notice. Continued use after the effective date constitutes acceptance of the new pricing.</p>

          <h2 style={s.h2}>4. Deposits</h2>
          <p style={s.p}>You may deposit funds to your Etheon account balance via Stripe. All deposits are subject to administrative review before being credited. We reserve the right to delay, refuse, or reverse any deposit that we reasonably believe is fraudulent, erroneous, or violates these Terms or applicable law.</p>
          <p style={s.p}><strong style={{ color: '#E9E7F2' }}>Deposits are not investments.</strong> Funds held in your Etheon balance do not accrue interest and are not insured by any governmental deposit protection scheme. We do not guarantee any particular return, profit, or outcome from use of the Platform.</p>

          <h2 style={s.h2}>5. Rewards and Earnings</h2>
          <p style={s.p}>The Platform may display estimated or projected reward figures. These figures are estimates only and are subject to change based on network conditions, hashrate, and other factors outside our control. We make no guarantee of any specific earning amount, rate of return, or profitability. Past performance does not indicate future results.</p>

          <h2 style={s.h2}>6. Withdrawals</h2>
          <p style={s.p}>Withdrawal eligibility is subject to minimum balance thresholds and identity verification requirements as set by the Platform from time to time. We reserve the right to delay or suspend withdrawals pending compliance review or in response to suspected fraud or legal process.</p>

          <h2 style={s.h2}>7. Prohibited Conduct</h2>
          <p style={s.p}>You must not:</p>
          <ul style={{ paddingLeft: '20px', margin: '0 0 14px' }}>
            <li style={s.li}>Use the Platform for money laundering, fraud, or any illegal activity</li>
            <li style={s.li}>Attempt to reverse-engineer, scrape, or disrupt the Platform</li>
            <li style={s.li}>Create multiple accounts to circumvent restrictions</li>
            <li style={s.li}>Provide false information during registration or verification</li>
            <li style={s.li}>Use automated tools to access the Platform without our written consent</li>
            <li style={s.li}>Violate any applicable law or regulation</li>
          </ul>

          <h2 style={s.h2}>8. Suspension and Termination</h2>
          <p style={s.p}>We may suspend or terminate your account at any time if we reasonably believe you have violated these Terms, applicable law, or if continuing to provide services to you creates legal or financial risk. We will make reasonable efforts to notify you before suspension except where immediate action is required for security or legal reasons.</p>
          <p style={s.p}>Upon termination of your account, any accrued but uncredited balance may be forfeited if the termination was caused by a violation of these Terms. Where termination is initiated by us without cause, we will make reasonable efforts to return any verified balance.</p>

          <h2 style={s.h2}>9. Disclaimers</h2>
          <p style={s.p}>THE PLATFORM IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTY OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.</p>
          <p style={s.p}>CRYPTOCURRENCY ACTIVITIES INVOLVE SIGNIFICANT RISK. THE VALUE OF DIGITAL ASSETS CAN DECLINE TO ZERO. YOU ACKNOWLEDGE AND ACCEPT THESE RISKS.</p>

          <h2 style={s.h2}>10. Limitation of Liability</h2>
          <p style={s.p}>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM USE OF THE PLATFORM SHALL NOT EXCEED THE AMOUNTS YOU PAID US IN THE 90 DAYS PRECEDING THE CLAIM. WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.</p>

          <h2 style={s.h2}>11. Service Modifications</h2>
          <p style={s.p}>We reserve the right to modify, suspend, or discontinue any feature or the Platform itself at any time with reasonable notice. We are not liable for any loss resulting from such modifications.</p>

          <h2 style={s.h2}>12. Governing Law</h2>
          <p style={s.p}>These Terms are governed by applicable law. Disputes shall be resolved by binding arbitration or in the courts of the jurisdiction in which Etheon is incorporated, at our election.</p>

          <h2 style={s.h2}>13. Changes to These Terms</h2>
          <p style={s.p}>We may update these Terms. When we do, we will update the effective date and notify you by email or platform notice for material changes. Continued use of the Platform after the effective date constitutes acceptance.</p>

          <h2 style={s.h2}>14. Contact</h2>
          <p style={{ ...s.p, marginBottom: 0 }}>Questions about these Terms: <a href="mailto:legal@etheon.io" style={{ color: '#C9BBFF', fontWeight: 600 }}>legal@etheon.io</a></p>

        </div>
      </main>
    </div>
  );
}

