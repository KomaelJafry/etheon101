'use client';
import Link from 'next/link';
import Icon from '../../components/Icon';
import { EtheonCrystal } from '../../components/EtheonBrand';

const ESSENTIAL_FEATURES = [
  'Unlock Rewards Mining',
  'Daily reward cycle access',
  'Mining dashboard activation',
  'Standard mining allocation',
  'Account progress tracking',
  'Deposit eligibility',
  'Basic support',
];

const PRO_FEATURES = [
  'Everything in Essential',
  'Higher mining allocation limits',
  'Faster progression milestones',
  'Enhanced analytics',
  'Priority support',
  'Advanced account insights',
  'Higher reward-cap eligibility',
  'Priority verification reviews',
];

const COMPARISON = [
  { feature: 'Rewards Mining Access',    essential: true,     pro: true },
  { feature: 'Daily Reward Cycles',      essential: true,     pro: true },
  { feature: 'Progress Tracking',        essential: true,     pro: true },
  { feature: 'Standard Allocation',      essential: true,     pro: false },
  { feature: 'Higher Allocation Limits', essential: false,    pro: true },
  { feature: 'Enhanced Analytics',       essential: false,    pro: true },
  { feature: 'Priority Support',         essential: false,    pro: true },
  { feature: 'Priority Verification',    essential: false,    pro: true },
  { feature: 'Advanced Account Insights',essential: false,    pro: true },
];

const FAQS = [
  {
    q: 'Why is a subscription required?',
    a: 'Etheon operates a managed rewards mining platform. A subscription gives you access to our mining infrastructure, reward cycles, and account management tools. Without an active subscription, mining cannot be activated.',
  },
  {
    q: 'What does "rewards mining" mean?',
    a: 'Rewards Mining is Etheon\'s programme where subscribers participate in mining reward cycles. Your rewards depend on your account status, mining activity, platform rules, and eligibility requirements. Results are not guaranteed.',
  },
  {
    q: 'Can I switch plans?',
    a: 'Yes. You can upgrade from Essential to Pro at any time. Contact support or manage your subscription from the account settings page.',
  },
  {
    q: 'Is there a contract or commitment?',
    a: 'Subscriptions are billed monthly with no long-term contract. You can cancel at any time; your access continues until the end of the current billing period.',
  },
  {
    q: 'Do I need to deposit funds?',
    a: 'To activate rewards mining, both a subscription and a minimum deposit are required. The deposit minimum is shown in your dashboard once subscribed. Deposits are held in your account and not automatically invested.',
  },
  {
    q: 'Are earnings guaranteed?',
    a: 'No. Etheon does not guarantee earnings, returns, or profits. Reward estimates shown are illustrative examples based on platform parameters and are subject to change.',
  },
];

