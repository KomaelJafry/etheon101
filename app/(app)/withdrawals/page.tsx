'use client';
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../AppContext';

function Skeleton({ h = 20, w = '100%' }: { h?: number; w?: string }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: 8 }} />;
}
import Icon from '../../../components/Icon';
import RippleButton from '../../../components/RippleButton';
import Link from 'next/link';
import { useContent } from '../../../hooks/useContent';
import UnlockProgressCard from '../../../components/UnlockProgressCard';

interface WithdrawalTxn {
  id: string;
  amount_eth: number;
  status: string;
  description: string | null;
  created_at: string;
}

const WD_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending review', color: '#FFB55C', bg: 'rgba(255,181,92,0.14)' },
  approved:  { label: 'Approved',       color: '#6E8BFF', bg: 'rgba(110,139,255,0.14)' },
  completed: { label: 'Paid',           color: '#16D98A', bg: 'rgba(22,217,138,0.14)' },
  failed:    { label: 'Rejected',       color: '#FF6B8A', bg: 'rgba(255,107,138,0.14)' },
};

const MIN_WITHDRAWAL = 0.01;
const NETWORK_FEE = 0.0005;

export default function WithdrawalsPage() {
  const { profile, loading, ethPrice } = useApp();
  const { get } = useContent(['withdrawal', 'mining']);
  const available = profile?.eth_balance ?? 0;

  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalTxn[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!profile) return;
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/user/transactions?type=withdrawal&limit=10');
      if (res.ok) {
        const json = await res.json();
        setWithdrawalHistory(json.transactions ?? []);
      }
    } finally {
      setHistoryLoading(false);
    }
  }, [profile]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const withdrawThreshold = parseFloat(get('mining', 'withdrawal_unlock_balance_usd', '1000')) || 1000;
  const depositHref = get('mining', 'deposit_cta_href', '/deposit');
  const balanceUsd = available * ethPrice + (profile?.gbp_balance ?? 0);

  // Admin withdrawal override takes precedence over normal threshold rules
  const withdrawOverride = profile?.admin_withdrawal_override ?? null;
  const withdrawalUnderReview = withdrawOverride === 'under_review';
  const withdrawalLocked =
    withdrawOverride === 'locked'    ? true  :
    withdrawOverride === 'unlocked'  ? false :
    withdrawalUnderReview            ? true  :
    balanceUsd < withdrawThreshold;

  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState('ERC-20');

  const walletAddress = profile?.eth_wallet_address || '';
  const shortAddress = walletAddress.length > 12
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-6)}`
    : walletAddress || 'No wallet address set';
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showLockedModal, setShowLockedModal] = useState(false);

  const amt = parseFloat(amount) || 0;
  const fee = NETWORK_FEE;
  const receive = Math.max(0, amt - fee);
  const threshPct = Math.min(100, (available / MIN_WITHDRAWAL) * 100);
  const btnActive = !withdrawalLocked && !withdrawalUnderReview && amt > fee && amt <= available && !!walletAddress;

  async function handleSubmit() {
    // If locked, show modal instead of submitting
    if (withdrawalLocked || withdrawalUnderReview) {
      setShowLockedModal(true);
      return;
    }
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
      setResult({ type: 'success', text: 'Withdrawal submitted for admin review. You will be notified when it is processed.' });
      setAmount('0.00');
      loadHistory();
    } else {
      setResult({ type: 'error', text: json.error || 'Something went wrong. Please try again.' });
    }
    setSubmitting(false);
  }


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1140px' }}>

      {/* Admin withdrawal override banners */}
      {withdrawalUnderReview && (
        <div style={{ padding: '14px 18px', borderRadius: '16px', background: 'rgba(255,181,92,0.08)', border: '1px solid rgba(255,181,92,0.3)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <Icon name="hourglass_empty" size={20} color="#FFB55C" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#FFB55C', marginBottom: '3px' }}>Withdrawal access is under review</div>
            <div style={{ fontSize: '13px', color: '#C5A55C', lineHeight: 1.5 }}>Your withdrawal access is currently under review. Please contact support if you have any questions.</div>
          </div>
        </div>
      )}

      {withdrawOverride === 'locked' && (
        <div style={{ padding: '14px 18px', borderRadius: '16px', background: 'rgba(255,107,138,0.08)', border: '1px solid rgba(255,107,138,0.3)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <Icon name="lock" size={20} color="#FF6B8A" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#FF6B8A', marginBottom: '3px' }}>Withdrawals are locked</div>
            <div style={{ fontSize: '13px', color: '#C5768A', lineHeight: 1.5 }}>Your withdrawal access has been restricted. Please contact support for assistance.</div>
          </div>
        </div>
      )}

      {/* Withdrawal lock notice (threshold-based, only shown when no override) */}
      {withdrawalLocked && !withdrawOverride && (
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

        <RippleButton
          variant="purple"
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
            fontSize: '15px', color: '#fff', padding: '15px', borderRadius: '15px',
            background: submitting ? 'rgba(124,92,255,0.5)' : withdrawalLocked || withdrawalUnderReview ? 'rgba(124,92,255,0.35)' : '#7C5CFF',
            boxShadow: (!withdrawalLocked && !withdrawalUnderReview && !submitting) ? '0 8px 22px rgba(124,92,255,0.32)' : 'none',
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? (
            <>
              <span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              Processing…
            </>
          ) : withdrawalLocked || withdrawalUnderReview ? (
            <><Icon name="lock" size={18} color="rgba(255,255,255,0.6)" />Withdrawals locked</>
          ) : (
            <><Icon name="north_east" size={20} color="#fff" />Withdraw {amt > 0 ? amt : '0'} ETH</>
          )}
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

        {/* Recent withdrawals */}
        <div style={{ borderRadius: '26px', padding: '22px 24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div className="sg" style={{ fontWeight: 600, fontSize: '16px' }}>Recent withdrawals</div>
            <Link href="/transactions" style={{ fontSize: '12px', color: '#9b7bff', fontWeight: 700, textDecoration: 'none' }}>View all →</Link>
          </div>
          {historyLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1,2].map(i => <Skeleton key={i} h={48} />)}
            </div>
          ) : withdrawalHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#6F6B82', fontSize: '13px' }}>
              <Icon name="north_east" size={28} color="#3A374F" style={{ marginBottom: '8px' }} />
              <div>No withdrawals yet</div>
              <div style={{ fontSize: '12px', marginTop: '4px', color: '#4A4760' }}>Submitted withdrawals will appear here.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {withdrawalHistory.map(w => {
                const s = WD_STATUS[w.status] ?? { label: w.status, color: '#8A8699', bg: 'rgba(255,255,255,0.07)' };
                const date = new Date(w.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                return (
                  <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: 'rgba(255,107,138,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="north_east" size={19} color="#FF6B8A" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{Math.abs(w.amount_eth).toFixed(6)} ETH</div>
                      <div style={{ fontSize: '11.5px', color: '#7E7A8F', marginTop: '2px' }}>{date}</div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: s.color, background: s.bg, padding: '4px 10px', borderRadius: '999px', whiteSpace: 'nowrap' }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Withdrawal locked modal */}
      {showLockedModal && (
        <div
          onClick={() => setShowLockedModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'linear-gradient(165deg,#1a1730,#0d0c1c)', border: '1px solid rgba(124,92,255,0.3)', borderRadius: '24px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(124,92,255,0.12)' }}
          >
            {/* Icon */}
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: withdrawOverride === 'locked' ? 'rgba(255,107,138,0.12)' : withdrawalUnderReview ? 'rgba(255,181,92,0.12)' : 'rgba(124,92,255,0.12)', border: `1px solid ${withdrawOverride === 'locked' ? 'rgba(255,107,138,0.3)' : withdrawalUnderReview ? 'rgba(255,181,92,0.3)' : 'rgba(124,92,255,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Icon name={withdrawalUnderReview ? 'hourglass_empty' : 'lock'} size={26} color={withdrawOverride === 'locked' ? '#FF6B8A' : withdrawalUnderReview ? '#FFB55C' : '#C9BBFF'} />
            </div>

            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '20px', marginBottom: '10px' }}>
              {withdrawOverride === 'locked'
                ? 'Withdrawals are locked'
                : withdrawalUnderReview
                ? 'Withdrawal access under review'
                : 'Withdrawals not yet unlocked'}
            </div>

            <div style={{ fontSize: '14px', color: '#A39FB5', lineHeight: 1.6, marginBottom: '24px' }}>
              {withdrawOverride === 'locked'
                ? 'Your withdrawal access has been restricted by the platform. Please contact support for assistance.'
                : withdrawalUnderReview
                ? 'Your withdrawal access is currently under review. Please contact support if you have any questions.'
                : `Withdrawals unlock when your total balance reaches £${withdrawThreshold.toLocaleString()}.`}
            </div>

            {/* Progress (threshold only, not override) */}
            {!withdrawOverride && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '8px', fontWeight: 600 }}>
                  <span style={{ color: '#A39FB5' }}>Current balance</span>
                  <span style={{ color: '#C9BBFF' }}>£{balanceUsd.toFixed(2)}</span>
                </div>
                <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg,#9b7bff,#6e8bff)', width: `${Math.min(100, (balanceUsd / withdrawThreshold) * 100)}%`, transition: 'width .4s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6F6B82' }}>
                  <span>£{balanceUsd.toFixed(2)}</span>
                  <span style={{ color: '#FFB55C', fontWeight: 700 }}>£{Math.max(0, withdrawThreshold - balanceUsd).toFixed(2)} remaining</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              {!withdrawOverride && (
                <Link href="/deposit" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '13px', borderRadius: '14px', background: '#7C5CFF', color: '#fff', fontWeight: 700, fontSize: '14px', textDecoration: 'none', boxShadow: '0 6px 18px rgba(124,92,255,0.35)' }}>
                  <Icon name="add_circle" size={17} color="#fff" />Add funds
                </Link>
              )}
              <button
                onClick={() => setShowLockedModal(false)}
                style={{ flex: 1, padding: '13px', borderRadius: '14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#C5C1D6', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
