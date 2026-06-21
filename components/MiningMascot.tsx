'use client';
import { useEffect, useState } from 'react';

export type MascotState = 'locked' | 'ready' | 'active' | 'paused' | 'complete';

interface MiningMascotProps {
  state: MascotState;
  sessionPct?: number;
  pendingRewardUsd?: string;
}

export default function MiningMascot({ state, sessionPct, pendingRewardUsd }: MiningMascotProps) { void sessionPct;
  const isActive   = state === 'active';
  const isComplete = state === 'complete';
  const isLocked   = state === 'locked';

  const [showCredited, setShowCredited] = useState(false);
  useEffect(() => {
    if (isComplete) {
      const t = setTimeout(() => setShowCredited(true), 1400);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowCredited(false);
  }, [isComplete]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '8px 0', userSelect: 'none' }}>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .mn-arm, .mn-body, .mn-dia, .mn-chip { animation: none !important; }
        }
        @keyframes mnSwing {
          0%,100% { transform: rotate(-38deg); }
          50%      { transform: rotate(28deg); }
        }
        @keyframes mnBob {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
        @keyframes mnCelebrate {
          0%,100% { transform: translateY(0) rotate(0deg); }
          30%      { transform: translateY(-7px) rotate(-6deg); }
          70%      { transform: translateY(-7px) rotate(6deg); }
        }
        @keyframes mnChip1 {
          0%   { opacity: 1; transform: translate(0,0) scale(1); }
          100% { opacity: 0; transform: translate(-14px,-16px) scale(0.3); }
        }
        @keyframes mnChip2 {
          0%   { opacity: 1; transform: translate(0,0) scale(1); }
          100% { opacity: 0; transform: translate(-20px,-8px) scale(0.2); }
        }
        @keyframes mnChip3 {
          0%   { opacity: 1; transform: translate(0,0) scale(1); }
          100% { opacity: 0; transform: translate(-6px,-22px) scale(0.35); }
        }
        @keyframes mnDiamondRise {
          0%   { transform: translate(0,0) scale(1);   filter: drop-shadow(0 0 5px #7ef); opacity: 1; }
          35%  { transform: translate(-6px,-50px) scale(1.35); filter: drop-shadow(0 0 14px #7ef); opacity: 1; }
          65%  { transform: translate(-4px,-88px) scale(1.65); filter: drop-shadow(0 0 22px #16D98A); opacity: 1; }
          100% { transform: translate(-2px,-110px) scale(1.9);  filter: drop-shadow(0 0 30px #16D98A); opacity: 0.95; }
        }
        @keyframes mnGlowPulse {
          0%,100% { opacity: 0.45; }
          50%      { opacity: 1; }
        }
        @keyframes mnDiaGlow {
          0%,100% { filter: drop-shadow(0 0 4px rgba(100,230,255,0.8)); }
          50%      { filter: drop-shadow(0 0 10px rgba(130,250,255,1)); }
        }
        @keyframes mnLamp {
          0%,100% { opacity: 0.7; }
          50%      { opacity: 1; }
        }
        @keyframes mnStar {
          0%   { opacity: 1; transform: scale(0.2) translate(0,0); }
          100% { opacity: 0; transform: scale(1.3) translate(var(--tx),var(--ty)); }
        }
        @keyframes mnCredit {
          0%   { opacity: 0; transform: translateY(10px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes mnBalance {
          0%   { opacity: 0; transform: translateX(-6px); }
          100% { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <svg
        viewBox="0 0 190 210"
        width="190"
        height="210"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
        aria-label={`Etheon miner — ${state}`}
      >
        <defs>
          <linearGradient id="mnHat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0"   stopColor="#FFD04A" />
            <stop offset="1"   stopColor="#E08800" />
          </linearGradient>
          <linearGradient id="mnOverall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0"   stopColor="#F5A523" />
            <stop offset="1"   stopColor="#C97000" />
          </linearGradient>
          <linearGradient id="mnRock" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0"   stopColor="#5A5468" />
            <stop offset="1"   stopColor="#252030" />
          </linearGradient>
          <linearGradient id="mnDia" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0"   stopColor="#C4F0FF" />
            <stop offset="0.4" stopColor="#58C8E8" />
            <stop offset="1"   stopColor="#1A8EBA" />
          </linearGradient>
          <radialGradient id="mnDiaHalo" cx="50%" cy="40%" r="60%">
            <stop offset="0"   stopColor="#C0F4FF" stopOpacity="0.85" />
            <stop offset="1"   stopColor="#58C8E8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mnGround" cx="50%" cy="50%" r="50%">
            <stop offset="0"   stopColor="rgba(0,0,0,0.22)" />
            <stop offset="1"   stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <filter id="mnGlow">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="mnGlowBig">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="108" cy="202" rx="72" ry="8" fill="url(#mnGround)" />

        {/* ═══════════════════ ROCK PILE ═══════════════════ */}
        <g opacity={isLocked ? 0.38 : 1}>
          <ellipse cx="58" cy="184" rx="42" ry="9" fill="rgba(0,0,0,0.28)" />
          {/* Rock body */}
          <path d="M16,182 L12,160 L24,138 L40,124 L62,120 L80,132 L92,152 L94,175 L90,184 Z"
            fill="url(#mnRock)" />
          {/* Rock top highlight */}
          <path d="M24,138 L40,124 L62,120 L64,132 L48,130 L34,142 Z"
            fill="rgba(255,255,255,0.1)" />
          {/* Active cracks */}
          {isActive && <>
            <path d="M72,148 L82,140 M66,158 L78,154" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" />
            <path d="M60,164 L70,160 M56,145 L64,150" stroke="rgba(255,255,255,0.12)" strokeWidth="0.9" />
          </>}

          {/* ── EMBEDDED DIAMONDS (hidden while rising on complete) ── */}
          {!isComplete && (
            <g transform="translate(52,126)" className="mn-dia"
              style={{ animation: isActive ? 'mnDiaGlow 1.4s ease-in-out infinite' : undefined,
                       opacity: isLocked ? 0.2 : 1 }}>
              {(isActive || state === 'ready') && (
                <circle cx="9" cy="10" r="16" fill="url(#mnDiaHalo)" style={{ animation: 'mnGlowPulse 1.4s ease-in-out infinite' }} />
              )}
              {/* Main diamond */}
              <polygon points="9,0 18,9 9,20 0,9" fill="url(#mnDia)" />
              <polygon points="9,0 18,9 9,9"   fill="rgba(255,255,255,0.42)" />
              <polygon points="9,20 0,9 9,9"   fill="rgba(0,80,120,0.25)" />
            </g>
          )}

          {/* Small diamond bottom-left */}
          <g transform="translate(30,150)"
            style={{ opacity: isLocked ? 0.15 : 0.8,
                     animation: isActive ? 'mnDiaGlow 1.9s ease-in-out infinite 0.35s' : undefined }}>
            <polygon points="7,0 13,7 7,15 0,7" fill="url(#mnDia)" />
            <polygon points="7,0 13,7 7,7"   fill="rgba(255,255,255,0.35)" />
          </g>

          {/* Small diamond right */}
          <g transform="translate(72,142)"
            style={{ opacity: isLocked ? 0.15 : 0.7,
                     animation: isActive ? 'mnDiaGlow 2.1s ease-in-out infinite 0.7s' : undefined }}>
            <polygon points="6,0 11,6 6,13 0,6" fill="url(#mnDia)" />
            <polygon points="6,0 11,6 6,6"   fill="rgba(255,255,255,0.3)" />
          </g>

          {/* Sparkle stars (ready / active) */}
          {(isActive || state === 'ready') && (<>
            <text x="22" y="128" fontSize="10"
              style={{ animation: 'mnStar 1.7s ease-out infinite 0s',
                       // @ts-expect-error css custom props
                       '--tx': '-6px', '--ty': '-10px' }}>✦</text>
            <text x="86" y="135" fontSize="8"
              style={{ animation: 'mnStar 2s ease-out infinite 0.55s',
                       // @ts-expect-error css custom props
                       '--tx': '7px', '--ty': '-7px' }}>✦</text>
          </>)}
        </g>

        {/* ═══════════════════ RISING DIAMOND (complete) ═══════════════════ */}
        {isComplete && (
          <g transform="translate(52,126)" style={{ animation: 'mnDiamondRise 2.2s cubic-bezier(.22,.8,.44,1) forwards' }}>
            {/* Glow halo */}
            <circle cx="9" cy="10" r="26" fill="url(#mnDiaHalo)"
              style={{ animation: 'mnGlowPulse 0.7s ease-in-out infinite' }} />
            {/* Diamond */}
            <polygon points="9,0 18,9 9,20 0,9" fill="url(#mnDia)" filter="url(#mnGlowBig)" />
            <polygon points="9,0 18,9 9,9"   fill="rgba(255,255,255,0.52)" />
            <polygon points="9,20 0,9 9,9"   fill="rgba(0,80,120,0.22)" />
            {/* Orbiting sparkles */}
            {[
              { x: -14, y: -4,  d: '0s',    tx: '-12px', ty: '-14px', sz: 13 },
              { x:  22, y: -6,  d: '0.22s', tx: '11px',  ty: '-12px', sz: 11 },
              { x:  -9, y:  22, d: '0.44s', tx: '-9px',  ty:  '10px', sz: 10 },
              { x:  20, y:  18, d: '0.66s', tx: '10px',  ty:  '8px',  sz:  9 },
            ].map((s, i) => (
              <text key={i} x={s.x} y={s.y} fontSize={s.sz} textAnchor="middle"
                style={{ animation: `mnStar 1.1s ease-out infinite ${s.d}`,
                         // @ts-expect-error css custom props
                         '--tx': s.tx, '--ty': s.ty }}>✦</text>
            ))}
          </g>
        )}

        {/* Rock chip particles (active impact) */}
        {isActive && (<>
          <circle cx="89" cy="150" r="3.5" fill="#7A6A8A"
            style={{ animation: 'mnChip1 0.55s ease-out infinite' }} />
          <circle cx="91" cy="158" r="2.5" fill="#6A5A7A"
            style={{ animation: 'mnChip2 0.55s ease-out infinite 0.18s' }} />
          <circle cx="86" cy="143" r="3"   fill="#9A8AA8"
            style={{ animation: 'mnChip3 0.55s ease-out infinite 0.36s' }} />
        </>)}

        {/* ═══════════════════ MINER CHARACTER ═══════════════════ */}
        <g className="mn-body"
          style={{
            animation: isActive   ? 'mnBob 0.45s ease-in-out infinite'
                      : isComplete ? 'mnCelebrate 0.65s ease-in-out infinite'
                      : undefined,
            transformOrigin: '130px 155px',
          }}>

          {/* ── Boots ── */}
          <rect x="107" y="178" width="18" height="11" rx="5.5" fill="#2A2030" />
          <rect x="131" y="178" width="18" height="11" rx="5.5" fill="#2A2030" />
          <rect x="105" y="184" width="22" height="5"  rx="2.5" fill="#1A1525" />
          <rect x="129" y="184" width="22" height="5"  rx="2.5" fill="#1A1525" />

          {/* ── Legs ── */}
          <rect x="109" y="158" width="14" height="24" rx="5" fill="url(#mnOverall)" />
          <rect x="133" y="158" width="14" height="24" rx="5" fill="url(#mnOverall)" />

          {/* ── Gray shirt (torso base) ── */}
          <rect x="100" y="112" width="56" height="52" rx="11" fill="#948AA0" />

          {/* ── Overalls bib ── */}
          <path d="M104,114 L112,102 L144,102 L152,114 L152,162 L104,162 Z" fill="url(#mnOverall)" />
          {/* Bib centre pocket */}
          <rect x="121" y="115" width="14" height="10" rx="3" fill="rgba(0,0,0,0.18)" />
          <rect x="123" y="117" width="10" height="3"  rx="1.5" fill="rgba(0,0,0,0.12)" />
          {/* Shoulder straps */}
          <path d="M112,102 L106,78" stroke="#E08800" strokeWidth="8"  strokeLinecap="round" />
          <path d="M144,102 L150,78" stroke="#E08800" strokeWidth="8"  strokeLinecap="round" />
          {/* Belt */}
          <rect x="101" y="154" width="54" height="7" rx="3.5" fill="#7A5810" />
          {/* Belt buckle */}
          <rect x="122" y="153" width="12" height="9" rx="2" fill="#C4920E" />
          <rect x="124" y="155" width="8"  height="5" rx="1" fill="#FFD04A" opacity="0.7" />

          {/* ── Shirt collar ── */}
          <path d="M116,104 L128,112 L140,104"
            fill="none" stroke="#B0A8BC" strokeWidth="4.5" strokeLinecap="round" />

          {/* ── RIGHT ARM (resting, near waist) ── */}
          <rect x="152" y="114" width="20" height="11" rx="5.5" fill="#948AA0" />
          <rect x="166" y="118" width="15" height="9"  rx="4.5" fill="#C8A07A" />
          <circle cx="180" cy="123" r="7" fill="#C8A07A" />

          {/* ── LEFT ARM + PICKAXE (swings) ── */}
          <g className="mn-arm"
            style={{
              transformOrigin: '104px 122px',
              animation: isActive ? 'mnSwing 0.45s ease-in-out infinite' : undefined,
            }}>
            {/* Upper arm */}
            <rect x="84" y="114" width="22" height="11" rx="5.5" fill="#948AA0" />
            {/* Forearm */}
            <rect x="68" y="118" width="20" height="10" rx="5"   fill="#C8A07A" />
            {/* Hand */}
            <circle cx="67" cy="124" r="7" fill="#C8A07A" />

            {/* ── Pickaxe ── */}
            {/* Handle */}
            <rect x="14" y="114" width="56" height="6" rx="3"
              fill="#8B5E2A" transform="rotate(-8, 42, 117)" />
            {/* Head */}
            <g transform="translate(12, 104) rotate(-8, 30, 10)">
              {/* Spike left (hits rock) */}
              <polygon points="0,6  10,0  12,8"  fill="#D0D0D8" />
              {/* Centre mass */}
              <rect x="10" y="2" width="22" height="8" rx="1.5" fill="#B0B0B8" />
              {/* Spike right */}
              <polygon points="32,2  42,8  32,10" fill="#C0C0C8" />
              {/* Highlights */}
              <polygon points="0,6  10,0  10,3"  fill="rgba(255,255,255,0.32)" />
              <rect    x="10" y="2" width="22" height="3" rx="1" fill="rgba(255,255,255,0.15)" />
            </g>
          </g>

          {/* ── Neck ── */}
          <rect x="120" y="90" width="16" height="16" rx="5" fill="#C8A07A" />

          {/* ── Head ── */}
          <ellipse cx="128" cy="74" rx="25" ry="22" fill="#C8A07A" />

          {/* Beard stubble */}
          <path d="M108,82 Q128,96 148,82" fill="#A07848" opacity="0.45" />
          <path d="M112,88 Q128,94 144,88" fill="#885830" opacity="0.30" />
          {/* Stubble dots */}
          {[112,117,122,127,132,137,142].map((x, i) => (
            <circle key={i} cx={x} cy={88} r="1.1" fill="#906040" opacity="0.35" />
          ))}

          {/* Eyes — white sclera */}
          <ellipse cx="119" cy="72" rx="5"   ry="4.5" fill="white" />
          <ellipse cx="137" cy="72" rx="5"   ry="4.5" fill="white" />
          {/* Irises */}
          <circle  cx="120" cy="73" r="2.8" fill="#3A2A18" />
          <circle  cx="138" cy="73" r="2.8" fill="#3A2A18" />
          {/* Pupils */}
          <circle  cx="120" cy="73" r="1.4" fill="#1A120A" />
          <circle  cx="138" cy="73" r="1.4" fill="#1A120A" />
          {/* Eye shine */}
          <circle  cx="121" cy="72" r="0.9" fill="white" />
          <circle  cx="139" cy="72" r="0.9" fill="white" />

          {/* Eyebrows */}
          <path d="M114,67 Q119,64 124,67" fill="none" stroke="#7A5030" strokeWidth="2"   strokeLinecap="round" />
          <path d="M132,67 Q137,64 142,67" fill="none" stroke="#7A5030" strokeWidth="2"   strokeLinecap="round" />

          {/* Smile */}
          <path d="M116,82 Q128,91 140,82" fill="none" stroke="#8B5030" strokeWidth="2.5" strokeLinecap="round" />
          {/* Cheek blush */}
          <ellipse cx="112" cy="79" rx="5"   ry="3"   fill="rgba(220,90,70,0.22)" />
          <ellipse cx="144" cy="79" rx="5"   ry="3"   fill="rgba(220,90,70,0.22)" />
          {/* Nose */}
          <ellipse cx="128" cy="78" rx="3"   ry="2.2" fill="rgba(160,100,60,0.3)" />

          {/* ── Hard Hat ── */}
          {/* Brim */}
          <ellipse cx="128" cy="57" rx="30" ry="5.5" fill="#D08000" />
          {/* Dome */}
          <path d="M100,57 Q98,35 128,31 Q158,35 156,57 Z" fill="url(#mnHat)" />
          {/* Dome highlight */}
          <path d="M107,48 Q128,38 149,48"
            fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="3.5" strokeLinecap="round" />
          {/* Lamp housing */}
          <rect x="120" y="47" width="16" height="10" rx="3.5" fill="#444044" />
          {/* Lamp lens */}
          <circle cx="128" cy="52" r="5.5"
            fill={isActive ? '#FFF8B0' : '#DDDD80'} opacity="0.95"
            style={{ animation: isActive ? 'mnLamp 0.75s ease-in-out infinite' : undefined }} />
          {/* Lamp rim */}
          <circle cx="128" cy="52" r="5.5" fill="none" stroke="#888" strokeWidth="1.2" />
          {/* Lamp beam rays (active) */}
          {isActive && (
            <g style={{ animation: 'mnLamp 0.75s ease-in-out infinite' }}>
              <path d="M122,58 L112,80" stroke="rgba(255,248,160,0.22)" strokeWidth="3" strokeLinecap="round" />
              <path d="M128,58 L128,82" stroke="rgba(255,248,160,0.20)" strokeWidth="3" strokeLinecap="round" />
              <path d="M134,58 L144,80" stroke="rgba(255,248,160,0.22)" strokeWidth="3" strokeLinecap="round" />
            </g>
          )}
        </g>

        {/* ── Celebration stars (complete) ── */}
        {isComplete && [
          { x: 50,  y: 88,  d: '0s',    tx: '-20px', ty: '-22px', sz: 15 },
          { x: 178, y: 80,  d: '0.2s',  tx:  '16px', ty: '-18px', sz: 13 },
          { x: 42,  y: 140, d: '0.4s',  tx: '-16px', ty:  '-8px', sz: 12 },
          { x: 180, y: 130, d: '0.62s', tx:  '14px', ty: '-12px', sz: 14 },
        ].map((s, i) => (
          <text key={i} x={s.x} y={s.y} fontSize={s.sz} textAnchor="middle"
            style={{ animation: `mnStar 1.3s ease-out infinite ${s.d}`,
                     // @ts-expect-error css custom props
                     '--tx': s.tx, '--ty': s.ty }}>⭐</text>
        ))}
      </svg>

      {/* ═══════════════════ CREDITED BADGE ═══════════════════ */}
      {isComplete && pendingRewardUsd && showCredited && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
          animation: 'mnCredit 0.55s cubic-bezier(.22,.8,.44,1) forwards',
        }}>
          {/* Main reward pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            padding: '11px 22px', borderRadius: '999px',
            background: 'linear-gradient(130deg, rgba(22,217,138,0.22), rgba(90,200,255,0.16))',
            border: '1.5px solid rgba(22,217,138,0.45)',
            boxShadow: '0 0 24px rgba(22,217,138,0.28), inset 0 1px 0 rgba(255,255,255,0.08)',
            fontSize: '17px', fontWeight: 800, color: '#16D98A',
            letterSpacing: '-0.01em',
          }}>
            <span style={{ fontSize: '22px' }}>💎</span>
            +{pendingRewardUsd} GBP mined!
          </div>
          {/* Balance credited line */}
          <div style={{
            fontSize: '12.5px', fontWeight: 600, color: '#5BC8A8',
            animation: 'mnBalance 0.4s ease-out 0.25s both',
          }}>
            Balance credited to your account ✓
          </div>
        </div>
      )}

      {/* Active pending reward */}
      {isActive && pendingRewardUsd && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 14px', borderRadius: '999px',
          background: 'rgba(22,217,138,0.1)',
          border: '1px solid rgba(22,217,138,0.25)',
          fontSize: '13px', fontWeight: 700, color: '#16D98A',
        }}>
          +{pendingRewardUsd} pending
        </div>
      )}

      {/* State label */}
      <div style={{ fontSize: '12px', color: '#6F6B82', fontWeight: 600, textAlign: 'center', maxWidth: '210px', lineHeight: 1.4 }}>
        {state === 'locked'   && 'Subscribe and deposit to unlock rewards mining'}
        {state === 'ready'    && 'Ready to start your rewards session'}
        {state === 'active'   && 'Mining rewards in progress…'}
        {state === 'paused'   && 'Session paused'}
        {state === 'complete' && 'Session complete — reward credited!'}
      </div>
    </div>
  );
}
