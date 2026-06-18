'use client';
import Link from 'next/link';
import { AppProvider } from '../../(app)/AppContext';
import { useContent } from '../../../hooks/useContent';
import Icon from '../../../components/Icon';

export default function DepositCancelPage() {
  return <AppProvider><DepositCancelInner /></AppProvider>;
}

function DepositCancelInner() {
  const { get } = useContent(['payment']);

  const message = get(
    'payment',
    'payment_cancel_message',
    'Your payment was not completed and no charge was made. You can return to the deposit page and try again whenever you are ready.'
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', color: '#F4F3FA', fontFamily: "'Manrope', system-ui, sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        {/* Icon */}
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255,100,100,0.1)', border: '2px solid rgba(255,100,100,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Icon name="cancel" size={36} color="#FF6464" />
        </div>

        <h1 style={{ margin: '0 0 12px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '28px', letterSpacing: '-0.02em' }}>
          Payment not completed
        </h1>

        <p style={{ margin: '0 0 28px', fontSize: '15px', color: '#8A8699', lineHeight: 1.65 }}>
          {message}
        </p>

        {/* No-charge notice */}
        <div style={{ padding: '14px 18px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '28px', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <Icon name="shield" size={16} color="#A39FB5" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', color: '#8A8699', lineHeight: 1.6 }}>
              No charge was made to your payment method. Your Etheon balance has not changed.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link
            href="/deposit"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg,#7C5CFF,#6e8bff)', fontSize: '15px', fontWeight: 700, color: '#fff', textDecoration: 'none', boxShadow: '0 4px 18px rgba(124,92,255,0.35)' }}
          >
            <Icon name="add" size={18} color="#fff" />
            Try again
          </Link>
          <Link
            href="/dashboard"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '44px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px', fontWeight: 600, color: '#C9BBFF', textDecoration: 'none' }}
          >
            <Icon name="dashboard" size={16} color="#C9BBFF" />
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
