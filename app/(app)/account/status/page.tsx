'use client';
import Link from 'next/link';
import { useApp } from '../../AppContext';
import Icon from '../../../../components/Icon';
import RippleButton from '../../../../components/RippleButton';
import { useState } from 'react';
import { useContent } from '../../../../hooks/useContent';

async function startSubscribeCheckout(): Promise<{ url: string }> {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'growth' }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export default function AccountStatusPage() {
  const { profile, ethPrice } = useApp();
  const { get } = useContent(['mining']);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);

  const miningThreshold = parseFloat(get('mining', 'mining_minimum_start_balance_usd', '100')) || 100;
  const withdrawThreshold = parseFloat(get('mining', 'withdrawal_unlock_balance_usd', '1000')) || 1000;
  const balanceUsd = (profile?.eth_balance ?? 0) * ethPrice;

  const isSubscribed = profile?.is_active ?? false;
  const hasMinBalance = balanceUsd >= miningThreshold;
  const miningActive = profile?.mining_status === 'active';
  const withdrawalUnlocked = balanceUsd >= withdrawThreshold;

  async function handleSubscribe() {
    if (!profile) { window.location.href = '/login'; return; }
    setSubLoading(true); setSubError(null);
    try {
      const { url } = await startSubscribeCheckout();
      if (url) window.location.href = url;
      else setSubError('No checkout URL returned. Please try again.');
    } catch (err) {
      setSubError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubLoading(false);
    }
  }

  const steps = [
    {
      num: 1,
      icon: 'card_membership',
      title: 'Activate Subscription',
      done: isSubscribed,
      current: !isSubscribed,
      body: isSubscribed
        ? 'Your subscription is active. Rewards Mining is unlocked.'
        : 'An active subscription is required to participate in Etheon Rewards Mining.',
      cta: !isSubscribed ? (
        <RippleButton variant="purple" onClick={handleSubscribe} disabled={subLoading}
          style={{ display:'inline-flex', alignItems:'center', gap:'7px', padding:'12px 22px', borderRadius:'11px', fontSize:'14px', fontWeight:700, color:'#fff', background:'#7C5CFF', boxShadow:'0 6px 18px rgba(124,92,255,0.4)', cursor:subLoading?'not-allowed':'pointer', opacity:subLoading?0.7:1 }}>
          {subLoading ? 'Redirecting…' : 'Activate plan'}
          {!subLoading && <Icon name="arrow_forward" size={16} color="#fff" />}
        </RippleButton>
      ) : null,
    },
    {
      num: 2,
      icon: 'account_balance_wallet',
      title: 'Meet Deposit Requirement',
      done: hasMinBalance,
      current: isSubscribed && !hasMinBalance,
      body: hasMinBalance
        ? `Your balance of £${balanceUsd.toFixed(2)} meets the £${miningThreshold} minimum.`
        : `Deposit at least £${miningThreshold} to meet the mining activation requirement. Current balance: £${balanceUsd.toFixed(2)}.`,
      cta: isSubscribed && !hasMinBalance ? (
        <Link href="/deposit" style={{ display:'inline-flex', alignItems:'center', gap:'7px', padding:'12px 22px', borderRadius:'11px', fontSize:'14px', fontWeight:700, color:'#fff', background:'rgba(124,92,255,0.2)', border:'1px solid rgba(124,92,255,0.35)', textDecoration:'none' }}>
          Add funds <Icon name="arrow_forward" size={16} color="#C9BBFF" />
        </Link>
      ) : null,
    },
    {
      num: 3,
      icon: 'bolt',
      title: 'Mining Activation',
      done: miningActive,
      current: isSubscribed && hasMinBalance && !miningActive,
      body: miningActive
        ? 'Your mining session is active. Reward cycles are running.'
        : 'Once subscribed and funded, open the mining console to start your first session.',
      cta: isSubscribed && hasMinBalance && !miningActive ? (
        <Link href="/mining" style={{ display:'inline-flex', alignItems:'center', gap:'7px', padding:'12px 22px', borderRadius:'11px', fontSize:'14px', fontWeight:700, color:'#fff', background:'rgba(124,92,255,0.2)', border:'1px solid rgba(124,92,255,0.35)', textDecoration:'none' }}>
          Open mining console <Icon name="arrow_forward" size={16} color="#C9BBFF" />
        </Link>
      ) : null,
    },
    {
      num: 4,
      icon: 'north_east',
      title: 'Withdrawal Progress',
      done: withdrawalUnlocked,
      current: miningActive && !withdrawalUnlocked,
      body: withdrawalUnlocked
        ? 'Your balance has reached the withdrawal threshold. Withdrawals are available.'
        : `Withdrawals unlock at £${withdrawThreshold.toLocaleString()} total balance. Current: £${balanceUsd.toFixed(2)}.`,
      cta: withdrawalUnlocked ? (
        <Link href="/withdrawals" style={{ display:'inline-flex', alignItems:'center', gap:'7px', padding:'12px 22px', borderRadius:'11px', fontSize:'14px', fontWeight:700, color:'#fff', background:'rgba(22,217,138,0.18)', border:'1px solid rgba(22,217,138,0.3)', textDecoration:'none' }}>
          Request withdrawal <Icon name="arrow_forward" size={16} color="#16D98A" />
        </Link>
      ) : null,
    },
  ];

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '8px 0 40px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '22px', marginBottom: '6px' }}>Account Readiness</div>
        <div style={{ fontSize: '13.5px', color: '#8A8699' }}>Complete each step to unlock full platform access.</div>
      </div>

      {/* Subscription status banner */}
      <div style={{ padding: '16px 20px', borderRadius: '16px', marginBottom: '24px', background: isSubscribed ? 'rgba(22,217,138,0.08)' : 'rgba(255,107,138,0.08)', border: `1px solid ${isSubscribed ? 'rgba(22,217,138,0.25)' : 'rgba(255,107,138,0.25)'}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Icon name={isSubscribed ? 'verified' : 'lock'} size={22} color={isSubscribed ? '#16D98A' : '#FF6B8A'} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: isSubscribed ? '#16D98A' : '#FF6B8A' }}>
            {isSubscribed ? 'Subscription Active' : 'Subscription Inactive'}
          </div>
          <div style={{ fontSize: '12.5px', color: '#8A8699', marginTop: '2px' }}>
            {isSubscribed
              ? 'Rewards Mining is unlocked for your account.'
              : 'An active subscription is required to participate in Etheon Rewards Mining.'}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {steps.map((step, i) => {
          const isFuture = !step.done && !step.current;
          return (
            <div key={step.num} style={{ borderRadius: '18px', padding: '20px 22px', background: step.current ? 'linear-gradient(160deg,rgba(124,92,255,0.12),rgba(255,255,255,0.02))' : 'rgba(255,255,255,0.03)', border: `1px solid ${step.done ? 'rgba(22,217,138,0.2)' : step.current ? 'rgba(124,92,255,0.3)' : 'rgba(255,255,255,0.06)'}`, opacity: isFuture ? 0.55 : 1, transition: 'opacity 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                {/* Step indicator */}
                <div style={{ width: '42px', height: '42px', borderRadius: '13px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: step.done ? 'rgba(22,217,138,0.16)' : step.current ? 'rgba(124,92,255,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${step.done ? 'rgba(22,217,138,0.3)' : step.current ? 'rgba(124,92,255,0.35)' : 'rgba(255,255,255,0.07)'}` }}>
                  {step.done
                    ? <Icon name="check" size={20} color="#16D98A" />
                    : <Icon name={step.icon} size={20} color={step.current ? '#C9BBFF' : '#4A4763'} />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#6F6B82', letterSpacing: '0.05em' }}>STEP {step.num}</span>
                    {step.current && <span style={{ fontSize: '11px', fontWeight: 700, color: '#C9BBFF', background: 'rgba(124,92,255,0.18)', padding: '2px 8px', borderRadius: '999px' }}>Current</span>}
                    {step.done && <span style={{ fontSize: '11px', fontWeight: 700, color: '#16D98A', background: 'rgba(22,217,138,0.12)', padding: '2px 8px', borderRadius: '999px' }}>Complete</span>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>{step.title}</div>
                  <div style={{ fontSize: '13.5px', color: '#8A8699', lineHeight: 1.55 }}>{step.body}</div>
                  {step.cta && <div style={{ marginTop: '14px' }}>{step.cta}</div>}
                  {subError && step.num === 1 && (
                    <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,107,138,0.1)', border: '1px solid rgba(255,107,138,0.25)', fontSize: '12.5px', color: '#FF6B8A' }}>{subError}</div>
                  )}
                </div>
              </div>

              {/* Connector line (not on last) */}
              {i < steps.length - 1 && (
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)', margin: '16px 0 0' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Compliance note */}
      <div style={{ marginTop: '28px', padding: '14px 18px', borderRadius: '14px', background: 'rgba(255,181,92,0.06)', border: '1px solid rgba(255,181,92,0.15)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <Icon name="info" size={17} color="#FFB55C" style={{ flexShrink: 0, marginTop: '1px' }} />
        <div style={{ fontSize: '12.5px', color: '#6F6B82', lineHeight: 1.6 }}>
          Reward estimates are illustrative only. Actual rewards depend on account status, activity, platform rules, and eligibility requirements. Mining rewards are not guaranteed.
        </div>
      </div>

      {/* View plans link */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link href="/pricing" style={{ fontSize: '13.5px', fontWeight: 700, color: '#C9BBFF', textDecoration: 'none' }}>
          View plan details and comparison →
        </Link>
      </div>
    </div>
  );
}
