'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Icon from '../../components/Icon';
import { triggerFlare } from '../../components/ActionFlare';
import { EtheonCrystal } from '../../components/EtheonBrand';

type Plan = 'starter' | 'growth' | 'annual';

const PLANS = [
  {
    id: 'starter' as Plan,
    name: 'Starter',
    price: '£45',
    period: '/month',
    sub: 'Basic access to Rewards Mining',
    badge: null,
    highlight: false,
    cta: 'Start with Starter',
    valueNote: null,
    features: [
      { text: 'Rewards Mining access',           included: true },
      { text: 'Basic daily reward cycle access', included: true },
      { text: 'Standard mining dashboard',       included: true },
      { text: 'Basic progress tracking',         included: true },
      { text: 'Standard support',               included: true },
      { text: 'Standard allocation limits',      included: true },
      { text: 'Standard verification review',    included: true },
      { text: 'Advanced analytics',              included: false },
      { text: 'Priority support',                included: false },
      { text: 'Priority verification',           included: false },
      { text: 'Enhanced allocation tools',       included: false },
    ],
  },
  {
    id: 'growth' as Plan,
    name: 'Growth',
    price: '£60',
    period: '/month',
    sub: 'Best-value monthly plan for active users',
    badge: 'Most Popular',
    highlight: true,
    cta: 'Choose Growth',
    valueNote: null,
    features: [
      { text: 'Everything in Starter',           included: true },
      { text: 'Higher mining allocation limits', included: true },
      { text: 'Enhanced reward-cycle visibility',included: true },
      { text: 'Advanced progress tracking',      included: true },
      { text: 'Account readiness insights',      included: true },
      { text: 'Priority verification review',    included: true },
      { text: 'Priority support',               included: true },
      { text: 'Advanced dashboard analytics',    included: true },
      { text: 'Higher reward-cap eligibility',   included: true },
    ],
  },
  {
    id: 'annual' as Plan,
    name: 'Annual Pro',
    price: '£399',
    period: '/year',
    sub: 'Best long-term value for committed users',
    badge: 'Best Long-Term Value',
    highlight: false,
    cta: 'Go Annual',
    valueNote: 'Equivalent to £33.25/month',
    features: [
      { text: 'Everything in Growth',                  included: true },
      { text: 'Lowest effective monthly cost',          included: true },
      { text: '12 months of continuous access',        included: true },
      { text: 'Priority support',                      included: true },
      { text: 'Advanced analytics',                    included: true },
      { text: 'Higher allocation eligibility',         included: true },
      { text: 'Priority verification review',          included: true },
      { text: 'Long-term progression tools',           included: true },
    ],
  },
] as const;

const COMPARISON_ROWS = [
  { feature: 'Rewards Mining Access',      starter: true,  growth: true,  annual: true  },
  { feature: 'Daily Reward Cycles',        starter: true,  growth: true,  annual: true  },
  { feature: 'Progress Tracking',          starter: 'Basic', growth: 'Advanced', annual: 'Advanced' },
  { feature: 'Allocation Limits',          starter: 'Standard', growth: 'Higher', annual: 'Highest' },
  { feature: 'Dashboard Analytics',        starter: 'Standard', growth: 'Enhanced', annual: 'Enhanced' },
  { feature: 'Support Priority',           starter: 'Standard', growth: 'Priority', annual: 'Priority' },
  { feature: 'Verification Review',        starter: 'Standard', growth: 'Priority', annual: 'Priority' },
  { feature: 'Reward-Cap Eligibility',     starter: 'Standard', growth: 'Higher',  annual: 'Highest' },
  { feature: 'Account Insights',           starter: false, growth: true,  annual: true  },
  { feature: 'Billing',                    starter: 'Monthly', growth: 'Monthly', annual: 'Annual' },
];

const FAQS = [
  { q: 'Why is a subscription required?', a: 'Etheon operates a managed rewards mining platform. A subscription gives you access to our mining infrastructure, reward cycles, and account management tools. Mining cannot be activated without an active subscription.' },
  { q: 'What is the difference between Growth and Starter?', a: 'Growth includes higher allocation limits, advanced analytics, priority support, priority verification review, and enhanced reward-cycle visibility. Starter provides basic access with standard limits.' },
  { q: 'Why is Growth the most popular plan?', a: 'Growth is positioned as the best-value monthly plan for users who want stronger platform access and better progression tools without committing to an annual plan.' },
  { q: 'Is Annual Pro the best deal?', a: 'Annual Pro offers the lowest effective monthly cost (£33.25/month equivalent) and is ideal for users who are committed to the platform long-term.' },
  { q: 'Are earnings guaranteed?', a: 'No. Etheon does not guarantee earnings, returns, or profits. Reward examples are illustrative only and subject to platform rules and eligibility requirements.' },
  { q: 'Can I cancel anytime?', a: 'Monthly plans can be cancelled at any time; access continues until the end of the billing period. Annual plans provide 12 months of access from the subscription start date.' },
];