export default function PricingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', color: '#F4F3FA', fontFamily: "'Manrope', system-ui, sans-serif" }}>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: 'rgba(11,10,20,0.92)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg,#9B7BFF,#6E8BFF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EtheonCrystal size={20} />
          </div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '18px', letterSpacing: '-0.02em' }}>Etheon</span>
        </Link>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link href="/login" style={{ fontSize: '14px', fontWeight: 600, color: '#A39FB5', textDecoration: 'none' }}>Log in</Link>
          <Link href="/login?tab=signup" style={{ fontSize: '14px', fontWeight: 700, color: '#fff', background: '#7C5CFF', padding: '9px 20px', borderRadius: '10px', textDecoration: 'none', boxShadow: '0 4px 14px rgba(124,92,255,0.4)' }}>Get started</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 24px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 14px', borderRadius: '999px', background: 'rgba(124,92,255,0.12)', border: '1px solid rgba(124,92,255,0.25)', fontSize: '13px', fontWeight: 700, color: '#C9BBFF', marginBottom: '20px' }}>
            <Icon name="diamond" size={14} color="#C9BBFF" />
            Subscription Plans
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 'clamp(32px,5vw,52px)', letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>
            Choose your plan to unlock<br />
            <span style={{ background: 'linear-gradient(120deg,#b39bff,#6e8bff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Rewards Mining</span>
          </h1>
          <p style={{ fontSize: '16px', color: '#A39FB5', lineHeight: 1.65, maxWidth: '520px', margin: '0 auto 8px' }}>
            An active subscription is required to participate in Etheon Rewards Mining. Choose the plan that fits your goals.
          </p>
          <p style={{ fontSize: '13px', color: '#6F6B82', margin: 0 }}>
            Illustrative reward examples shown. Actual rewards depend on account status, activity, and eligibility. Not guaranteed.
          </p>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '24px', marginBottom: '64px', alignItems: 'start' }}>

          {/* Essential */}
          <div style={{ borderRadius: '24px', padding: '32px', background: 'linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '22px' }}>Etheon Essential</div>
                <div style={{ fontSize: '13px', color: '#8A8699', marginTop: '4px' }}>Entry access to Rewards Mining</div>
              </div>
              <div style={{ padding: '5px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: 700, color: '#A39FB5' }}>Essential</div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '42px', letterSpacing: '-0.03em' }}>£19.99</span>
                <span style={{ fontSize: '15px', color: '#8A8699' }}>/month</span>
              </div>
              <div style={{ fontSize: '12.5px', color: '#6F6B82', marginTop: '4px' }}>Cancel anytime · No contract</div>
            </div>

            <Link href="/login?tab=signup" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '14px', borderRadius: '13px', background: 'rgba(124,92,255,0.18)', border: '1px solid rgba(124,92,255,0.35)', fontSize: '15px', fontWeight: 700, color: '#C9BBFF', textDecoration: 'none', boxSizing: 'border-box', transition: 'background 0.15s' }}>
              Get Essential
              <Icon name="arrow_forward" size={17} color="#C9BBFF" />
            </Link>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '24px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ESSENTIAL_FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon name="check_circle" size={18} color="#16D98A" />
                  <span style={{ fontSize: '14px', color: '#C5C1D6' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro */}
          <div style={{ borderRadius: '24px', padding: '32px', background: 'linear-gradient(160deg,rgba(124,92,255,0.16),rgba(110,139,255,0.08))', border: '1px solid rgba(124,92,255,0.3)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-60px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,92,255,0.28),transparent 65%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', position: 'relative' }}>
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '22px' }}>Etheon Pro</div>
                <div style={{ fontSize: '13px', color: '#A39FB5', marginTop: '4px' }}>Advanced access and higher limits</div>
              </div>
              <div style={{ padding: '5px 12px', borderRadius: '999px', background: 'linear-gradient(120deg,rgba(155,123,255,0.3),rgba(110,139,255,0.3))', border: '1px solid rgba(124,92,255,0.4)', fontSize: '12px', fontWeight: 700, color: '#C9BBFF' }}>Most Features</div>
            </div>

            <div style={{ marginBottom: '28px', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '42px', letterSpacing: '-0.03em' }}>£49.99</span>
                <span style={{ fontSize: '15px', color: '#A39FB5' }}>/month</span>
              </div>
              <div style={{ fontSize: '12.5px', color: '#6F6B82', marginTop: '4px' }}>Cancel anytime · No contract</div>
            </div>

            <Link href="/login?tab=signup" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '14px', borderRadius: '13px', background: '#7C5CFF', fontSize: '15px', fontWeight: 700, color: '#fff', textDecoration: 'none', boxSizing: 'border-box', boxShadow: '0 8px 26px rgba(124,92,255,0.45)' }}>
              Get Pro
              <Icon name="arrow_forward" size={17} color="#fff" />
            </Link>

            <div style={{ height: '1px', background: 'rgba(124,92,255,0.2)', margin: '24px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
              {PRO_FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon name="check_circle" size={18} color="#9B7BFF" />
                  <span style={{ fontSize: '14px', color: '#E9E7F2' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature comparison table */}
        <div style={{ marginBottom: '64px' }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '26px', letterSpacing: '-0.02em', textAlign: 'center', marginBottom: '32px' }}>Plan comparison</h2>
          <div style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px', background: 'rgba(255,255,255,0.04)', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#6F6B82' }}>Feature</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#A39FB5', textAlign: 'center' }}>Essential</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#C9BBFF', textAlign: 'center' }}>Pro</span>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={row.feature} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px', padding: '14px 24px', borderBottom: i < COMPARISON.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                <span style={{ fontSize: '14px', color: '#C5C1D6' }}>{row.feature}</span>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {row.essential
                    ? <Icon name="check" size={18} color="#16D98A" />
                    : <Icon name="remove" size={18} color="#3A3750" />}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {row.pro
                    ? <Icon name="check" size={18} color="#9B7BFF" />
                    : <Icon name="remove" size={18} color="#3A3750" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why subscribe */}
        <div style={{ marginBottom: '64px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '26px', letterSpacing: '-0.02em', marginBottom: '10px' }}>Why subscribe?</h2>
          <p style={{ fontSize: '15px', color: '#A39FB5', marginBottom: '40px', maxWidth: '480px', margin: '0 auto 40px' }}>
            Etheon Rewards Mining is a platform programme accessible only to active subscribers. Here is what a subscription provides.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '20px' }}>
            {[
              { icon: 'bolt', color: '#9B7BFF', title: 'Mining Access', body: 'Start and manage daily mining sessions through the Etheon dashboard. Mining is not available without an active plan.' },
              { icon: 'trending_up', color: '#6E8BFF', title: 'Progression System', body: 'Track your account progress, milestones, and VIP status. Progress is tied to your subscription and activity.' },
              { icon: 'analytics', color: '#16D98A', title: 'Platform Analytics', body: 'View reward estimates, allocation data, and account insights. Pro subscribers get enhanced analytics.' },
              { icon: 'verified', color: '#FFB55C', title: 'Account Tools', body: 'Access deposit eligibility, verification reviews, and support priority based on your plan tier.' },
            ].map(item => (
              <div key={item.title} style={{ padding: '24px', borderRadius: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'left' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: `${item.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <Icon name={item.icon} size={22} color={item.color} />
                </div>
                <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '8px' }}>{item.title}</div>
                <div style={{ fontSize: '13.5px', color: '#8A8699', lineHeight: 1.6 }}>{item.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div style={{ marginBottom: '64px', maxWidth: '720px', margin: '0 auto 64px' }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '26px', letterSpacing: '-0.02em', textAlign: 'center', marginBottom: '32px' }}>Frequently asked questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {FAQS.map(faq => (
              <div key={faq.q} style={{ padding: '20px 22px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '8px', color: '#E9E7F2' }}>{faq.q}</div>
                <div style={{ fontSize: '14px', color: '#8A8699', lineHeight: 1.65 }}>{faq.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance */}
        <div style={{ padding: '24px 28px', borderRadius: '16px', background: 'rgba(255,181,92,0.06)', border: '1px solid rgba(255,181,92,0.18)', display: 'flex', gap: '14px', alignItems: 'flex-start', maxWidth: '720px', margin: '0 auto 48px' }}>
          <Icon name="info" size={20} color="#FFB55C" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div style={{ fontSize: '13.5px', color: '#A39FB5', lineHeight: 1.65 }}>
            <strong style={{ color: '#FFB55C' }}>Important — no guaranteed returns.</strong> Etheon does not guarantee earnings, returns, or profitability. Reward examples are illustrative only and subject to platform rules and eligibility requirements. Mining rewards are not guaranteed and may vary. Past performance does not indicate future results. Subscriptions provide access to platform features, not guaranteed income.
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '28px', letterSpacing: '-0.02em', marginBottom: '12px' }}>Ready to get started?</div>
          <p style={{ fontSize: '15px', color: '#8A8699', marginBottom: '28px' }}>Create an account and activate your subscription to unlock Rewards Mining.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login?tab=signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '15px 32px', borderRadius: '13px', background: '#7C5CFF', fontSize: '15px', fontWeight: 700, color: '#fff', textDecoration: 'none', boxShadow: '0 8px 26px rgba(124,92,255,0.45)' }}>
              Create account <Icon name="arrow_forward" size={18} color="#fff" />
            </Link>
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '15px 32px', borderRadius: '13px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '15px', fontWeight: 700, color: '#C5C1D6', textDecoration: 'none' }}>
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
