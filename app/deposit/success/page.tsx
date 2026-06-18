'use client';
import Link from 'next/link';
import { AppProvider } from '../../(app)/AppContext';
import { useContent } from '../../../hooks/useContent';
import Icon from '../../../components/Icon';

export default function DepositSuccessPage() {
  return <AppProvider><DepositSuccessInner /></AppProvider>;
}

function DepositSuccessInner() {
  const { get } = useContent(['payment']);

  const message = get(
    'payment',
    'payment_success_message',
    'Your payment has been submitted to Stripe. Your Etheon balance will be updated after payment confirmation or admin review — this typically takes 1–2 business days. You will be notified once your balance has been credited.'
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', color: '#F4F3FA', fontFamily: "'Manrope', system-ui, sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        {/* Icon */}
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(22,217,138,0.12)', border: '2px solid rgba(22,217,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Icon name="check_circle" size={36} color="#16D98A" />
        </div>

        <h1 style={{ margin: '0 0 12px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '28px', letterSpacing: '-0.02em' }}>
          Payment submitted
        </h1>

        <p style={{ margin: '0 0 28px', fontSize: '15px', color: '#8A8699', lineHeight: 1.65 }}>
          {message}
        </p>

        {/* Honest notice */}
        <div style={{ padding: '14px 18px', borderRadius: '16px', background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.16)', marginBottom: '28px', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <Icon name="info" size={16} color="#9b7bff" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', color: '#A39FB5', lineHeight: 1.6 }}>
              <strong style={{ color: '#C9BBFF' }}>Balance not updated yet.</strong> Your balance will only change once payment is verified and reviewed. Do not close or refresh repeatedly — your submission is recorded.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link
            href="/dashboard"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg,#7C5CFF,#6e8bff)', fontSize: '15px', fontWeight: 700, color: '#fff', textDecoration: 'none', boxShadow: '0 4px 18px rgba(124,92,255,0.35)' }}
          >
            <Icon name="dashboard" size={18} color="#fff" />
            Go to dashboard
          </Link>
          <Link
            href="/deposit"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '44px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px', fontWeight: 600, color: '#C9BBFF', textDecoration: 'none' }}
          >
            <Icon name="add" size={16} color="#C9BBFF" />
            Add more funds
          </Link>
        </div>

      </div>
    </div>
  );
}
