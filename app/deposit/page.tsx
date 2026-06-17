'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { QRCodeSVG } from 'qrcode.react';
import { AppProvider, useApp } from '../(app)/AppContext';
import { useContent } from '../../hooks/useContent';
import UnlockProgressCard from '../../components/UnlockProgressCard';
import Icon from '../../components/Icon';

function EtheonLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
      <polygon points="12,3 22,21 2,21" fill="white" />
    </svg>
  );
}

export default function DepositPage() {
  return <AppProvider><DepositPageInner /></AppProvider>;
}

function DepositPageInner() {
  const { profile, ethPrice } = useApp();
  const { get } = useContent(['wallet', 'mining']);

  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [qrTarget, setQrTarget] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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
      setLoading(false);
    })();
  }, []);

  const balanceUsd = (profile?.eth_balance ?? 0) * ethPrice;
  const miningThreshold = parseFloat(get('mining', 'mining_minimum_start_balance_usd', '100')) || 100;
  const withdrawThreshold = parseFloat(get('mining', 'withdrawal_unlock_balance_usd', '1000')) || 1000;
  const isSubscribed = profile?.is_active ?? false;
  const miningUnlocked = isSubscribed && balanceUsd >= miningThreshold;
  const withdrawalUnlocked = balanceUsd >= withdrawThreshold;

  const copyTarget = depositAddress || qrTarget;
  const qrValue = qrTarget || depositAddress;
  const shortAddr = copyTarget && copyTarget.length > 16
    ? `${copyTarget.slice(0, 8)}…${copyTarget.slice(-8)}`
    : copyTarget;

  function copyAddress() {
    if (!copyTarget) return;
    navigator.clipboard.writeText(copyTarget).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', color: '#F4F3FA', fontFamily: "'Manrope', system-ui, sans-serif" }}>
      {/* Background glows */}
      <div style={{ position: 'fixed', top: '-200px', left: '10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,92,255,0.25),transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-100px', right: '5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(22,217,138,0.12),transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Nav */}
      <nav style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '960px', margin: '0 auto', padding: '22px 28px' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg,#9b7bff,#6e8bff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EtheonLogo size={18} />
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

      {/* Main */}
      <main style={{ position: 'relative', zIndex: 1, maxWidth: '960px', margin: '0 auto', padding: '12px 28px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: '36px' }}>
          <h1 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 'clamp(28px,4vw,44px)', letterSpacing: '-0.03em' }}>Deposit to Etheon</h1>
          <p style={{ margin: '10px 0 0', fontSize: '15px', color: '#8A8699', lineHeight: 1.55 }}>
            Add funds to your Etheon balance to unlock rewards mining and build toward withdrawals.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '20px', alignItems: 'start' }}>

          {/* Left: Deposit card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* QR / address card */}
            <div style={{ borderRadius: '26px', padding: '28px', background: 'linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '18px', marginBottom: '4px' }}>Deposit address</div>
              <div style={{ fontSize: '13px', color: '#8A8699', marginBottom: '22px' }}>
                {get('wallet', 'deposit_instructions', 'Send only Ethereum (ERC-20) to this address. Deposits are credited after network confirmation.')}
              </div>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '20px 0' }}>
                  <div className="skeleton" style={{ width: '160px', height: '160px', borderRadius: '16px' }} />
                  <div className="skeleton" style={{ height: '13px', width: '75%', borderRadius: '6px' }} />
                </div>
              ) : (qrValue || qrImageUrl) ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
                    <div style={{ width: '172px', height: '172px', borderRadius: '18px', background: '#fff', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {qrImageUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={qrImageUrl} alt="Deposit QR code" style={{ width: '144px', height: '144px', objectFit: 'contain' }} />
                        : <QRCodeSVG value={qrValue!} size={144} bgColor="#ffffff" fgColor="#0B0A14" level="M" />
                      }
                    </div>
                  </div>

                  {copyTarget && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 15px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '14px' }}>
                      <Icon name="account_balance_wallet" size={18} color="#7E7A8F" style={{ flexShrink: 0 }} />
                      <span className="sg" style={{ flex: 1, fontSize: '13px', color: '#C5C1D6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shortAddr}</span>
                      <button onClick={copyAddress} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '34px', padding: '0 12px', borderRadius: '10px', background: copied ? 'rgba(22,217,138,0.18)' : 'rgba(124,92,255,0.18)', border: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: 700, color: copied ? '#16D98A' : '#C9BBFF' }}>
                        <Icon name={copied ? 'check' : 'content_copy'} size={15} color={copied ? '#16D98A' : '#C9BBFF'} />
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}

                  {get('wallet', 'deposit_warning', '') && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 13px', borderRadius: '12px', background: 'rgba(255,181,92,0.08)', border: '1px solid rgba(255,181,92,0.2)', fontSize: '12.5px', color: '#FFB55C' }}>
                      <Icon name="info" size={16} color="#FFB55C" style={{ flexShrink: 0, marginTop: '1px' }} />
                      {get('wallet', 'deposit_warning', 'Send only Ethereum (ERC-20). Sending other assets may result in permanent loss.')}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(124,92,255,0.12)', border: '1px solid rgba(124,92,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <Icon name="qr_code" size={28} color="#9b7bff" />
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#C5C1D6', marginBottom: '8px' }}>Deposit instructions coming soon</div>
                  <div style={{ fontSize: '13px', color: '#6F6B82', lineHeight: 1.55 }}>Our team is finalising deposit instructions. Check back soon or contact support.</div>
                </div>
              )}
            </div>

            {/* Manual instructions section — customise later */}
            <div style={{ borderRadius: '26px', padding: '24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '12px' }}>
                <Icon name="help_outline" size={20} color="#A39FB5" />
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '15px' }}>How to deposit</span>
              </div>
              {/* ─── Replace the block below with your custom deposit instructions ─── */}
              <div style={{ fontSize: '13.5px', color: '#8A8699', lineHeight: 1.65 }}>
                {get('wallet', 'deposit_instructions', 'Scan the QR code above or copy the deposit address, then send Ethereum (ETH) from your external wallet or exchange. Deposits are credited to your Etheon balance after network confirmation.')}
              </div>
              {get('wallet', 'minimum_deposit_note', '') && (
                <div style={{ marginTop: '12px', padding: '10px 13px', borderRadius: '12px', background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.18)', fontSize: '12.5px', color: '#C9BBFF' }}>
                  {get('wallet', 'minimum_deposit_note', '')}
                </div>
              )}
            </div>
          </div>

          {/* Right: Progress */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Balance snapshot */}
            <div style={{ borderRadius: '26px', padding: '22px 24px', background: 'linear-gradient(160deg,rgba(124,92,255,0.14),rgba(255,255,255,0.02))', border: '1px solid rgba(124,92,255,0.2)' }}>
              <div style={{ fontSize: '12.5px', color: '#A39FB5', fontWeight: 600, marginBottom: '6px' }}>Current balance</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '36px', letterSpacing: '-0.02em', lineHeight: 1 }}>
                ${balanceUsd.toFixed(2)}
              </div>
              <div style={{ fontSize: '13px', color: '#6F6B82', marginTop: '6px' }}>
                {(profile?.eth_balance ?? 0).toFixed(6)} ETH
              </div>
            </div>

            {/* Mining unlock progress */}
            <UnlockProgressCard
              title="Unlock Rewards Mining"
              body={`Reach $${miningThreshold} balance${!isSubscribed ? ' and subscribe' : ''} to activate your daily rewards session.`}
              currentUsd={balanceUsd}
              targetUsd={miningThreshold}
              ctaLabel={!isSubscribed ? 'Subscribe to unlock' : miningUnlocked ? 'Go to mining' : 'Keep depositing'}
              ctaHref={!isSubscribed ? '/api/stripe/checkout' : miningUnlocked ? '/mining' : '#deposit'}
              unlocked={miningUnlocked}
              unlockedLabel="Mining active"
            />

            {/* Withdrawal unlock progress */}
            <UnlockProgressCard
              title="Withdrawal Unlock Progress"
              body={`Your rewards are accumulating. Withdrawals unlock at $${withdrawThreshold.toLocaleString()} total balance.`}
              currentUsd={balanceUsd}
              targetUsd={withdrawThreshold}
              ctaLabel={withdrawalUnlocked ? 'Request withdrawal' : 'Continue depositing'}
              ctaHref={withdrawalUnlocked ? '/withdrawals' : '#deposit'}
              unlocked={withdrawalUnlocked}
              unlockedLabel="Withdrawals unlocked"
              accentColor="#16D98A"
            />

            {/* Info notice */}
            <div style={{ padding: '16px 18px', borderRadius: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontSize: '12.5px', color: '#6F6B82', lineHeight: 1.6 }}>
              <Icon name="verified_user" size={16} color="#A39FB5" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              Deposits are manually reviewed and credited to your balance. Mining rewards are earned based on your plan and account balance. Rewards remain pending until withdrawal requirements are met.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
