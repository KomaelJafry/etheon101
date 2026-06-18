'use client';

interface UnlockProgressCardProps {
  title: string;
  body: string;
  currentUsd: number;
  targetUsd: number;
  ctaLabel: string;
  ctaHref: string;
  onCtaClick?: () => void;
  ctaLoading?: boolean;
  ctaError?: string | null;
  unlocked?: boolean;
  unlockedLabel?: string;
  accentColor?: string;
}

export default function UnlockProgressCard({
  title,
  body,
  currentUsd,
  targetUsd,
  ctaLabel,
  ctaHref,
  onCtaClick,
  ctaLoading = false,
  ctaError = null,
  unlocked = false,
  unlockedLabel = 'Unlocked',
  accentColor = '#7C5CFF',
}: UnlockProgressCardProps) {
  const pct = Math.min(100, (currentUsd / targetUsd) * 100);
  const remaining = Math.max(0, targetUsd - currentUsd);

  const fmtUsd = (n: number) =>
    n >= 1000
      ? `$${(n / 1000).toFixed(1)}k`
      : `$${n.toFixed(2)}`;

  const accentRgb = accentColor === '#16D98A' ? '22,217,138' : '124,92,255';

  return (
    <div style={{
      borderRadius: '22px',
      padding: '20px 22px',
      background: unlocked
        ? `linear-gradient(160deg,rgba(${accentRgb},0.14),rgba(255,255,255,0.02))`
        : 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))',
      border: `1px solid rgba(${accentRgb},${unlocked ? '0.3' : '0.12'})`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '14px', color: '#E9E7F2' }}>{title}</div>
        {unlocked && (
          <span style={{
            fontSize: '11.5px', fontWeight: 700,
            color: accentColor,
            background: `rgba(${accentRgb},0.14)`,
            padding: '4px 10px', borderRadius: '999px',
          }}>{unlockedLabel}</span>
        )}
      </div>

      {/* Body */}
      <div style={{ fontSize: '12.5px', color: '#8A8699', lineHeight: 1.55, marginBottom: '14px' }}>
        {unlocked ? `You're ready. ${body}` : body}
      </div>

      {/* Progress bar */}
      {!unlocked && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 600, marginBottom: '7px' }}>
            <span style={{ color: '#A39FB5' }}>{fmtUsd(currentUsd)}</span>
            <span style={{ color: '#6F6B82' }}>Goal: {fmtUsd(targetUsd)}</span>
          </div>
          <div style={{ height: '7px', borderRadius: '999px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{
              height: '100%', borderRadius: '999px',
              background: `linear-gradient(90deg,${accentColor},${accentColor === '#16D98A' ? '#6e8bff' : '#6e8bff'})`,
              width: `${pct}%`,
              transition: 'width 0.6s ease',
              boxShadow: `0 0 10px rgba(${accentRgb},0.5)`,
            }} />
          </div>
          <div style={{ fontSize: '12px', color: '#6F6B82', marginBottom: '14px' }}>
            {fmtUsd(remaining)} more to go
          </div>
        </>
      )}

      {/* CTA */}
      {onCtaClick ? (
        <>
          <button
            onClick={onCtaClick}
            disabled={ctaLoading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', padding: '11px', borderRadius: '13px',
              fontSize: '13px', fontWeight: 700,
              color: unlocked ? '#0B0A14' : '#E9E7F2',
              background: unlocked ? accentColor : `rgba(${accentRgb},0.18)`,
              border: `1px solid rgba(${accentRgb},0.3)`,
              cursor: ctaLoading ? 'not-allowed' : 'pointer',
              opacity: ctaLoading ? 0.75 : 1,
              boxShadow: unlocked ? `0 6px 18px rgba(${accentRgb},0.35)` : 'none',
              transition: 'opacity 0.15s',
            }}
            onMouseOver={e => { if (!ctaLoading) e.currentTarget.style.opacity = '0.88'; }}
            onMouseOut={e => (e.currentTarget.style.opacity = ctaLoading ? '0.75' : '1')}
          >
            {ctaLoading ? 'Redirecting to checkout…' : ctaLabel}
          </button>
          {ctaError && (
            <div style={{ marginTop: '8px', padding: '9px 11px', borderRadius: '10px', background: 'rgba(255,107,138,0.1)', border: '1px solid rgba(255,107,138,0.25)', fontSize: '12px', color: '#FF6B8A' }}>
              {ctaError}
            </div>
          )}
        </>
      ) : (
        <a href={ctaHref} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', padding: '11px', borderRadius: '13px',
          fontSize: '13px', fontWeight: 700,
          color: unlocked ? '#0B0A14' : '#E9E7F2',
          background: unlocked ? accentColor : `rgba(${accentRgb},0.18)`,
          border: `1px solid rgba(${accentRgb},0.3)`,
          textDecoration: 'none',
          boxShadow: unlocked ? `0 6px 18px rgba(${accentRgb},0.35)` : 'none',
          transition: 'opacity 0.15s',
        }}
          onMouseOver={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseOut={e => (e.currentTarget.style.opacity = '1')}
        >
          {ctaLabel}
        </a>
      )}
    </div>
  );
}
