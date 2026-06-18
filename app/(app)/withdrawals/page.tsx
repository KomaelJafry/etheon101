'use client';
import { useState } from 'react';
import { useApp } from '../AppContext';

function Skeleton({ h = 20, w = '100%' }: { h?: number; w?: string }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: 8 }} />;
}
import Icon from '../../../components/Icon';
import RippleButton from '../../../components/RippleButton';
import { useContent } from '../../../hooks/useContent';
import UnlockProgressCard from '../../../components/UnlockProgressCard';

const MIN_WITHDRAWAL = 0.01;
const NETWORK_FEE = 0.0005;

export default function WithdrawalsPage() {
  const { profile, loading, ethPrice } = useApp();
  const { get } = useContent(['withdrawal', 'mining']);
  const available = profile?.eth_balance ?? 0;

  const withdrawThreshold = parseFloat(get('mining', 'withdrawal_unlock_balance_usd', '1000')) || 1000;
  const depositHref = get('mining', 'deposit_cta_href', '/deposit');
  const balanceUsd = available * ethPrice;
  const withdrawalLocked = balanceUsd < withdrawThreshold;

  const [amount, setAmount] = useState('0.25');
  const [network, setNetwork] = useState('ERC-20');

  const walletAddress = profile?.eth_wallet_address || '';
  const shortAddress = walletAddress.length > 12
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-6)}`
    : walletAddress || 'No wallet address set';
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const amt = parseFloat(amount) || 0;
  const fee = NETWORK_FEE;
  const receive = Math.max(0, amt - fee);
  const threshPct = Math.min(100, (available / MIN_WITHDRAWAL) * 100);
  const btnActive = !withdrawalLocked && amt > fee && amt <= available && !!walletAddress;

  async function handleSubmit() {
    if (!btnActive) return;
    setSubmitting(true);
    setResult(null);
    const res = await fetch('/api/user/withdrawal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount_eth: amt, wallet_address: walletAddress }),
    });
    const json = await res.json();
    if (res.ok) {
      setResult({ type: 'success', text: 'Withdrawal submitted. Your ETH will arrive within 24-48 hours.' });
      setAmount('0.00');
    } else {
      setResult({ type: 'error', text: json.error || 'Something went wrong. Please try again.' });
    }
    setSubmitting(false);
  }


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1140px' }}>

      {/* Withdrawal lock notice */}
      {withdrawalLocked && (
        <UnlockProgressCard
          title={get('mining','withdrawal_unlock_title','Withdrawals unlock at £1,000')}
          body={get('mining','withdrawal_unlock_body',`Build your balance to £${withdrawThreshold.toLocaleString()} to unlock ETH withdrawals. Your rewards are safely accumulating.`)}
          currentUsd={balanceUsd}
          targetUsd={withdrawThreshold}
          ctaLabel="Add funds"
          ctaHref={depositHref}
          accentColor="#16D98A"
        />
      )}

      <div className="resp-grid-2-even" style={{ alignItems: 'start', minWidth: 0 }}>

      {/* FORM */}
      <div style={{ borderRadius: '26px', padding: '26px 28px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)', minWidth: 0, overflow: 'hidden' }}>
        <div className="sg" style={{ fontWeight: 600, fontSize: '18px' }}>Withdraw ETH</div>
        <div style={{ fontSize: '13px', color: '#8A8699', marginTop: '3px', marginBottom: '22px' }}>{get('withdrawal','withdrawal_instructions','Cash out your earned Ethereum to any wallet.')}</div>

        {/* Withdrawal locked banner */}
        {withdrawalLocked && (
          <div style={{ padding: '12px 15px', borderRadius: '14px', marginBottom: '18px', background: 'rgba(255,181,92,0.1)', border: '1px solid rgba(255,181,92,0.3)', fontSize: '13px', color: '#FFB55C', display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
            <Icon name="lock" size={16} color="#FFB55C" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{get('mining','withdrawal_locked_text',`Withdrawals unlock when your total balance reaches £${withdrawThreshold.toLocaleString()}. Your current balance is £${balanceUsd.toFixed(2)}.`)}</span>
          </div>
        )}

        {result && (
          <div style={{ padding: '12px 16px', borderRadius: '14px', marginBottom: '18px', background: result.type === 'success' ? 'rgba(22,217,138,0.1)' : 'rgba(255,107,138,0.12)', border: `1px solid ${result.type === 'success' ? 'rgba(22,217,138,0.3)' : 'rgba(255,107,138,0.3)'}`, fontSize: '13.5px', color: result.type === 'success' ? '#16D98A' : '#FF6B8A' }}>
            {result.text}
          </div>
        )}

        {/* Amount input */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '8px' }}>
          <span style={{ color: '#A39FB5', fontWeight: 600 }}>Amount</span>
          <span style={{ color: '#8A8699' }}>Available {loading ? <Skeleton h={14} w="90px" /> : <span className="sg" style={{ color: '#E9E7F2', fontWeight: 600 }}>{available.toFixed(6)} ETH</span>}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '12px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'linear-gradient(135deg,#6e8bff,#9b7bff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="diamond" size={17} color="#0B0A14" />
          </div>
          <input
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: '#F4F3FA', fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '24px', letterSpacing: '-0.01em' }}
          />
          <span style={{ fontSize: '14px', color: '#8A8699', fontWeight: 600 }}>ETH</span>
        </div>

        {/* Presets */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '22px' }}>
          {[['0.25', (available * 0.25).toFixed(6)], ['50%', (available * 0.5).toFixed(6)], ['Max', available.toFixed(6)]].map(([label, val]) => (
            <RippleButton key={label} variant="ghost" className="preset-btn" onClick={() => setAmount(val!)} style={{ flex: 1, padding: '9px', borderRadius: '11px', fontSize: '12.5px', color: '#A39FB5' }}>
              {label}
            </RippleButton>
          ))}
        </div>

        {/* Address */}
        <div style={{ fontSize: '12.5px', color: '#A39FB5', fontWeight: 600, marginBottom: '8px' }}>Destination address</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '14px' }}>
          <Icon name="account_balance_wallet" size={19} color="#7E7A8F" style={{ flexShrink: 0 }} />
          <span className="sg" style={{ flex: 1, fontSize: '14px', color: walletAddress ? '#C5C1D6' : '#6F6B82' }}>{shortAddress}</span>
          {walletAddress && <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#16D98A', background: 'rgba(22,217,138,0.14)', padding: '4px 9px', borderRadius: '999px' }}>Verified</span>}
          {!walletAddress && <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#FFB55C', background: 'rgba(255,181,92,0.14)', padding: '4px 9px', borderRadius: '999px' }}>Set in Settings</span>}
        </div>

        {/* Network selector */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '22px' }}>
          {['ERC-20', 'Arbitrum', 'Base'].map(n => (
            <RippleButton key={n} variant="none" onClick={() => setNetwork(n)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '11px', borderRadius: '13px', fontWeight: network === n ? 700 : 600, fontSize: '13px', background: network === n ? 'rgba(124,92,255,0.14)' : 'rgba(255,255,255,0.03)', border: `1px solid ${network === n ? 'rgba(124,92,255,0.28)' : 'rgba(255,255,255,0.08)'}`, color: network === n ? '#C9BBFF' : '#A39FB5' }}>
              {n}
            </RippleButton>
          ))}
        </div>

        <RippleButton variant="purple" onClick={handleSubmit} disabled={!btnActive || submitting} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', fontSize: '15px', color: '#fff', padding: '15px', borderRadius: '15px', background: btnActive && !submitting ? '#7C5CFF' : 'rgba(124,92,255,0.35)', boxShadow: btnActive && !submitting ? '0 8px 22px rgba(124,92,255,0.32)' : 'none', cursor: btnActive && !submitting ? 'pointer' : 'not-allowed' }}>
          <Icon name="north_east" size={20} color="#fff" />
          {submitting ? 'Processing…' : `Withdraw ${amt > 0 ? amt : '0'} ETH`}
        </RippleButton>
      </div>

      {/* SUMMARY */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>

        {/* Summary card */}
        <div style={{ borderRadius: '26px', padding: '22px 24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="sg" style={{ fontWeight: 600, fontSize: '16px', marginBottom: '16px' }}>Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '13px', fontSize: '13.5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8A8699' }}>Withdrawal</span>
              <span className="sg" style={{ fontWeight: 600 }}>{amt.toFixed(6)} ETH</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8A8699' }}>Network fee</span>
              <span className="sg" style={{ fontWeight: 600 }}>{fee.toFixed(4)} ETH</span>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '2px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#A39FB5', fontWeight: 700 }}>You receive</span>
              <span className="sg" style={{ fontWeight: 600, fontSize: '18px', color: '#16D98A' }}>{receive.toFixed(6)} ETH</span>
            </div>
          </div>
        </div>

        {/* Threshold card */}
        <div style={{ borderRadius: '26px', padding: '22px 24px', background: 'linear-gradient(150deg,rgba(124,92,255,0.16),rgba(255,255,255,0.02))', border: '1px solid rgba(124,92,255,0.22)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '12px' }}>
            <Icon name="verified_user" size={20} color="#C9BBFF" />
            <span className="sg" style={{ fontWeight: 600, fontSize: '15px' }}>Withdrawal threshold</span>
          </div>
          <div style={{ fontSize: '12.5px', color: '#B9B4CC', lineHeight: 1.5, marginBottom: '14px' }}>
            Minimum withdrawal is <span style={{ color: '#fff', fontWeight: 700 }}>{MIN_WITHDRAWAL} ETH</span>. {available >= MIN_WITHDRAWAL ? "You're above the threshold." : 'Keep mining to reach the minimum.'}
          </div>
          <div style={{ height: '7px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg,#9b7bff,#6e8bff)', width: `${Math.min(100, threshPct)}%` }} />
          </div>
        </div>

        {/* Recent withdrawals — populated from real transaction history on /transactions */}
        <div style={{ borderRadius: '26px', padding: '22px 24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="sg" style={{ fontWeight: 600, fontSize: '16px', marginBottom: '14px' }}>Recent withdrawals</div>
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#6F6B82', fontSize: '13px' }}>
            <Icon name="north_east" size={28} color="#3A374F" style={{ marginBottom: '8px' }} />
            <div>No withdrawals yet</div>
            <div style={{ fontSize: '12px', marginTop: '4px', color: '#4A4760' }}>Completed withdrawals will appear here.</div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
