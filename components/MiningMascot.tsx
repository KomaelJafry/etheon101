'use client';
import { useEffect, useRef } from 'react';

export type MascotState = 'locked' | 'ready' | 'active' | 'paused' | 'complete';

interface MiningMascotProps {
  state: MascotState;
  sessionPct?: number;
  pendingRewardUsd?: string;
}

export default function MiningMascot({ state, sessionPct = 0 }: MiningMascotProps) {
  const isActive = state === 'active';
  const isLocked = state === 'locked';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef   = useRef<number>(0);
  const timeRef  = useRef(0);

  // Particle canvas for active state
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;
    const ctxOrNull = canvas.getContext('2d');
    if (!ctxOrNull) return;
    const ctx = ctxOrNull;

    const W = canvas.width  = 200;
    const H = canvas.height = 200;
    const cx = W / 2, cy = H / 2;

    type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number; hue: number };
    const particles: Particle[] = [];

    function spawn() {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 1.0;
      particles.push({
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 60 + Math.random() * 80,
        r: 1.5 + Math.random() * 2,
        hue: 250 + Math.random() * 60,
      });
    }

    function tick(t: number) {
      timeRef.current = t;
      ctx.clearRect(0, 0, W, H);
      if (Math.random() < 0.35) spawn();
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life++;
        if (p.life > p.maxLife) { particles.splice(i, 1); continue; }
        const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},90%,75%,${alpha})`;
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); ctx.clearRect(0, 0, W, H); };
  }, [isActive]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', userSelect: 'none', position: 'relative', width: '200px' }}>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .mn-ring, .mn-suit, .mn-bar, .mn-glow { animation: none !important; }
        }
        @keyframes mnRing1 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes mnRing2 { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes mnRing3 { from { transform: rotate(45deg); } to { transform: rotate(405deg); } }
        @keyframes mnBobSuit {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-4px); }
        }
        @keyframes mnGlowPulse {
          0%,100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
        @keyframes mnBarFlow {
          0%   { transform: scaleX(0.3); }
          50%  { transform: scaleX(1.0); }
          100% { transform: scaleX(0.3); }
        }
        @keyframes mnHashFlash {
          0%,90%,100% { opacity: 0.25; }
          45%          { opacity: 1; }
        }
        @keyframes mnLockPulse {
          0%,100% { transform: scale(1); opacity: 0.7; }
          50%      { transform: scale(1.05); opacity: 1; }
        }
        @keyframes mnBlink {
          0%,48%,52%,100% { transform: scaleY(1); }
          50%              { transform: scaleY(0.08); }
        }
      `}</style>

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        width={200} height={200}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', opacity: isActive ? 1 : 0, transition: 'opacity .4s' }}
      />

      {/* Main SVG */}
      <svg viewBox="0 0 200 200" width="200" height="200" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible', position: 'relative', zIndex: 1 }} aria-label={`Etheon miner — ${state}`}>
        <defs>
          <radialGradient id="mmCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isLocked ? '#3A3050' : '#7C5CFF'} stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0B0A14" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mmFaceGrad" cx="45%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#E8D5C0" />
            <stop offset="100%" stopColor="#C4A882" />
          </radialGradient>
          <linearGradient id="mmSuit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isLocked ? '#1E1C28' : '#23213A'} />
            <stop offset="100%" stopColor={isLocked ? '#0F0E18' : '#141225'} />
          </linearGradient>
          <linearGradient id="mmTie" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isLocked ? '#3A3750' : '#7C5CFF'} />
            <stop offset="100%" stopColor={isLocked ? '#1A1830' : '#4A35C8'} />
          </linearGradient>
          <linearGradient id="mmScreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A1635" />
            <stop offset="100%" stopColor="#0D0B20" />
          </linearGradient>
          <filter id="mmGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="mmGlowSoft" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Core glow */}
        <circle cx="100" cy="105" r="68" fill="url(#mmCoreGlow)" className="mn-glow"
          style={{ animation: isActive ? 'mnGlowPulse 2s ease-in-out infinite' : undefined }} />

        {/* ── Animated orbital rings (active only) ── */}
        {!isLocked && (<>
          {/* Ring 1 — slow outer */}
          <g className="mn-ring" style={{ transformOrigin: '100px 105px', animation: 'mnRing1 6s linear infinite', opacity: isActive ? 0.7 : 0.2 }}>
            <circle cx="100" cy="105" r="74" fill="none" stroke="#7C5CFF" strokeWidth="1" strokeDasharray="8 16" strokeLinecap="round" />
            <circle cx="100" cy="31" r="4" fill="#C9BBFF" filter="url(#mmGlow)" />
          </g>
          {/* Ring 2 — counter inner */}
          <g className="mn-ring" style={{ transformOrigin: '100px 105px', animation: 'mnRing2 4s linear infinite', opacity: isActive ? 0.6 : 0.15 }}>
            <circle cx="100" cy="105" r="62" fill="none" stroke="#6E8BFF" strokeWidth="0.8" strokeDasharray="4 12" strokeLinecap="round" />
            <circle cx="100" cy="43" r="3" fill="#6E8BFF" filter="url(#mmGlow)" />
          </g>
          {/* Ring 3 — tilted medium */}
          <g className="mn-ring" style={{ transformOrigin: '100px 105px', animation: 'mnRing3 8s linear infinite', opacity: isActive ? 0.5 : 0.1 }}>
            <ellipse cx="100" cy="105" rx="80" ry="26" fill="none" stroke="#9B7BFF" strokeWidth="0.7" strokeDasharray="6 18" strokeLinecap="round" transform="rotate(-20 100 105)" />
            <circle cx="172" cy="88" r="2.5" fill="#9B7BFF" filter="url(#mmGlow)" />
          </g>
        </>)}

        {/* ── Shadow ── */}
        <ellipse cx="100" cy="192" rx="50" ry="6" fill="rgba(0,0,0,0.35)" />

        {/* ── CHARACTER ── */}
        <g className="mn-suit"
          style={{ animation: isActive ? 'mnBobSuit 1.6s ease-in-out infinite' : undefined, transformOrigin: '100px 140px' }}>

          {/* Legs */}
          <rect x="82" y="159" width="14" height="28" rx="5" fill="#1A1830" />
          <rect x="104" y="159" width="14" height="28" rx="5" fill="#1A1830" />
          {/* Shoes */}
          <rect x="78"  y="182" width="20" height="8" rx="4" fill="#0D0C18" />
          <rect x="100" y="182" width="20" height="8" rx="4" fill="#0D0C18" />
          <rect x="78"  y="186" width="20" height="4" rx="2" fill="#070610" />
          <rect x="100" y="186" width="20" height="4" rx="2" fill="#070610" />

          {/* Suit trousers */}
          <rect x="82"  y="148" width="14" height="16" rx="3" fill="url(#mmSuit)" />
          <rect x="104" y="148" width="14" height="16" rx="3" fill="url(#mmSuit)" />

          {/* Suit jacket body */}
          <path d="M72,100 L76,85 L100,95 L124,85 L128,100 L130,158 L70,158 Z" fill="url(#mmSuit)" />
          {/* Jacket lapels */}
          <path d="M100,95 L88,100 L84,120 Z" fill="#2A2848" />
          <path d="M100,95 L112,100 L116,120 Z" fill="#2A2848" />
          {/* Lapel highlight */}
          <path d="M100,95 L88,100 L90,104" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <path d="M100,95 L112,100 L110,104" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

          {/* Shirt & tie */}
          <path d="M93,100 L100,95 L107,100 L108,132 L92,132 Z" fill="#F0EEF8" />
          <path d="M97,100 L100,96 L103,100 L104,120 L96,120 Z" fill="url(#mmTie)" />
          {/* Tie pin */}
          <rect x="97" y="112" width="6" height="2" rx="1" fill={isLocked ? '#5A5070' : '#C9BBFF'} />

          {/* Left arm */}
          <path d="M72,100 L62,120 L66,136 L74,134 L80,120 L76,100 Z" fill="url(#mmSuit)" />
          {/* Left cuff */}
          <rect x="61" y="132" width="14" height="6" rx="3" fill="#F0EEF8" />
          {/* Left hand */}
          <ellipse cx="68" cy="141" rx="7" ry="5" fill="url(#mmFaceGrad)" />

          {/* Right arm */}
          <path d="M128,100 L138,120 L134,136 L126,134 L120,120 L124,100 Z" fill="url(#mmSuit)" />
          {/* Right cuff */}
          <rect x="125" y="132" width="14" height="6" rx="3" fill="#F0EEF8" />
          {/* Right hand holds tablet/device */}
          <ellipse cx="132" cy="141" rx="7" ry="5" fill="url(#mmFaceGrad)" />

          {/* Pocket square */}
          <path d="M116,104 L121,104 L120,110 L115,109 Z" fill={isLocked ? '#4A4060' : '#C9BBFF'} opacity="0.8" />

          {/* Tablet device in right hand */}
          <rect x="130" y="134" width="22" height="16" rx="3" fill="url(#mmScreen)" />
          <rect x="131" y="135" width="20" height="14" rx="2" fill="none" stroke={isLocked ? '#2A2840' : 'rgba(124,92,255,0.5)'} strokeWidth="0.8" />
          {/* Screen content — hash bars */}
          {[0, 1, 2].map((i) => (
            <rect key={i}
              x={133} y={137 + i * 4} width={6 + i * 4} height={2.5} rx={1}
              fill={isLocked ? '#2A2840' : '#7C5CFF'}
              style={{ transformOrigin: `${133}px ${138.25 + i * 4}px`, animation: isActive ? `mnBarFlow ${1.2 + i * 0.3}s ease-in-out infinite ${i * 0.2}s` : undefined }}
            />
          ))}
          {/* Screen glow */}
          {isActive && <rect x="130" y="134" width="22" height="16" rx="3" fill="rgba(124,92,255,0.06)" style={{ animation: 'mnGlowPulse 2s ease-in-out infinite' }} />}

          {/* Neck */}
          <rect x="93" y="76" width="14" height="14" rx="4" fill="url(#mmFaceGrad)" />

          {/* Head */}
          <ellipse cx="100" cy="64" rx="22" ry="20" fill="url(#mmFaceGrad)" />

          {/* Hair — slicked back professional */}
          <path d="M78,60 Q80,40 100,38 Q120,40 122,60 Q110,52 100,53 Q90,52 78,60 Z" fill="#1A1418" />
          {/* Hair highlight */}
          <path d="M83,56 Q92,47 105,48" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeLinecap="round" />

          {/* Ears */}
          <ellipse cx="78"  cy="65" rx="4" ry="5.5" fill="url(#mmFaceGrad)" />
          <ellipse cx="122" cy="65" rx="4" ry="5.5" fill="url(#mmFaceGrad)" />

          {/* Eyes */}
          <ellipse cx="92"  cy="64" rx="4.5" ry="4.2" fill="white" />
          <ellipse cx="108" cy="64" rx="4.5" ry="4.2" fill="white" />
          {/* Irises */}
          <circle cx="93"  cy="65" r="2.8" fill="#2A1E0E"
            style={{ animation: 'mnBlink 4s ease-in-out infinite', transformOrigin: '93px 65px' }} />
          <circle cx="109" cy="65" r="2.8" fill="#2A1E0E"
            style={{ animation: 'mnBlink 4s ease-in-out infinite 0.05s', transformOrigin: '109px 65px' }} />
          {/* Pupils */}
          <circle cx="93.5"  cy="65" r="1.4" fill="#0D0906" />
          <circle cx="109.5" cy="65" r="1.4" fill="#0D0906" />
          {/* Eye shine */}
          <circle cx="94.5"  cy="63.5" r="0.9" fill="white" />
          <circle cx="110.5" cy="63.5" r="0.9" fill="white" />

          {/* Eyebrows */}
          <path d="M87,59 Q92,57 97,59"   fill="none" stroke="#2A1E0E" strokeWidth="2" strokeLinecap="round" />
          <path d="M103,59 Q108,57 113,59" fill="none" stroke="#2A1E0E" strokeWidth="2" strokeLinecap="round" />

          {/* Expression — confident smile when active, neutral when ready/locked */}
          {isActive ? (
            <path d="M90,74 Q100,81 110,74" fill="none" stroke="#9A6A40" strokeWidth="2" strokeLinecap="round" />
          ) : isLocked ? (
            <path d="M92,74 L108,74" fill="none" stroke="#9A6A40" strokeWidth="1.8" strokeLinecap="round" />
          ) : (
            <path d="M91,74 Q100,79 109,74" fill="none" stroke="#9A6A40" strokeWidth="1.8" strokeLinecap="round" />
          )}
          {/* Cheeks */}
          <ellipse cx="84"  cy="71" rx="4" ry="2.5" fill="rgba(210,100,80,0.18)" />
          <ellipse cx="116" cy="71" rx="4" ry="2.5" fill="rgba(210,100,80,0.18)" />

          {/* Status indicator pin on lapel */}
          <circle cx="90" cy="116" r="3.5"
            fill={isLocked ? '#3A3050' : isActive ? '#16D98A' : '#FFB55C'}
            filter={isActive ? 'url(#mmGlow)' : undefined}
            style={{ animation: isActive ? 'mnGlowPulse 1.5s ease-in-out infinite' : undefined }} />
          <circle cx="90" cy="116" r="3.5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
        </g>

        {/* Hash rate bars below figure (active) */}
        {!isLocked && (
          <g transform="translate(56, 176)" className="mn-bar">
            {[
              { w: 16, delay: '0s',    h: 260 },
              { w: 24, delay: '0.15s', h: 280 },
              { w: 12, delay: '0.3s',  h: 250 },
              { w: 20, delay: '0.45s', h: 270 },
              { w: 18, delay: '0.6s',  h: 265 },
            ].map((b, i) => (
              <rect key={i}
                x={i * 18} y={0} width={b.w} height={4} rx={2}
                fill={isActive ? '#7C5CFF' : '#2A2848'}
                style={{
                  transformOrigin: `${i * 18}px 2px`,
                  animation: isActive ? `mnBarFlow ${1 + (i % 3) * 0.25}s ease-in-out infinite ${b.delay}` : undefined,
                  transition: 'fill .4s',
                }}
              />
            ))}
          </g>
        )}

        {/* Lock overlay */}
        {isLocked && (
          <g transform="translate(82, 24)" style={{ animation: 'mnLockPulse 2.5s ease-in-out infinite' }}>
            <rect x="-2" y="0" width="40" height="36" rx="10" fill="rgba(20,18,36,0.85)" stroke="rgba(124,92,255,0.25)" strokeWidth="1" />
            <rect x="9" y="14" width="18" height="16" rx="4" fill="#2A2848" />
            <path d="M10,15 L10,10 Q10,4 18,4 Q26,4 26,10 L26,15" fill="none" stroke="#3A3060" strokeWidth="3" strokeLinecap="round" />
            <rect x="15" y="18" width="6" height="7" rx="1.5" fill="#4A406A" />
            <circle cx="18" cy="21" r="1.5" fill="#7C5CFF" />
          </g>
        )}

        {/* "Hash" label badge (active) */}
        {isActive && (
          <g style={{ animation: 'mnHashFlash 2.4s ease-in-out infinite' }}>
            <rect x="8" y="88" width="36" height="16" rx="5" fill="rgba(124,92,255,0.15)" stroke="rgba(124,92,255,0.3)" strokeWidth="0.8" />
            <text x="26" y="99" fontSize="9" fontWeight="700" fill="#C9BBFF" textAnchor="middle" fontFamily="monospace">HASH</text>
          </g>
        )}
      </svg>

      {/* State label */}
      <div style={{ fontSize: '12px', color: '#6F6B82', fontWeight: 600, textAlign: 'center', maxWidth: '200px', lineHeight: 1.4, marginTop: '-2px' }}>
        {state === 'locked'   && 'Subscribe and deposit to unlock rewards mining'}
        {state === 'ready'    && 'Ready to start your rewards session'}
        {state === 'active'   && `Mining in progress — ${sessionPct.toFixed(1)}% of session`}
        {state === 'paused'   && 'Session paused'}
        {state === 'complete' && 'Session complete!'}
      </div>
    </div>
  );
}
