'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Icon from '../../../components/Icon';
import { OWNER_ADMIN_EMAIL } from '@/lib/admin-config';

interface RevenueData {
  plans: { starter: number; growth: number; annual: number };
  mrr: number;
  arr: number;
  active_subscriptions: number;
  cancelled_subscriptions: number;
  conversion_rate: number;
  avg_revenue_per_customer: number;
  monthly_growth: { month: string; new_subs: number }[];
}

function fmtGbp(v: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(v);
}

function MetricCard({ icon, label, value, sub, color, bg }: { icon: string; label: string; value: string; sub?: string; color: string; bg: string }) {
  return (
    <div style={{ borderRadius: '22px', padding: '20px 22px', background: 'linear-gradient(180deg,rgba(255,255,255,0.048),rgba(255,255,255,0.016))', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ width: '42px', height: '42px', borderRadius: '13px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
        <Icon name={icon} size={22} color={color} />
      </div>
      <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '24px', letterSpacing: '-0.02em', color: '#F4F3FA' }}>{value}</div>
      <div style={{ fontSize: '12.5px', color: '#8A8699', marginTop: '3px' }}>{label}</div>
      {sub && <div style={{ fontSize: '11.5px', color, marginTop: '4px', fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

export default function AdminRevenuePage() {
  const router = useRouter();
  const [data, setData]           = useState<RevenueData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => { document.title = 'Revenue | Etheon Admin'; }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      if ((user.email ?? '').toLowerCase() !== OWNER_ADMIN_EMAIL) { setAccessDenied(true); setLoading(false); return; }
      const res = await fetch('/api/admin/revenue');
      if (res.ok) setData(await res.json());
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (accessDenied) return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <Icon name="lock" size={40} color="#FF6B8A" />
        <div style={{ marginTop: '12px', fontSize: '18px', fontWeight: 700, color: '#FF6B8A', fontFamily: "'Space Grotesk'" }}>Access denied</div>
        <Link href="/admin" style={{ display: 'block', marginTop: '12px', color: '#9b7bff', textDecoration: 'none', fontSize: '13px' }}>← Back to admin</Link>
      </div>
    </div>
  );

  const maxSubs = data ? Math.max(...data.monthly_growth.map(m => m.new_subs), 1) : 1;

  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', color: '#F4F3FA', fontFamily: "'Manrope', system-ui, sans-serif", padding: '32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Link href="/admin" style={{ fontSize: '13px', color: '#7E7A8F', textDecoration: 'none' }}>Admin</Link>
              <span style={{ color: '#3A3750' }}>/</span>
              <span style={{ fontSize: '13px', color: '#C9BBFF', fontWeight: 700 }}>Revenue</span>
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '26px' }}>Revenue Analytics</h1>
            <div style={{ fontSize: '13px', color: '#8A8699', marginTop: '3px' }}>Real subscription data from Stripe via Supabase — never fabricated</div>
          </div>
          <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#C9BBFF', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
            <Icon name="arrow_back" size={15} color="#C9BBFF" />Back
          </Link>
        </div>

        {/* Key metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '16px', marginBottom: '28px' }}>
          <MetricCard icon="trending_up"        label="Monthly Recurring Revenue"  value={loading ? '—' : fmtGbp(data?.mrr ?? 0)}                       color="#16D98A" bg="rgba(22,217,138,0.14)" />
          <MetricCard icon="calendar_month"      label="Annual Recurring Revenue"   value={loading ? '—' : fmtGbp(data?.arr ?? 0)}                       color="#9b7bff" bg="rgba(155,123,255,0.14)" />
          <MetricCard icon="group"               label="Active Subscriptions"       value={loading ? '—' : String(data?.active_subscriptions ?? 0)}       color="#6E8BFF" bg="rgba(110,139,255,0.14)" />
          <MetricCard icon="cancel"              label="Cancelled Subscriptions"    value={loading ? '—' : String(data?.cancelled_subscriptions ?? 0)}    color="#FF6B8A" bg="rgba(255,107,138,0.14)" />
          <MetricCard icon="percent"             label="Conversion Rate"            value={loading ? '—' : `${data?.conversion_rate ?? 0}%`}              color="#FFB55C" bg="rgba(255,181,92,0.14)" />
          <MetricCard icon="payments"            label="Avg Revenue / Customer"     value={loading ? '—' : fmtGbp(data?.avg_revenue_per_customer ?? 0)}   color="#C9BBFF" bg="rgba(201,187,255,0.14)" />
        </div>

        {/* Plan breakdown + Monthly growth */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* Plan breakdown */}
          <div style={{ borderRadius: '24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)', padding: '22px 24px' }}>
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '16px', marginBottom: '20px' }}>Plan Breakdown</div>
            {loading ? (
              <div style={{ color: '#4A4763', fontSize: '13px' }}>Loading…</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { label: 'Starter', count: data?.plans.starter ?? 0, price: '£45/mo', color: '#9b7bff' },
                  { label: 'Growth',  count: data?.plans.growth  ?? 0, price: '£60/mo', color: '#16D98A', badge: 'Most Popular' },
                  { label: 'Annual',  count: data?.plans.annual  ?? 0, price: '£399/yr', color: '#FFB55C' },
                ].map(plan => {
                  const total = (data?.plans.starter ?? 0) + (data?.plans.growth ?? 0) + (data?.plans.annual ?? 0);
                  const pct = total > 0 ? Math.round((plan.count / total) * 100) : 0;
                  return (
                    <div key={plan.label}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#E9E7F2' }}>{plan.label}</span>
                          {plan.badge && <span style={{ fontSize: '10px', fontWeight: 700, color: plan.color, background: `${plan.color}22`, padding: '2px 7px', borderRadius: '999px' }}>{plan.badge}</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', color: '#7E7A8F' }}>{plan.price}</span>
                          <span style={{ fontFamily: "'Space Grotesk'", fontSize: '16px', fontWeight: 700, color: '#E9E7F2' }}>{plan.count}</span>
                        </div>
                      </div>
                      <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)' }}>
                        <div style={{ height: '100%', borderRadius: '999px', background: plan.color, width: `${pct}%`, transition: 'width 0.5s ease' }} />
                      </div>
                      <div style={{ fontSize: '11px', color: '#5A5673', marginTop: '3px' }}>{pct}% of active subscribers</div>
                    </div>
                  );
                })}
                {(data?.plans.starter === 0 && data?.plans.growth === 0 && data?.plans.annual === 0) && (
                  <div style={{ padding: '16px', textAlign: 'center', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontSize: '13px', color: '#5A5673' }}>
                    Not tracked yet — no active subscriptions found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Monthly growth chart */}
          <div style={{ borderRadius: '24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)', padding: '22px 24px' }}>
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '16px', marginBottom: '20px' }}>New Subscriptions (6 months)</div>
            {loading ? (
              <div style={{ color: '#4A4763', fontSize: '13px' }}>Loading…</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '140px' }}>
                {(data?.monthly_growth ?? []).map(m => {
                  const pct = maxSubs > 0 ? (m.new_subs / maxSubs) * 100 : 0;
                  return (
                    <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#9b7bff' }}>{m.new_subs > 0 ? m.new_subs : ''}</div>
                      <div style={{ width: '100%', borderRadius: '6px 6px 0 0', background: m.new_subs > 0 ? 'linear-gradient(180deg,#9b7bff,rgba(155,123,255,0.4))' : 'rgba(255,255,255,0.06)', height: `${Math.max(pct, 4)}%`, transition: 'height 0.5s ease', minHeight: '4px' }} />
                      <div style={{ fontSize: '10px', color: '#5A5673', whiteSpace: 'nowrap' }}>{m.month}</div>
                    </div>
                  );
                })}
              </div>
            )}
            {!loading && data?.monthly_growth.every(m => m.new_subs === 0) && (
              <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '12px', color: '#4A4763' }}>No new subscriptions in the last 6 months</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
