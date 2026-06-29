'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '../AppContext';
import Icon from '../../../components/Icon';
import RippleButton from '../../../components/RippleButton';

// ── Types ────────────────────────────────────────────────
interface Check { key: string; label: string; status: 'pending' | 'complete' | 'failed' | 'not_required'; customer_note?: string; }
interface Message { id: string; title: string; body: string; type: string; is_read: boolean; }
interface StatusData {
  profile: { full_name: string; email: string; eth_balance: number; gbp_balance: number; mining_status: string; is_active: boolean; eth_wallet_address?: string; };
  subscription: { status: string; billing_period: string } | null;
  checks: Check[];
  messages: Message[];
  config: { miningThreshold: number; withdrawalThreshold: number; };
}

// ── Helpers ──────────────────────────────────────────────
function ProgressBar({ pct, color, bg }: { pct: number; color: string; bg?: string }) {
  return (
    <div style={{ height: '10px', borderRadius: '999px', background: bg ?? 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: '999px', background: color, width: `${Math.min(100, Math.max(0, pct))}%`, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function CheckRow({ check }: { check: Check }) {
  const icon = check.status === 'complete' ? 'check_circle' : check.status === 'failed' ? 'cancel' : check.status === 'not_required' ? 'remove_circle' : 'radio_button_unchecked';
  const color = check.status === 'complete' ? '#16D98A' : check.status === 'failed' ? '#FF6B8A' : check.status === 'not_required' ? '#6F6B82' : '#FFB55C';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <Icon name={icon} size={22} color={color} style={{ flexShrink: 0, marginTop: '1px' }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: check.status === 'complete' ? '#E9E7F2' : '#C5C1D6' }}>{check.label}</div>
        {check.customer_note && <div style={{ fontSize: '12.5px', color: '#8A8699', marginTop: '3px' }}>{check.customer_note}</div>}
      </div>
      <span style={{ fontSize: '11.5px', fontWeight: 700, color, background: `${color}22`, padding: '4px 10px', borderRadius: '999px', flexShrink: 0, whiteSpace: 'nowrap' }}>
        {check.status === 'complete' ? 'Done' : check.status === 'failed' ? 'Action needed' : check.status === 'not_required' ? 'N/A' : 'Pending'}
      </span>
    </div>
  );
}

function AdminMessage({ msg }: { msg: Message }) {
  const styles: Record<string, { color: string; bg: string; border: string; icon: string }> = {
    info:    { color: '#C9BBFF', bg: 'rgba(124,92,255,0.1)',  border: 'rgba(124,92,255,0.25)',  icon: 'info' },
    success: { color: '#16D98A', bg: 'rgba(22,217,138,0.1)',  border: 'rgba(22,217,138,0.25)',  icon: 'check_circle' },
    warning: { color: '#FFB55C', bg: 'rgba(255,181,92,0.1)',  border: 'rgba(255,181,92,0.25)',  icon: 'warning' },
    error:   { color: '#FF8DA3', bg: 'rgba(255,107,138,0.1)', border: 'rgba(255,107,138,0.25)', icon: 'priority_high' },
  };
  const s = styles[msg.type] ?? styles.info;
  return (
    <div style={{ padding: '16px 18px', borderRadius: '16px', background: s.bg, border: `1px solid ${s.border}`, display: 'flex', gap: '13px', alignItems: 'flex-start' }}>
      <Icon name={s.icon} size={20} color={s.color} style={{ flexShrink: 0, marginTop: '1px' }} />
      <div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: s.color, marginBottom: '4px' }}>{msg.title}</div>
        <div style={{ fontSize: '13.5px', color: '#B9B4CC', lineHeight: 1.55 }}>{msg.body}</div>
      </div>
    </div>
  );
}

function Skeleton({ h = 18, w = '100%', r = 8 }: { h?: number; w?: string | number; r?: number }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r, flexShrink: 0 }} />;
}

