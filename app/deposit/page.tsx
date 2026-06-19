'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { QRCodeSVG } from 'qrcode.react';
import { AppProvider, useApp } from '../(app)/AppContext';
import { useContent } from '../../hooks/useContent';
import UnlockProgressCard from '../../components/UnlockProgressCard';
import Icon from '../../components/Icon';
import { EtheonCrystal } from '@/components/EtheonBrand';

const PRESETS = [20, 50, 100, 250, 500];

export default function DepositPage() {
  return <AppProvider><DepositPageInner /></AppProvider>;
}

function DepositPageInner() {
  const { profile, ethPrice } = useApp();
  const { get } = useContent(['payment', 'wallet', 'mining']);

  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [qrTarget, setQrTarget] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [pageOrigin] = useState(() => typeof window !== 'undefined' ? window.location.origin : '');

  // Stripe custom-amount state
  const [amountInput, setAmountInput] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Subscribe card state
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);

  async function handleSubscribe() {
    if (!profile) { window.location.href = '/login?next=/deposit'; return; }
    setSubLoading(true);
    setSubError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing_period: 'monthly' }),
      });
      const json = await res.json().catch(() => ({})) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setSubError(res.status === 401 ? 'Please log in again to continue.' : (json.error ?? 'Unable to start checkout. Please try again.'));
        return;
      }
      window.location.href = json.url;
    } catch {
      setSubError('Network error. Please try again.');
    } finally {
      setSubLoading(false);
    }
  }

  useEffect(() => { document.title = 'Deposit Funds | Etheon'; }, []);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    (async () => {
      const { data } = await supabase
        .from('ui_content')
        .select('element_key,value')
        .eq('page', 'wallet')
        .in('element_key', ['deposit_address', 'deposit_qr_target', 'deposit_qr_image_url']);
      if (data) {
        const m: Record<string, string> = {};
        data.forEach(r => { m[r.element_key] = r.value; });
        setDepositAddress(m['deposit_address'] ?? null);
        setQrTarget(m['deposit_qr_target'] ?? null);
        setQrImageUrl(m['deposit_qr_image_url'] ?? null);
      }
      setContentLoading(false);
    })();
  }, []);

  function selectPreset(gbp: number) {
    setSelectedPreset(gbp);
    setAmountInput(String(gbp));
    setCheckoutError(null);
  }

  function handleAmountChange(val: string) {
    setAmountInput(val);
    const n = parseFloat(val);
    setSelectedPreset(PRESETS.includes(n) ? n : null);
    setCheckoutError(null);
  }

  async function startCheckout() {
    if (!profile) {
      window.location.href = '/login?next=/deposit';
      return;
    }
    const amountGbp = parseFloat(amountInput);
    if (!amountInput || !Number.isFinite(amountGbp)) {
      setCheckoutError('Enter a deposit amount.');
      return;
    }
    if (amountGbp < 10 || amountGbp > 10000) {
      setCheckoutError('Amount must be between £10 and £10,000.');
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/stripe/deposit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_gbp: amountGbp }),
      });
      const json = await res.json().catch(() => ({})) as { error?: string; url?: string };
      if (!res.ok) {
        if (res.status === 401) {
          setCheckoutError('Please log in again to continue.');
        } else if (res.status === 400) {
          setCheckoutError(json.error ?? 'Invalid amount. Please check and try again.');
        } else {
          setCheckoutError(json.error ?? 'Unable to start payment. Please try again.');
        }
        setCheckoutLoading(false);
        return;
      }
      if (!json.url) {
        setCheckoutError('Unable to start payment. Please try again.');
        setCheckoutLoading(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setCheckoutError('Network error. Please check your connection and try again.');
      setCheckoutLoading(false);
    }
  }

  const copyTarget  = depositAddress || null;
  const shortAddr   = copyTarget && copyTarget.length > 16
    ? `${copyTarget.slice(0, 8)}…${copyTarget.slice(-8)}`
    : copyTarget;

  const depositPageUrl = pageOrigin ? `${pageOrigin}/deposit` : 'https://etheon.site/deposit';
  const qrDisplayValue = qrTarget || depositPageUrl;

  function copyAddress() {
    if (!copyTarget) return;
    navigator.clipboard.writeText(copyTarget).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  // Historical column names use "usd" but values are managed as GBP going forward
  const balanceGbp        = (profile?.eth_balance ?? 0) * ethPrice;
  const miningThreshold   = parseFloat(get('mining', 'mining_minimum_start_balance_usd', '100')) || 100;
  const withdrawThreshold = parseFloat(get('mining', 'withdrawal_unlock_balance_usd', '1000')) || 1000;
  const isSubscribed      = profile?.is_active ?? false;
  const miningUnlocked    = isSubscribed && balanceGbp >= miningThreshold;
  const withdrawalUnlocked = balanceGbp >= withdrawThreshold;

  const pageTitle    = get('payment', 'payment_options_title',    'Add funds to your account');
  const pageSubtitle = get('payment', 'payment_options_subtitle', 'Enter any amount and pay securely with Stripe. Your balance will be reviewed and credited by an admin.');

  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', color: '#F4F3FA', fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <div style={{ position: 'fixed', top: '-200px', left: '10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,92,255,0.25),transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-100px', right: '5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(22,217,138,0.12),transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Nav */}
      <nav style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1000px', margin: '0 auto', padding: '22px 28px' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg,#9b7bff,#6e8bff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EtheonCrystal size={18} />
          </div>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '18px', letterSpacing: '-0.02em' }}>Etheon</span>
        </Link>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/wallet" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, color: '#C9BBFF', background: 'rgba(124,92,255,0.12)', border: '1px solid rgba(124,92,255,0.22)', textDecoration: 'none' }}>
            <Icon name="account_balance_wallet" size={15} color="#C9BBFF" />Wallet
          </Link>
          <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, color: '#E9E7F2', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none' }}>
            <Icon name="dashboard" size={15} color="#E9E7F2" />Dashboard
          </Link>
        </div>
      </nav>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto', padding: '12px 28px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 'clamp(26px,4vw,40px)', letterSpacing: '-0.03em' }}>{pageTitle}</h1>
          <p style={{ margin: '10px 0 0', fontSize: '15px', color: '#8A8699', lineHeight: 1.55 }}>{pageSubtitle}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '24px', alignItems: 'start' }}>

          {/* ── LEFT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>

            {/* ── Logged-out notice ── */}
            {!profile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', borderRadius: '16px', background: 'rgba(255,181,92,0.08)', border: '1px solid rgba(255,181,92,0.25)', fontSize: '13.5px', color: '#FFB55C', fontWeight: 600 }}>
                <Icon name="lock" size={17} color="#FFB55C" style={{ flexShrink: 0 }} />
                <span>Please <a href="/login?next=/deposit" style={{ color: '#FFB55C', textDecoration: 'underline' }}>log in</a> to make a deposit.</span>
              </div>
            )}

          {/* ── PRIMARY: Custom-amount Stripe checkout ── */}
            <div style={{ borderRadius: '26px', padding: '28px', background: 'linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(124,92,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="credit_card" size={18} color="#9b7bff" />
                </div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '18px' }}>Secure Stripe payment</div>
              </div>
              <div style={{ fontSize: '13px', color: '#8A8699', marginBottom: '22px', lineHeight: 1.55 }}>
                Payments are processed by Stripe. Your balance will be credited after admin review — typically 1–2 business days.
              </div>

              {/* Quick-pick presets */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#7E7A8F', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Quick select</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PRESETS.map(gbp => (
                    <button
                      key={gbp}
                      onClick={() => selectPreset(gbp)}
                      style={{
                        height: '40px', padding: '0 16px', borderRadius: '12px', cursor: 'pointer',
                        fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '14px',
                        background: selectedPreset === gbp ? 'rgba(124,92,255,0.22)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${selectedPreset === gbp ? 'rgba(124,92,255,0.5)' : 'rgba(255,255,255,0.09)'}`,
                        color: selectedPreset === gbp ? '#C9BBFF' : '#8A8699',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      £{gbp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount input */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#7E7A8F', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Or enter any amount</div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '18px', color: '#6F6B82', pointerEvents: 'none' }}>£</span>
                  <input
                    type="number"
                    min="10"
                    max="10000"
                    step="1"
                    value={amountInput}
                    onChange={e => handleAmountChange(e.target.value)}
                    placeholder="10 – 10,000"
                    style={{
                      width: '100%', padding: '14px 16px 14px 32px', borderRadius: '14px',
                      background: 'rgba(255,255,255,0.04)', border: `1px solid ${checkoutError ? 'rgba(255,107,138,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      color: '#F4F3FA', fontFamily: "'Space Grotesk',sans-serif", fontSize: '18px', fontWeight: 700,
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                {checkoutError && (
                  <div style={{ marginTop: '8px', fontSize: '12.5px', color: '#FF8DA3', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="error" size={14} color="#FF8DA3" />{checkoutError}
                  </div>
                )}
              </div>

              {/* CTA button */}
              <button
                onClick={startCheckout}
                disabled={checkoutLoading}
                style={{
                  width: '100%', height: '52px', borderRadius: '15px', cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                  background: checkoutLoading ? 'rgba(124,92,255,0.5)' : 'linear-gradient(135deg,#7C5CFF,#6e8bff)',
                  border: 'none', color: '#fff', fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: '15px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: checkoutLoading ? 'none' : '0 6px 20px rgba(124,92,255,0.4)',
                  transition: 'all 0.2s ease',
                }}
              >
                {checkoutLoading
                  ? <><Icon name="hourglass_empty" size={18} color="#fff" />Opening Stripe…</>
                  : <><Icon name="lock" size={18} color="#fff" />Continue to payment{amountInput && parseFloat(amountInput) >= 10 ? ` — £${parseFloat(amountInput).toFixed(2)}` : ''}</>
                }
              </button>

              {/* Notice */}
              <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '13px', background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.16)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <Icon name="info" size={16} color="#9b7bff" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ fontSize: '12.5px', color: '#A39FB5', lineHeight: 1.55 }}>
                  Your balance will only be updated after your payment is verified and reviewed by our team. You will not see an instant balance change.
                </div>
              </div>
            </div>

            {/* ── SECONDARY: QR / Manual section ── */}
            <div style={{ borderRadius: '26px', padding: '24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Icon name="qr_code_2" size={18} color="#6F6B82" />
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: '14px', color: '#8A8699' }}>Scan to open deposit page</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
                <div style={{ width: '148px', height: '148px', borderRadius: '16px', background: '#fff', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {qrImageUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={qrImageUrl} alt="Scan to deposit" style={{ width: '128px', height: '128px', objectFit: 'contain' }} />
                    : <QRCodeSVG value={qrDisplayValue} size={128} bgColor="#ffffff" fgColor="#0B0A14" level="M" />
                  }
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '12px', color: '#6F6B82', lineHeight: 1.5, marginBottom: contentLoading ? 0 : (copyTarget ? '14px' : 0) }}>
                Scan to open this page on another device
              </div>

              {!contentLoading && copyTarget && (
                <>
                  <div style={{ margin: '14px 0 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                    <span style={{ fontSize: '11px', color: '#4A4763', fontWeight: 600 }}>MANUAL TRANSFER</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#6F6B82', lineHeight: 1.55, marginBottom: '10px' }}>
                    {get('wallet', 'deposit_instructions', 'Manual payment instructions may be provided by support when available.')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 13px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <Icon name="account_balance_wallet" size={16} color="#7E7A8F" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '12px', color: '#C5C1D6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace' }}>{shortAddr}</span>
                    <button onClick={copyAddress} style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '30px', padding: '0 11px', borderRadius: '9px', background: copied ? 'rgba(22,217,138,0.15)' : 'rgba(124,92,255,0.15)', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: copied ? '#16D98A' : '#C9BBFF' }}>
                      <Icon name={copied ? 'check' : 'content_copy'} size={13} color={copied ? '#16D98A' : '#C9BBFF'} />
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  {get('wallet', 'deposit_warning', '') && (
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'flex-start', gap: '7px', padding: '9px 12px', borderRadius: '11px', background: 'rgba(255,181,92,0.07)', border: '1px solid rgba(255,181,92,0.18)', fontSize: '12px', color: '#FFB55C' }}>
                      <Icon name="info" size={14} color="#FFB55C" style={{ flexShrink: 0, marginTop: '1px' }} />
                      {get('wallet', 'deposit_warning', '')}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN — balance + progress ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>

            {/* Balance snapshot */}
            <div style={{ borderRadius: '26px', padding: '22px 24px', background: 'linear-gradient(160deg,rgba(124,92,255,0.14),rgba(255,255,255,0.02))', border: '1px solid rgba(124,92,255,0.2)' }}>
              <div style={{ fontSize: '12.5px', color: '#A39FB5', fontWeight: 600, marginBottom: '6px' }}>Current balance</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '36px', letterSpacing: '-0.02em', lineHeight: 1 }}>
                £{balanceGbp.toFixed(2)}
              </div>
              <div style={{ fontSize: '13px', color: '#6F6B82', marginTop: '6px' }}>
                {(profile?.eth_balance ?? 0).toFixed(6)} ETH
              </div>
            </div>

            {/* Mining unlock progress */}
            <UnlockProgressCard
              title="Unlock Rewards Mining"
              body={`Reach £${miningThreshold} balance${!isSubscribed ? ' and subscribe' : ''} to activate your daily rewards session.`}
              currentUsd={balanceGbp}
              targetUsd={miningThreshold}
              ctaLabel={!isSubscribed ? 'Subscribe to unlock' : miningUnlocked ? 'Go to mining' : 'Keep adding funds'}
              ctaHref={!isSubscribed ? '#' : miningUnlocked ? '/mining' : '/deposit'}
              onCtaClick={!isSubscribed ? handleSubscribe : undefined}
              ctaLoading={!isSubscribed ? subLoading : undefined}
              ctaError={!isSubscribed ? subError : undefined}
              unlocked={miningUnlocked}
              unlockedLabel="Mining active"
            />

            {/* Withdrawal unlock progress */}
            <UnlockProgressCard
              title="Withdrawal Unlock Progress"
              body={`Your rewards are accumulating. Withdrawals unlock at £${withdrawThreshold.toLocaleString()} total balance.`}
              currentUsd={balanceGbp}
              targetUsd={withdrawThreshold}
              ctaLabel={withdrawalUnlocked ? 'Request withdrawal' : 'Continue adding funds'}
              ctaHref={withdrawalUnlocked ? '/withdrawals' : '/deposit'}
              unlocked={withdrawalUnlocked}
              unlockedLabel="Withdrawals unlocked"
              accentColor="#16D98A"
            />

            {/* Honesty notice */}
            <div style={{ padding: '16px 18px', borderRadius: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontSize: '12.5px', color: '#6F6B82', lineHeight: 1.6 }}>
              <Icon name="verified_user" size={16} color="#A39FB5" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              Funds are reviewed and credited to your balance after payment confirmation. Mining rewards are based on your plan and balance. Rewards remain pending until withdrawal requirements are met.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

