'use client';

export type MascotState = 'locked' | 'ready' | 'active' | 'paused' | 'complete';

interface MiningMascotProps {
  state: MascotState;
  sessionPct?: number;
  pendingRewardUsd?: string;
}

export default function MiningMascot({ state, sessionPct = 0, pendingRewardUsd }: MiningMascotProps) {
  const isActive = state === 'active';
  const isComplete = state === 'complete';
  const isLocked = state === 'locked';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '8px 0', userSelect: 'none' }}>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .mascot-arm, .mascot-body, .mascot-eye, .mascot-crystal, .mascot-star { animation: none !important; }
        }
        @keyframes mascotMine { 0%,100%{transform:rotate(-18deg) translateY(0)} 50%{transform:rotate(18deg) translateY(4px)} }
        @keyframes mascotBob  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes mascotBlink{ 0%,90%,100%{transform:scaleY(1)} 95%{transform:scaleY(0.1)} }
        @keyframes mascotGlow { 0%,100%{filter:drop-shadow(0 0 6px rgba(124,92,255,0.7))} 50%{filter:drop-shadow(0 0 14px rgba(124,92,255,1))} }
        @keyframes mascotCelebrate{ 0%,100%{transform:translateY(0) rotate(0)} 25%{transform:translateY(-8px) rotate(-8deg)} 75%{transform:translateY(-8px) rotate(8deg)} }
        @keyframes mascotPulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        @keyframes mascotStar   { 0%{opacity:1;transform:scale(0) translate(0,0)} 100%{opacity:0;transform:scale(1.2) translate(var(--tx),var(--ty))} }
        @keyframes mascotCrystalShrink { 0%{transform:scale(1)} 100%{transform:scale(${Math.max(0.3, 1 - sessionPct / 100)})} }
      `}</style>

      <svg
        viewBox="0 0 120 130"
        width="120"
        height="130"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
        aria-label={`Etheon miner — ${state}`}
      >
        <defs>
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9b7bff" />
            <stop offset="1" stopColor="#6e8bff" />
          </linearGradient>
          <linearGradient id="crystalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7fffb2" />
            <stop offset="1" stopColor="#16D98A" />
          </linearGradient>
          <radialGradient id="crystalGlow" cx="50%" cy="40%" r="50%">
            <stop offset="0" stopColor="#16D98A" stopOpacity="0.6" />
            <stop offset="1" stopColor="#16D98A" stopOpacity="0" />
          </radialGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="60" cy="125" rx="30" ry="5" fill="rgba(0,0,0,0.25)" />

        {/* --- Crystal / Rock --- */}
        <g
          transform="translate(78, 72)"
          className="mascot-crystal"
          style={{
            transformOrigin: '15px 20px',
            animation: isActive ? `mascotCrystalShrink 30s linear forwards` : undefined,
            filter: isComplete ? 'drop-shadow(0 0 8px #16D98A)' : undefined,
          }}
        >
          <ellipse cx="15" cy="38" rx="18" ry="5" fill="rgba(22,217,138,0.2)" />
          <polygon points="15,0 30,20 25,38 5,38 0,20" fill="url(#crystalGrad)" opacity={isLocked ? 0.3 : 0.9} />
          <polygon points="15,0 30,20 15,14" fill="rgba(255,255,255,0.25)" />
          {(isActive || isComplete) && (
            <circle cx="15" cy="18" r="20" fill="url(#crystalGlow)" opacity="0.6" />
          )}
          {/* Lock icon overlay */}
          {isLocked && (
            <g transform="translate(7, 10)">
              <rect x="1" y="8" width="14" height="12" rx="2" fill="rgba(255,255,255,0.3)" />
              <path d="M4 8V6a4 4 0 0 1 8 0v2" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
            </g>
          )}
        </g>

        {/* --- Body (robot miner) --- */}
        <g
          className="mascot-body"
          style={{
            animation: isActive
              ? 'mascotBob 0.5s ease-in-out infinite'
              : isComplete
              ? 'mascotCelebrate 0.6s ease-in-out infinite'
              : undefined,
            transformOrigin: '52px 90px',
          }}
        >
          {/* Legs */}
          <rect x="42" y="108" width="10" height="16" rx="4" fill="#4A3D8F" />
          <rect x="56" y="108" width="10" height="16" rx="4" fill="#4A3D8F" />
          <rect x="40" y="120" width="14" height="5" rx="2.5" fill="#352c6e" />
          <rect x="54" y="120" width="14" height="5" rx="2.5" fill="#352c6e" />

          {/* Torso */}
          <rect x="38" y="80" width="32" height="32" rx="9" fill="url(#bodyGrad)" />

          {/* Torso detail */}
          <rect x="44" y="88" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.2)" />
          <rect x="44" y="94" width="14" height="3" rx="1.5" fill="rgba(255,255,255,0.15)" />

          {/* Light on torso */}
          <circle cx="52" cy="102" r="4" fill={isActive ? '#16D98A' : isLocked ? '#4A3D8F' : '#FFB55C'} />
          {isActive && (
            <circle cx="52" cy="102" r="4" fill="#16D98A"
              style={{ animation: 'mascotPulse 0.7s ease-in-out infinite', transformOrigin: '52px 102px' }} />
          )}

          {/* Head */}
          <rect x="36" y="52" width="36" height="32" rx="12" fill="url(#bodyGrad)"
            style={{ filter: isActive ? 'drop-shadow(0 0 8px rgba(124,92,255,0.8))' : undefined }} />

          {/* Helmet highlight */}
          <rect x="40" y="55" width="28" height="6" rx="3" fill="rgba(255,255,255,0.15)" />

          {/* Eyes */}
          <rect
            className="mascot-eye"
            x="43" y="64" width="10" height="10" rx="3"
            fill={isLocked ? '#4A3D8F' : isActive ? '#16D98A' : '#C9BBFF'}
            style={{ animation: state !== 'locked' ? 'mascotBlink 3.2s ease-in-out infinite' : undefined, transformOrigin: '48px 69px' }}
          />
          <rect
            className="mascot-eye"
            x="55" y="64" width="10" height="10" rx="3"
            fill={isLocked ? '#4A3D8F' : isActive ? '#16D98A' : '#C9BBFF'}
            style={{ animation: state !== 'locked' ? 'mascotBlink 3.2s ease-in-out infinite 0.1s' : undefined, transformOrigin: '60px 69px' }}
          />

          {/* Antenna */}
          <rect x="51" y="42" width="4" height="12" rx="2" fill="#9b7bff" />
          <circle cx="53" cy="40" r="5" fill={isActive ? '#16D98A' : isComplete ? '#FFD700' : '#C9BBFF'}
            style={{ animation: isActive ? 'mascotGlow 1s ease-in-out infinite' : undefined }} />

          {/* Left arm (holding pickaxe) */}
          <g
            className="mascot-arm"
            style={{
              transformOrigin: '38px 86px',
              animation: isActive ? 'mascotMine 0.45s ease-in-out infinite' : undefined,
            }}
          >
            <rect x="24" y="80" width="14" height="8" rx="4" fill="#7a60dd" />
            {/* Pickaxe */}
            <g transform="translate(12, 75)">
              <rect x="0" y="8" width="16" height="3" rx="1.5" fill="#8A7BA0" />
              <polygon points="0,8 6,1 8,8" fill="#C9BBFF" />
              <polygon points="16,8 10,1 8,8" fill="#A39FB5" />
            </g>
          </g>

          {/* Right arm */}
          <rect x="66" y="80" width="14" height="8" rx="4" fill="#7a60dd" />
        </g>

        {/* Stars for complete state */}
        {isComplete && (
          <>
            {[
              { cx: 20, cy: 45, tx: '-15px', ty: '-20px', delay: '0s' },
              { cx: 90, cy: 40, tx: '12px', ty: '-22px', delay: '0.15s' },
              { cx: 15, cy: 75, tx: '-18px', ty: '-8px', delay: '0.3s' },
            ].map((s, i) => (
              <text
                key={i}
                x={s.cx} y={s.cy}
                fontSize="16" textAnchor="middle"
                className="mascot-star"
                style={{
                  // @ts-expect-error css custom props
                  '--tx': s.tx, '--ty': s.ty,
                  animation: `mascotStar 1s ease-out infinite ${s.delay}`,
                }}
              >⭐</text>
            ))}
          </>
        )}
      </svg>

      {/* Pending reward badge */}
      {(isComplete || (isActive && pendingRewardUsd)) && pendingRewardUsd && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 14px', borderRadius: '999px',
          background: 'rgba(22,217,138,0.14)',
          border: '1px solid rgba(22,217,138,0.3)',
          fontSize: '13.5px', fontWeight: 700, color: '#16D98A',
        }}>
          +{pendingRewardUsd} pending
        </div>
      )}

      {/* State label */}
      <div style={{ fontSize: '12px', color: '#6F6B82', fontWeight: 600, textAlign: 'center', maxWidth: '180px', lineHeight: 1.4 }}>
        {state === 'locked' && 'Subscribe and deposit to unlock rewards mining'}
        {state === 'ready' && 'Ready to start your rewards session'}
        {state === 'active' && 'Mining rewards in progress…'}
        {state === 'paused' && 'Session paused'}
        {state === 'complete' && 'Session complete — reward is pending'}
      </div>
    </div>
  );
}
