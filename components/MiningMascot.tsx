'use client';
import { useEffect, useRef } from 'react';

export type MascotState = 'locked' | 'ready' | 'active' | 'paused' | 'complete';

interface MiningMascotProps {
  state: MascotState;
  sessionPct?: number;
  pendingRewardUsd?: string;
}

// EQ bar specs — deterministic (no Math.random at render time)
const EQ_L = [
  { h: 52, d: '0s',    sp: '0.55s' },
  { h: 74, d: '0.12s', sp: '0.68s' },
  { h: 62, d: '0.07s', sp: '0.6s'  },
  { h: 80, d: '0.22s', sp: '0.75s' },
  { h: 58, d: '0.15s', sp: '0.5s'  },
];
const EQ_R = [
  { h: 68, d: '0.18s', sp: '0.63s' },
  { h: 50, d: '0.05s', sp: '0.52s' },
  { h: 80, d: '0.28s', sp: '0.72s' },
  { h: 65, d: '0.1s',  sp: '0.58s' },
  { h: 76, d: '0.2s',  sp: '0.66s' },
];

export default function MiningMascot({ state, sessionPct = 0 }: MiningMascotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  const isActive   = state === 'active';
  const isPaused   = state === 'paused';
  const isLocked   = state === 'locked';
  const isComplete = state === 'complete';

  // Canvas impact particles — client-only, active state only
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;
    const ctxOrNull = canvas.getContext('2d');
    if (!ctxOrNull) return;
    const ctx = ctxOrNull;

    canvas.width  = 260;
    canvas.height = 260;

    // Crystal tip in canvas coords (matching SVG viewBox 260×260)
    const HX = 196, HY = 148;
    const COLORS = ['#9B7BFF', '#C9BBFF', '#6E8BFF', '#27D980', '#ffffff'];

    type P = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number; color: string };
    const ps: P[] = [];
    let lastSpawn = -9999;

    function frame(t: number) {
      ctx.clearRect(0, 0, 260, 260);
      if (t - lastSpawn > 1400) {
        lastSpawn = t;
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 0.8 + Math.random() * 3;
          ps.push({
            x: HX, y: HY,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - 1.5,
            life: 0, maxLife: 28 + Math.random() * 24,
            r: 1.2 + Math.random() * 2.2,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
          });
        }
      }
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life++;
        if (p.life >= p.maxLife) { ps.splice(i, 1); continue; }
        ctx.globalAlpha = Math.sin((p.life / p.maxLife) * Math.PI);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(rafRef.current); };
  }, [isActive]);

  const swingDur  = isPaused ? '4.2s' : '1.4s';
  const swingPlay = isActive || isPaused ? 'running' : 'paused';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', userSelect: 'none' }}>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .mn2-arm, .mn2-bob, .mn2-eq, .mn2-glow, .mn2-flash { animation: none !important; }
        }
        @keyframes mn2Swing {
          0%   { transform: rotate(-70deg); }
          30%  { transform: rotate(30deg);  }
          42%  { transform: rotate(18deg);  }
          56%  { transform: rotate(24deg);  }
          100% { transform: rotate(-70deg); }
        }
        @keyframes mn2Bob {
          0%,100% { transform: translateY(0);   }
          50%     { transform: translateY(-5px); }
        }
        @keyframes mn2Glow {
          0%,100% { opacity: 0.4; }
          50%     { opacity: 1;   }
        }
        @keyframes mn2Flash {
          0%,27%,46%,100% { opacity: 0;   }
          32%             { opacity: 0.9; }
          40%             { opacity: 0.2; }
        }
        @keyframes mn2Eq {
          0%   { transform: scaleY(0.1); }
          100% { transform: scaleY(1);   }
        }
        @keyframes mn2Lamp {
          0%,100% { opacity: 0.8; }
          50%     { opacity: 1;   }
        }
        @keyframes mn2LockPulse {
          0%,100% { transform: scale(1);    opacity: 0.7; }
          50%     { transform: scale(1.06); opacity: 1;   }
        }
        @keyframes mn2Conf1 {
          0%   { transform: translateY(0)   rotate(0deg);    opacity: 1; }
          100% { transform: translateY(-44px) rotate(180deg); opacity: 0; }
        }
        @keyframes mn2Conf2 {
          0%   { transform: translateY(0)   rotate(0deg);    opacity: 1; }
          100% { transform: translateY(-58px) rotate(-220deg); opacity: 0; }
        }
        @keyframes mn2Conf3 {
          0%   { transform: translateY(0)   rotate(0deg);    opacity: 1; }
          100% { transform: translateY(-36px) rotate(270deg); opacity: 0; }
        }
      `}</style>

      <div style={{ position: 'relative', width: '260px', height: '260px' }}>
        {/* Impact particle canvas */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute', inset: 0,
            width: '260px', height: '260px',
            pointerEvents: 'none',
            opacity: isActive ? 1 : 0,
            transition: 'opacity .4s',
          }}
        />

        <svg
          viewBox="0 0 260 260"
          width="260"
          height="260"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
          aria-label={`Etheon miner — ${state}`}
        >
          <defs>
            <radialGradient id="mn2HelmGrad" cx="38%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#1A1038" stopOpacity="1" />
            </radialGradient>
            <linearGradient id="mn2VisorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4A6AFF" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#060420" stopOpacity="0.98" />
            </linearGradient>
            <linearGradient id="mn2SuitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E1C35" />
              <stop offset="100%" stopColor="#0F0E1E" />
            </linearGradient>
            <radialGradient id="mn2CrystalGrad" cx="30%" cy="25%" r="65%">
              <stop offset="0%" stopColor="#D0C4FF" />
              <stop offset="55%" stopColor="#9B7BFF" />
              <stop offset="100%" stopColor="#2A1870" />
            </radialGradient>
            <filter id="mn2Glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Ground shadow */}
          <ellipse cx="118" cy="244" rx="58" ry="7" fill="rgba(0,0,0,0.35)" />

          {/* ── EQ bars LEFT ── */}
          {EQ_L.map((b, i) => {
            const bx = 8 + i * 10;
            const by = 214;
            return (
              <rect key={`el${i}`}
                x={bx} y={by - b.h} width={6} height={b.h} rx={3}
                fill={isLocked ? '#2A2445' : '#7C5CFF'}
                className="mn2-eq"
                style={{
                  transformOrigin: `${bx + 3}px ${by}px`,
                  animation: isActive ? `mn2Eq ${b.sp} ${b.d} ease-in-out infinite alternate` : 'none',
                  opacity: isLocked ? 0.2 : 0.75,
                  transition: 'fill .4s, opacity .4s',
                }}
              />
            );
          })}

          {/* ── EQ bars RIGHT ── */}
          {EQ_R.map((b, i) => {
            const bx = 206 + i * 10;
            const by = 214;
            return (
              <rect key={`er${i}`}
                x={bx} y={by - b.h} width={6} height={b.h} rx={3}
                fill={isLocked ? '#2A2445' : '#6E8BFF'}
                className="mn2-eq"
                style={{
                  transformOrigin: `${bx + 3}px ${by}px`,
                  animation: isActive ? `mn2Eq ${b.sp} ${b.d} ease-in-out infinite alternate` : 'none',
                  opacity: isLocked ? 0.2 : 0.75,
                  transition: 'fill .4s, opacity .4s',
                }}
              />
            );
          })}

          {/* ── Crystal rock target ── */}
          <g transform="translate(186,156)">
            {/* Rock base */}
            <polygon points="-16,22 -20,8 -12,-5 2,-14 18,-10 24,5 18,22"
              fill="#1E1A38" stroke="#3A3060" strokeWidth="1.5" />
            {/* Crystal shards */}
            <polygon points="4,-14 9,-34 14,-14" fill="url(#mn2CrystalGrad)" />
            <polygon points="-3,-11 2,-29 7,-11" fill="url(#mn2CrystalGrad)" opacity="0.85" />
            <polygon points="-1,-9 -9,-24 5,-24 13,-9" fill="url(#mn2CrystalGrad)" opacity="0.9" />
            {/* Crystal shine */}
            <line x1="6" y1="-30" x2="9" y2="-20"
              stroke="#fff" strokeWidth="1.5" strokeOpacity="0.55" strokeLinecap="round" />
            {/* Impact flash */}
            <circle cx="7" cy="-22" r="13" fill="#C9BBFF"
              className="mn2-flash"
              style={{
                opacity: 0,
                animation: isActive ? 'mn2Flash 1.4s ease-in-out infinite' : 'none',
              }}
              filter="url(#mn2Glow)"
            />
          </g>

          {/* ── Body — bobs when active ── */}
          <g className="mn2-bob"
            style={{
              transformOrigin: '118px 155px',
              animation: isActive ? 'mn2Bob 1.4s ease-in-out infinite' : 'none',
            }}
          >
            {/* Legs */}
            <rect x="94"  y="174" width="18" height="46" rx="6" fill="url(#mn2SuitGrad)" stroke="#2A2848" strokeWidth="1" />
            <rect x="118" y="174" width="18" height="46" rx="6" fill="url(#mn2SuitGrad)" stroke="#2A2848" strokeWidth="1" />
            {/* Knee pads */}
            <rect x="96"  y="192" width="14" height="9"  rx="3" fill="#2A2450" />
            <rect x="120" y="192" width="14" height="9"  rx="3" fill="#2A2450" />
            {/* Boots */}
            <rect x="90"  y="214" width="24" height="13" rx="5" fill="#0D0B1E" />
            <rect x="116" y="214" width="24" height="13" rx="5" fill="#0D0B1E" />

            {/* Torso */}
            <path d="M82,106 L86,94 L150,94 L154,106 L156,174 L80,174 Z"
              fill="url(#mn2SuitGrad)" stroke="#2A2848" strokeWidth="1" />
            {/* Chest plate */}
            <rect x="88" y="98" width="54" height="44" rx="7" fill="#201E3C" stroke="#3A3060" strokeWidth="1" />
            {/* Chest glow strip */}
            <rect x="112" y="104" width="6" height="32" rx="3" fill="#9B7BFF"
              className="mn2-glow"
              style={{ opacity: 0.6, animation: isActive ? 'mn2Glow 1.4s ease-in-out infinite' : 'none' }}
            />
            {/* Chest panel lines */}
            <line x1="90" y1="122" x2="140" y2="122" stroke="#3A3060" strokeWidth="0.8" />
            <line x1="90" y1="132" x2="140" y2="132" stroke="#3A3060" strokeWidth="0.8" />
            {/* Belt */}
            <rect x="82" y="172" width="68" height="9" rx="3" fill="#2A2450" stroke="#3A3060" strokeWidth="1" />
            <rect x="109" y="173" width="18" height="7" rx="2" fill="#3A3060" />
            <circle cx="118" cy="176.5" r="2.5" fill="#9B7BFF" opacity="0.7" />

            {/* Left arm — static */}
            <path d="M82,106 L70,122 L66,146 L78,150 L86,132 L86,106 Z"
              fill="url(#mn2SuitGrad)" stroke="#2A2848" strokeWidth="1" />
            <ellipse cx="70" cy="152" rx="9" ry="6" fill="#2A2450" stroke="#3A3060" strokeWidth="1" />
            {/* Left shoulder pad */}
            <ellipse cx="83" cy="106" rx="10" ry="7" fill="#2A2450" stroke="#3A3060" strokeWidth="1" />

            {/* Right shoulder pad */}
            <ellipse cx="152" cy="104" rx="10" ry="7" fill="#2A2450" stroke="#3A3060" strokeWidth="1" />

            {/* ── RIGHT ARM + PICKAXE — rotates around shoulder (152, 104) ── */}
            <g className="mn2-arm"
              style={{
                transformOrigin: '152px 104px',
                animation: `mn2Swing ${swingDur} ease-in-out infinite`,
                animationPlayState: swingPlay,
              }}
            >
              {/* Upper arm */}
              <rect x="144" y="104" width="16" height="32" rx="6"
                fill="url(#mn2SuitGrad)" stroke="#2A2848" strokeWidth="1" />
              {/* Forearm */}
              <rect x="142" y="134" width="14" height="28" rx="5"
                fill="url(#mn2SuitGrad)" stroke="#2A2848" strokeWidth="1" />
              {/* Glove */}
              <ellipse cx="150" cy="165" rx="9" ry="6" fill="#2A2450" stroke="#3A3060" strokeWidth="1" />
              {/* Pickaxe handle */}
              <rect x="147" y="162" width="6" height="52" rx="3"
                fill="#7B6040" stroke="#9B7A50" strokeWidth="1"
                transform="rotate(6,150,162)" />
              {/* Pickaxe head — at end of handle */}
              <g transform="translate(162, 208) rotate(-18)">
                {/* Shaft center */}
                <rect x="-24" y="-5" width="48" height="10" rx="3" fill="#8090A8" stroke="#5060A0" strokeWidth="1" />
                {/* Blunt end left */}
                <path d="M-24,-5 L-38,-4 L-38,4 L-24,5 Z" fill="#9098B8" stroke="#5060A0" strokeWidth="0.8" />
                {/* Sharp end right — business end hits crystal */}
                <path d="M24,-5 L42,-9 L44,0 L42,9 L24,5 Z" fill="#C0C8E0" stroke="#5060A0" strokeWidth="0.8" />
                {/* Metal shine */}
                <line x1="-36" y1="-3" x2="40" y2="-7" stroke="#fff" strokeWidth="1" strokeOpacity="0.22" />
                <line x1="24" y1="-5" x2="42" y2="-9" stroke="#fff" strokeWidth="1.2" strokeOpacity="0.45" />
              </g>
            </g>

            {/* Status LED on chest */}
            <circle cx="104" cy="124" r="4"
              fill={isLocked ? '#2A2848' : isActive ? '#16D98A' : isPaused ? '#F5B642' : '#9B7BFF'}
              filter={isActive ? 'url(#mn2Glow)' : undefined}
              style={{ animation: isActive ? 'mn2Glow 1.4s ease-in-out infinite' : 'none' }}
            />

            {/* Neck */}
            <rect x="110" y="78" width="16" height="18" rx="4" fill="#1E1C35" stroke="#2A2848" strokeWidth="1" />

            {/* ── HELMET ── */}
            <g>
              {/* Shell */}
              <ellipse cx="118" cy="58" rx="33" ry="31" fill="url(#mn2HelmGrad)" stroke="#5A3FBF" strokeWidth="2" />
              {/* Seam line */}
              <path d="M86 60 Q86 83 118 86 Q150 83 150 60"
                fill="none" stroke="#3A2090" strokeWidth="1" opacity="0.5" />
              {/* Visor shape */}
              <path d="M89,64 Q89,86 118,88 Q147,86 147,64" fill="url(#mn2VisorGrad)" />
              {/* Visor dark interior */}
              <path d="M92,66 Q92,83 118,84 Q144,83 144,66" fill="#050313" opacity="0.9" />
              {/* HUD lines inside visor */}
              {isActive && <>
                <line x1="97" y1="72" x2="139" y2="72" stroke="#6E8BFF" strokeWidth="0.8" opacity="0.35" />
                <line x1="97" y1="77" x2="122" y2="77" stroke="#6E8BFF" strokeWidth="0.8" opacity="0.2" />
              </>}
              {/* Visor reflection */}
              <path d="M96,69 Q107,78 118,78" stroke="#4A6AFF" strokeWidth="1.5" fill="none" opacity="0.3" />
              {/* Helmet lamp */}
              <circle cx="118" cy="32" r="8" fill="#FFD700"
                className="mn2-glow"
                style={{
                  opacity: isActive ? 1 : 0.5,
                  animation: isActive ? 'mn2Lamp 0.28s ease-in-out infinite alternate' : 'none',
                }}
              />
              <circle cx="118" cy="32" r="5" fill="#FFF8A0" />
              {/* Lamp glow halo */}
              <circle cx="118" cy="32" r="18" fill="#FFD700"
                style={{ opacity: isActive ? 0.18 : 0.04, filter: 'blur(5px)' }}
              />
              {/* Side vents */}
              <rect x="83" y="56" width="4" height="14" rx="2" fill="#2A1870" opacity="0.65" />
              <rect x="149" y="56" width="4" height="14" rx="2" fill="#2A1870" opacity="0.65" />

              {/* Lock icon overlay */}
              {isLocked && (
                <g style={{ animation: 'mn2LockPulse 2.5s ease-in-out infinite' }}>
                  <rect x="101" y="62" width="34" height="28" rx="7"
                    fill="rgba(11,10,20,0.9)" stroke="rgba(155,123,255,0.3)" strokeWidth="1" />
                  <path d="M108,62 L108,56 Q108,49 118,49 Q128,49 128,56 L128,62"
                    fill="none" stroke="#3A3060" strokeWidth="2.5" strokeLinecap="round" />
                  <rect x="104" y="62" width="28" height="22" rx="4"
                    fill="#1E1A38" stroke="#9B7BFF" strokeWidth="1.2" />
                  <circle cx="118" cy="72" r="4" fill="#9B7BFF" opacity="0.7" />
                  <rect x="116.5" y="72" width="3" height="7" rx="1.5" fill="#9B7BFF" opacity="0.7" />
                </g>
              )}
            </g>
          </g>

          {/* ── Complete celebration ── */}
          {isComplete && [
            { cx: 74,  cy: 52, r: 5, fill: '#27D980', an: 'mn2Conf1', dur: '1s',    d: '0s'    },
            { cx: 168, cy: 42, r: 4, fill: '#9B7BFF', an: 'mn2Conf2', dur: '1.2s',  d: '0.1s'  },
            { cx: 188, cy: 68, r: 5, fill: '#F5B642', an: 'mn2Conf3', dur: '0.9s',  d: '0.05s' },
            { cx: 56,  cy: 68, r: 3, fill: '#6E8BFF', an: 'mn2Conf1', dur: '1.3s',  d: '0.2s'  },
            { cx: 152, cy: 36, r: 4, fill: '#27D980', an: 'mn2Conf2', dur: '1.1s',  d: '0.15s' },
            { cx: 208, cy: 52, r: 3, fill: '#C9BBFF', an: 'mn2Conf3', dur: '0.8s',  d: '0.08s' },
          ].map((c, i) => (
            <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill={c.fill}
              style={{ animation: `${c.an} ${c.dur} ${c.d} ease-out infinite` }}
            />
          ))}

          {/* ── Session progress bar ── */}
          {(isActive || isPaused || isComplete) && (
            <>
              <rect x="52" y="252" width="156" height="5" rx="2.5" fill="#1E1A38" />
              <rect x="52" y="252"
                width={Math.max(0, Math.min(156, sessionPct * 1.56))}
                height="5" rx="2.5"
                fill={isComplete ? '#27D980' : '#9B7BFF'}
                style={{ transition: 'width .5s ease' }}
              />
            </>
          )}
        </svg>
      </div>

      {/* State label */}
      <div style={{ fontSize: '12px', color: '#6F6B82', fontWeight: 600, textAlign: 'center', maxWidth: '240px', lineHeight: 1.4 }}>
        {state === 'locked'   && 'Subscribe and deposit to unlock rewards mining'}
        {state === 'ready'    && 'Ready to start your rewards session'}
        {state === 'active'   && `Mining in progress — ${sessionPct.toFixed(1)}% of session`}
        {state === 'paused'   && 'Session paused'}
        {state === 'complete' && 'Session complete!'}
      </div>
    </div>
  );
}