// ── Main component ────────────────────────────────────────
export default function AccountStatusPage() {
  const { ethPrice } = useApp();
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/account-status')
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json) setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const ethBalance = data?.profile.eth_balance ?? 0;
  const gbpBalance = data?.profile.gbp_balance ?? 0;
  const balanceUsd = ethBalance * ethPrice + gbpBalance;
  const miningThreshold = data?.config.miningThreshold ?? 100;
  const withdrawalThreshold = data?.config.withdrawalThreshold ?? 1000;
  const miningPct = Math.min(100, (balanceUsd / miningThreshold) * 100);
  const withdrawalPct = Math.min(100, (balanceUsd / withdrawalThreshold) * 100);
  const miningLocked = balanceUsd < miningThreshold;
  const withdrawalLocked = balanceUsd < withdrawalThreshold;
  const hasSub = ['active', 'trialing'].includes(data?.subscription?.status ?? '');
  const checks = data?.checks ?? [];
  const completedChecks = checks.filter(c => c.status === 'complete').length;
  const totalChecks = checks.filter(c => c.status !== 'not_required').length;
  const readinessScore = totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0;
  const messages = (data?.messages ?? []).filter(m => m.is_read === false || true); // show all visible messages

  const depositHref = '/deposit';

  return (
    <div style={{ maxWidth: '860px' }}>

      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '26px', letterSpacing: '-0.02em' }}>Account status</h1>
        <div style={{ fontSize: '14px', color: '#8A8699', marginTop: '4px' }}>
          {loading ? 'Loading your account status…' : `Welcome, ${data?.profile.full_name?.split(' ')[0] ?? 'there'}. Here is a summary of your account.`}
        </div>
      </div>

      {/* Admin messages */}
      {messages.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {messages.map(m => <AdminMessage key={m.id} msg={m} />)}
        </div>
      )}

      {/* Readiness score + overview */}
      <div style={{ borderRadius: '26px', padding: '26px 28px', background: 'linear-gradient(160deg,rgba(124,92,255,0.16),rgba(255,255,255,0.02) 55%)', border: '1px solid rgba(124,92,255,0.22)', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-40px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,92,255,0.25),transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#A39FB5', fontWeight: 600, marginBottom: '4px' }}>Account readiness</div>
            {loading ? <Skeleton h={44} w="180px" r={10} /> : (
              <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '42px', letterSpacing: '-0.03em', lineHeight: 1 }}>
                <span style={{ color: readinessScore >= 80 ? '#16D98A' : readinessScore >= 50 ? '#FFB55C' : '#FF6B8A' }}>{readinessScore}%</span>
              </div>
            )}
            {!loading && <div style={{ fontSize: '13px', color: '#7E7A8F', marginTop: '6px' }}>{completedChecks} of {totalChecks} checks complete</div>}
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {loading ? (
              <>{[1,2,3].map(i => <Skeleton key={i} h={36} w="120px" r={999} />)}</>
            ) : [
              { label: hasSub ? 'Subscribed' : 'Not subscribed', ok: hasSub },
              { label: miningLocked ? 'Mining locked' : 'Mining unlocked', ok: !miningLocked },
              { label: withdrawalLocked ? 'Withdrawals locked' : 'Withdrawals unlocked', ok: !withdrawalLocked },
            ].map(b => (
              <span key={b.label} style={{ padding: '7px 14px', borderRadius: '999px', fontSize: '12.5px', fontWeight: 700, color: b.ok ? '#16D98A' : '#FFB55C', background: b.ok ? 'rgba(22,217,138,0.12)' : 'rgba(255,181,92,0.12)', border: `1px solid ${b.ok ? 'rgba(22,217,138,0.25)' : 'rgba(255,181,92,0.25)'}` }}>
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="resp-grid-2-even" style={{ gap: '16px', marginBottom: '20px' }}>

        {/* Mining unlock card */}
        <div style={{ borderRadius: '24px', padding: '22px 24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: miningLocked ? 'rgba(255,181,92,0.14)' : 'rgba(22,217,138,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={miningLocked ? 'lock' : 'bolt'} size={20} color={miningLocked ? '#FFB55C' : '#16D98A'} />
            </div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '16px' }}>Rewards mining</div>
              <div style={{ fontSize: '12px', color: '#8A8699' }}>{miningLocked ? 'Locked' : 'Active'}</div>
            </div>
          </div>

          {loading ? (
            <><Skeleton h={14} w="80%" /><div style={{ marginTop: '8px' }}><Skeleton h={10} w="60%" r={5} /></div></>
          ) : (
            <>
              <div style={{ fontSize: '13px', color: '#A39FB5', marginBottom: '8px' }}>
                {miningLocked
                  ? `Deposit £${(miningThreshold - balanceUsd).toFixed(2)} more to unlock Etheon Rewards Mining.`
                  : 'Your mining rewards are accumulating automatically.'}
              </div>
              <ProgressBar pct={miningPct} color={miningLocked ? '#FFB55C' : '#16D98A'} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#7E7A8F', marginTop: '6px' }}>
                <span>£{balanceUsd.toFixed(2)}</span>
                <span>£{miningThreshold} goal</span>
              </div>
              {miningLocked && (
                <Link href={depositHref} style={{ textDecoration: 'none', display: 'block', marginTop: '14px' }}>
                  <RippleButton variant="ghost" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontSize: '13.5px', fontWeight: 700, color: '#C9BBFF', padding: '11px', borderRadius: '12px' }}>
                    <Icon name="add" size={17} color="#C9BBFF" />Add funds
                  </RippleButton>
                </Link>
              )}
            </>
          )}
        </div>

        {/* Withdrawal unlock card */}
        <div style={{ borderRadius: '24px', padding: '22px 24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: withdrawalLocked ? 'rgba(255,107,138,0.14)' : 'rgba(22,217,138,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={withdrawalLocked ? 'lock' : 'north_east'} size={20} color={withdrawalLocked ? '#FF6B8A' : '#16D98A'} />
            </div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '16px' }}>ETH withdrawals</div>
              <div style={{ fontSize: '12px', color: '#8A8699' }}>{withdrawalLocked ? 'Locked' : 'Available'}</div>
            </div>
          </div>

          {loading ? (
            <><Skeleton h={14} w="80%" /><div style={{ marginTop: '8px' }}><Skeleton h={10} w="60%" r={5} /></div></>
          ) : (
            <>
              <div style={{ fontSize: '13px', color: '#A39FB5', marginBottom: '8px' }}>
                {withdrawalLocked
                  ? `You are £${(withdrawalThreshold - balanceUsd).toFixed(2)} away from unlocking withdrawals.`
                  : 'Your withdrawals are available. Head to the withdrawals page to cash out.'}
              </div>
              <ProgressBar pct={withdrawalPct} color={withdrawalLocked ? '#FF6B8A' : '#16D98A'} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#7E7A8F', marginTop: '6px' }}>
                <span>£{balanceUsd.toFixed(2)}</span>
                <span>£{withdrawalThreshold.toLocaleString()} goal</span>
              </div>
              <div style={{ marginTop: '14px' }}>
                {withdrawalLocked ? (
                  <Link href={depositHref} style={{ textDecoration: 'none', display: 'block' }}>
                    <RippleButton variant="ghost" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontSize: '13.5px', fontWeight: 700, color: '#C9BBFF', padding: '11px', borderRadius: '12px' }}>
                      <Icon name="add" size={17} color="#C9BBFF" />Add funds
                    </RippleButton>
                  </Link>
                ) : (
                  <Link href="/withdrawals" style={{ textDecoration: 'none', display: 'block' }}>
                    <RippleButton variant="purple" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontSize: '13.5px', fontWeight: 700, color: '#fff', padding: '11px', borderRadius: '12px', background: '#7C5CFF', boxShadow: '0 6px 18px rgba(124,92,255,0.35)' }}>
                      <Icon name="north_east" size={17} color="#fff" />Request withdrawal
                    </RippleButton>
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Subscription card */}
      {!loading && !hasSub && (
        <div style={{ borderRadius: '24px', padding: '20px 24px', background: 'rgba(255,181,92,0.07)', border: '1px solid rgba(255,181,92,0.22)', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '13px', background: 'rgba(255,181,92,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="workspace_premium" size={22} color="#FFB55C" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '15px', color: '#FFB55C' }}>No active subscription</div>
            <div style={{ fontSize: '13px', color: '#A39FB5', marginTop: '2px' }}>An active subscription is required to access Etheon Rewards Mining.</div>
          </div>
          <Link href="/settings" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <RippleButton variant="ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '40px', padding: '0 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, color: '#FFB55C' }}>
              <Icon name="open_in_new" size={16} color="#FFB55C" />View plans
            </RippleButton>
          </Link>
        </div>
      )}

      {/* Verification checklist */}
      {(loading || checks.length > 0) && (
        <div style={{ borderRadius: '24px', padding: '22px 24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '17px' }}>Account verification</div>
            {!loading && <span style={{ fontSize: '13px', fontWeight: 700, color: '#C9BBFF' }}>{completedChecks}/{totalChecks} complete</span>}
          </div>
          <div style={{ fontSize: '13px', color: '#7E7A8F', marginBottom: '16px' }}>Complete these steps to fully activate your account.</div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1,2,3,4].map(i => <Skeleton key={i} h={36} r={10} />)}
            </div>
          ) : checks.filter(c => c.status !== 'not_required').map(c => <CheckRow key={c.key} check={c} />)}
        </div>
      )}

      {/* Next steps */}
      {!loading && (() => {
        const steps: { icon: string; text: string; href: string; cta: string }[] = [];
        if (!hasSub) steps.push({ icon: 'workspace_premium', text: 'Activate your subscription to unlock mining.', href: '/settings', cta: 'View plans' });
        if (miningLocked) steps.push({ icon: 'add_circle', text: `Deposit £${(miningThreshold - balanceUsd).toFixed(2)} more to unlock rewards mining.`, href: depositHref, cta: 'Deposit now' });
        if (withdrawalLocked && !miningLocked) steps.push({ icon: 'savings', text: `Build your balance to £${withdrawalThreshold.toLocaleString()} to unlock ETH withdrawals.`, href: depositHref, cta: 'Add funds' });
        if (!data?.profile.eth_wallet_address) steps.push({ icon: 'account_balance_wallet', text: 'Add your withdrawal wallet address in Settings.', href: '/settings', cta: 'Go to settings' });
        if (steps.length === 0) return null;
        return (
          <div style={{ borderRadius: '24px', padding: '22px 24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '17px', marginBottom: '4px' }}>Your next steps</div>
            <div style={{ fontSize: '13px', color: '#7E7A8F', marginBottom: '16px' }}>Complete these to get the most from your Etheon account.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '14px 16px', borderRadius: '15px', background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.18)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'rgba(124,92,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={step.icon} size={20} color="#9b7bff" />
                  </div>
                  <div style={{ flex: 1, fontSize: '13.5px', color: '#C5C1D6', lineHeight: 1.45 }}>{step.text}</div>
                  <Link href={step.href} style={{ textDecoration: 'none', flexShrink: 0 }}>
                    <RippleButton variant="ghost" style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '36px', padding: '0 13px', borderRadius: '999px', fontSize: '12.5px', fontWeight: 700, color: '#C9BBFF' }}>
                      {step.cta}<Icon name="chevron_right" size={15} color="#C9BBFF" />
                    </RippleButton>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