async function startCheckout(plan: Plan): Promise<{ url?: string; error?: string }> {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { error: (json as { error?: string }).error ?? 'Something went wrong.' };
  return json as { url: string };
}

function CellVal({ val }: { val: boolean | string }) {
  if (val === true)  return <Icon name="check" size={18} color="#16D98A" />;
  if (val === false) return <Icon name="remove" size={16} color="#3A3750" />;
  return <span style={{ fontSize: '12.5px', color: '#C5C1D6', fontWeight: 600 }}>{val}</span>;
}

export default function PricingPage() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Pricing | Etheon';
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    sb.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
  }, []);

  async function handlePlanClick(plan: Plan, e?: React.MouseEvent) {
    setPlanError(null);
    if (!loggedIn) { router.push('/login?tab=signup'); return; }
    triggerFlare({ x: e?.clientX, y: e?.clientY });
    setLoadingPlan(plan);
    const result = await startCheckout(plan);
    if (result.error) { setPlanError(result.error); setLoadingPlan(null); return; }
    if (result.url) window.location.assign(result.url);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', color: '#F4F3FA', fontFamily: "'Manrope', system-ui, sans-serif" }}>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 40px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: 'rgba(11,10,20,0.92)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg,#9B7BFF,#6E8BFF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EtheonCrystal size={20} />
          </div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '18px', letterSpacing: '-0.02em' }}>Etheon</span>
        </Link>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {loggedIn
            ? <Link href="/dashboard" style={{ fontSize: '14px', fontWeight: 700, color: '#fff', background: '#7C5CFF', padding: '9px 20px', borderRadius: '10px', textDecoration: 'none', boxShadow: '0 4px 14px rgba(124,92,255,0.4)' }}>Dashboard</Link>
            : <>
                <Link href="/login" style={{ fontSize: '14px', fontWeight: 600, color: '#A39FB5', textDecoration: 'none' }}>Log in</Link>
                <Link href="/login?tab=signup" style={{ fontSize: '14px', fontWeight: 700, color: '#fff', background: '#7C5CFF', padding: '9px 20px', borderRadius: '10px', textDecoration: 'none', boxShadow: '0 4px 14px rgba(124,92,255,0.4)' }}>Get started</Link>
              </>}
        </div>
      </nav>

      <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '60px 24px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 14px', borderRadius: '999px', background: 'rgba(124,92,255,0.12)', border: '1px solid rgba(124,92,255,0.25)', fontSize: '13px', fontWeight: 700, color: '#C9BBFF', marginBottom: '20px' }}>
            <Icon name="diamond" size={14} color="#C9BBFF" />
            Subscription Plans
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 'clamp(30px,5vw,50px)', letterSpacing: '-0.03em', margin: '0 0 14px', lineHeight: 1.1 }}>
            Unlock Rewards Mining<br />
            <span style={{ background: 'linear-gradient(120deg,#b39bff,#6e8bff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>with the right plan</span>
          </h1>
          <p style={{ fontSize: '16px', color: '#A39FB5', lineHeight: 1.65, maxWidth: '500px', margin: '0 auto 8px' }}>
            An active subscription is required to participate in Etheon Rewards Mining. Choose the plan that fits your goals.
          </p>
          <p style={{ fontSize: '12.5px', color: '#6F6B82', margin: 0 }}>
            Reward examples are illustrative only. Not a guarantee of earnings or returns.
          </p>
        </div>

        {planError && (
          <div style={{ maxWidth: '520px', margin: '0 auto 32px', padding: '14px 18px', borderRadius: '13px', background: 'rgba(255,107,138,0.1)', border: '1px solid rgba(255,107,138,0.3)', fontSize: '13.5px', color: '#FF6B8A', textAlign: 'center' }}>
            {planError}
          </div>
        )}

        {/* Plan cards — Growth in centre, visually largest */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '20px', marginBottom: '64px', alignItems: 'start' }}>
          {PLANS.map(plan => {
            const busy = loadingPlan === plan.id;
            return (
              <div key={plan.id} style={{ position: 'relative', borderRadius: '24px', padding: plan.highlight ? '36px 30px' : '28px 26px', background: plan.highlight ? 'linear-gradient(160deg,rgba(124,92,255,0.22),rgba(110,139,255,0.08))' : 'linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))', border: plan.highlight ? '2px solid rgba(124,92,255,0.65)' : '1px solid rgba(255,255,255,0.09)', boxShadow: plan.highlight ? '0 0 60px rgba(124,92,255,0.28), 0 0 120px rgba(124,92,255,0.12), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none', transform: plan.highlight ? 'translateY(-10px) scale(1.02)' : 'none', overflow: 'hidden', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}>

                {/* Glow blob for highlight card */}
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: '-60px', right: '-50px', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,92,255,0.3),transparent 65%)', pointerEvents: 'none' }} />
                )}

                {/* Badge */}
                {plan.badge && (
                  <div style={{ position: 'absolute', top: plan.highlight ? '20px' : '16px', right: '20px', padding: '4px 12px', borderRadius: '999px', background: plan.highlight ? 'linear-gradient(120deg,#9B7BFF,#6E8BFF)' : 'rgba(255,255,255,0.08)', fontSize: '11.5px', fontWeight: 700, color: plan.highlight ? '#fff' : '#A39FB5', boxShadow: plan.highlight ? '0 4px 12px rgba(124,92,255,0.4)' : 'none' }}>
                    {plan.badge}
                  </div>
                )}

                <div style={{ position: 'relative' }}>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: plan.highlight ? '24px' : '20px', marginBottom: '4px' }}>{plan.name}</div>
                  <div style={{ fontSize: '13px', color: plan.highlight ? '#C9BBFF' : '#8A8699', marginBottom: '22px' }}>{plan.sub}</div>

                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: plan.highlight ? '48px' : '40px', letterSpacing: '-0.03em' }}>{plan.price}</span>
                      <span style={{ fontSize: '15px', color: '#8A8699' }}>{plan.period}</span>
                    </div>
                    {plan.valueNote && (
                      <div style={{ marginTop: '5px', fontSize: '13px', fontWeight: 700, color: '#16D98A' }}>{plan.valueNote}</div>
                    )}
                    <div style={{ fontSize: '12px', color: '#6F6B82', marginTop: '3px' }}>Cancel anytime · No contract</div>
                  </div>

                  <button
                    onClick={(e) => handlePlanClick(plan.id, e)}
                    disabled={busy}
                    style={{ width: '100%', padding: '14px', borderRadius: '13px', fontSize: plan.highlight ? '15px' : '14px', fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1, transition: 'opacity 0.15s', border: 'none', ...(plan.highlight ? { background: '#7C5CFF', color: '#fff', boxShadow: '0 8px 26px rgba(124,92,255,0.45)' } : { background: 'rgba(124,92,255,0.12)', color: '#C9BBFF', border: '1px solid rgba(124,92,255,0.28)' }) }}>
                    {busy ? 'Redirecting to checkout…' : plan.cta}
                  </button>

                  {plan.highlight && (
                    <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '12px', color: '#6F6B82' }}>
                      Recommended for active users
                    </div>
                  )}

                  <div style={{ height: '1px', background: plan.highlight ? 'rgba(124,92,255,0.2)' : 'rgba(255,255,255,0.06)', margin: '22px 0' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {plan.features.map(f => (
                      <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: f.included ? 1 : 0.4 }}>
                        <Icon name={f.included ? 'check_circle' : 'cancel'} size={17} color={f.included ? (plan.highlight ? '#9B7BFF' : '#16D98A') : '#3A3750'} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '13.5px', color: f.included ? (plan.highlight ? '#E9E7F2' : '#C5C1D6') : '#4A4763' }}>{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature comparison table */}
        <div style={{ marginBottom: '64px' }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '26px', letterSpacing: '-0.02em', textAlign: 'center', marginBottom: '32px' }}>Full plan comparison</h2>
          <div style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 140px 120px', background: 'rgba(255,255,255,0.04)', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#6F6B82' }}>Feature</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#A39FB5', textAlign: 'center' }}>Starter</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#C9BBFF', textAlign: 'center' }}>Growth ★</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#A39FB5', textAlign: 'center' }}>Annual Pro</span>
            </div>
            {COMPARISON_ROWS.map((row, i) => (
              <div key={row.feature} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 140px 120px', padding: '13px 24px', borderBottom: i < COMPARISON_ROWS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#C5C1D6' }}>{row.feature}</span>
                <div style={{ display: 'flex', justifyContent: 'center' }}><CellVal val={row.starter} /></div>
                <div style={{ display: 'flex', justifyContent: 'center', background: 'rgba(124,92,255,0.06)', borderRadius: '8px', padding: '3px 0' }}><CellVal val={row.growth} /></div>
                <div style={{ display: 'flex', justifyContent: 'center' }}><CellVal val={row.annual} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* Why subscribe */}
        <div style={{ marginBottom: '64px' }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '26px', letterSpacing: '-0.02em', textAlign: 'center', marginBottom: '10px' }}>Why subscribe?</h2>
          <p style={{ fontSize: '15px', color: '#A39FB5', marginBottom: '36px', maxWidth: '480px', margin: '0 auto 36px', textAlign: 'center' }}>
            Etheon Rewards Mining is accessible only to active subscribers.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '18px' }}>
            {[
              { icon: 'bolt',        color: '#9B7BFF', title: 'Mining Access',        body: 'Start and manage daily mining sessions. Mining cannot be activated without a subscription.' },
              { icon: 'trending_up', color: '#6E8BFF', title: 'Progression Tools',    body: 'Track milestones, VIP status, and account growth tied to your subscription tier.' },
              { icon: 'analytics',   color: '#16D98A', title: 'Platform Analytics',   body: 'View reward data and allocation insights. Growth and Annual unlock enhanced analytics.' },
              { icon: 'verified',    color: '#FFB55C', title: 'Priority Access',       body: 'Growth and Annual subscribers receive priority support and verification reviews.' },
            ].map(item => (
              <div key={item.title} style={{ padding: '22px', borderRadius: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${item.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                  <Icon name={item.icon} size={21} color={item.color} />
                </div>
                <div style={{ fontWeight: 700, fontSize: '14.5px', marginBottom: '6px' }}>{item.title}</div>
                <div style={{ fontSize: '13px', color: '#8A8699', lineHeight: 1.6 }}>{item.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: '720px', margin: '0 auto 64px' }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '26px', letterSpacing: '-0.02em', textAlign: 'center', marginBottom: '28px' }}>Frequently asked questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {FAQS.map(faq => (
              <div key={faq.q} style={{ padding: '18px 22px', borderRadius: '15px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontWeight: 700, fontSize: '14.5px', marginBottom: '7px', color: '#E9E7F2' }}>{faq.q}</div>
                <div style={{ fontSize: '13.5px', color: '#8A8699', lineHeight: 1.65 }}>{faq.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance */}
        <div style={{ padding: '22px 26px', borderRadius: '16px', background: 'rgba(255,181,92,0.06)', border: '1px solid rgba(255,181,92,0.18)', display: 'flex', gap: '14px', alignItems: 'flex-start', maxWidth: '720px', margin: '0 auto 48px' }}>
          <Icon name="info" size={20} color="#FFB55C" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div style={{ fontSize: '13px', color: '#A39FB5', lineHeight: 1.65 }}>
            <strong style={{ color: '#FFB55C' }}>No guaranteed returns.</strong>{' '}
            Etheon does not guarantee earnings, returns, or profitability. Subscriptions provide access to platform features, not guaranteed income. Reward examples are illustrative only and subject to platform rules and eligibility requirements. Past performance does not indicate future results.
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '26px', letterSpacing: '-0.02em', marginBottom: '10px' }}>Ready to get started?</div>
          <p style={{ fontSize: '15px', color: '#8A8699', marginBottom: '26px' }}>Create an account and choose your plan to unlock Rewards Mining.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={(e) => handlePlanClick('growth', e)} disabled={!!loadingPlan}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '15px 32px', borderRadius: '13px', background: '#7C5CFF', fontSize: '15px', fontWeight: 700, color: '#fff', border: 'none', cursor: loadingPlan ? 'not-allowed' : 'pointer', opacity: loadingPlan ? 0.7 : 1, boxShadow: '0 8px 26px rgba(124,92,255,0.45)' }}>
              {loadingPlan === 'growth' ? 'Redirecting…' : 'Choose Growth — Most Popular'}
              {loadingPlan !== 'growth' && <Icon name="arrow_forward" size={18} color="#fff" />}
            </button>
            {!loggedIn && (
              <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '15px 32px', borderRadius: '13px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '15px', fontWeight: 700, color: '#C5C1D6', textDecoration: 'none' }}>
                Log in
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
