'use client';
import { useEffect, useRef } from 'react';

export type MascotState = 'locked' | 'ready' | 'active' | 'paused' | 'complete';

interface MiningMascotProps {
  state: MascotState;
  sessionPct?: number;
  pendingRewardUsd?: string;
}

// ── canvas dimensions ────────────────────────────────────────────────────────
const W = 440, H = 320;

// ── character world position (body pivot = shoulder height) ──────────────────
const CHAR_X = 148, CHAR_Y = 175;

// ── arm geometry (shoulder pivot in char-local space) ───────────────────────
// verified: at IMPACT_ANGLE the pickaxe tip hits the rock at (ROCK_X, ROCK_Y)
const SHOULDER_LX = 22, SHOULDER_LY = 0;
const ARM_UPPER = 24, ARM_FORE = 20, HANDLE_LEN = 80, PICK_REACH = 32;
const IMPACT_ANGLE = 0.93;

// ── rock (target) position ──────────────────────────────────────────────────
const ROCK_X = 295, ROCK_Y = 262, ROCK_BASE_Y = 285;

// ── EQ visualiser data ───────────────────────────────────────────────────────
const EQ_L = [
  { mh: 52, ph: 0.0,  sp: 0.0031 },
  { mh: 74, ph: 1.2,  sp: 0.0042 },
  { mh: 62, ph: 0.7,  sp: 0.0037 },
  { mh: 80, ph: 2.1,  sp: 0.0029 },
  { mh: 58, ph: 0.3,  sp: 0.0045 },
];
const EQ_R = [
  { mh: 68, ph: 1.5, sp: 0.0038 },
  { mh: 50, ph: 0.4, sp: 0.0033 },
  { mh: 80, ph: 2.8, sp: 0.0041 },
  { mh: 65, ph: 1.0, sp: 0.0035 },
  { mh: 76, ph: 0.6, sp: 0.0043 },
];

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function eio(t: number)  { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// rounded-rect path helper (supports uniform radius)
function rr(
  c: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const rad = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rad, y);
  c.lineTo(x + w - rad, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rad);
  c.lineTo(x + w, y + h - rad);
  c.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  c.lineTo(x + rad, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rad);
  c.lineTo(x, y + rad);
  c.quadraticCurveTo(x, y, x + rad, y);
  c.closePath();
}

export default function MiningMascot({ state, sessionPct = 0 }: MiningMascotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const stateRef  = useRef(state);
  const pctRef    = useRef(sessionPct);

  useEffect(() => { stateRef.current = state; },      [state]);
  useEffect(() => { pctRef.current   = sessionPct; }, [sessionPct]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const c = ctx;
    canvas.width = W; canvas.height = H;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── mutable animation state ──────────────────────────────────────────────
    let t = 0, lastNow = 0;
    let shakeX = 0, shakeY = 0;
    let rockFlash = 0;
    let lastImpactT = -9999;

    type Pt = {
      x: number; y: number; vx: number; vy: number;
      r: number; alpha: number; life: number; maxLife: number; color: string;
    };
    const sparks:   Pt[] = [];
    const frags:    Pt[] = [];
    const dust:     Pt[] = [];
    const confetti: Pt[] = [];
    let confettiDone = false;

    // seed ambient dust
    for (let i = 0; i < 22; i++) {
      dust.push({
        x: 60 + Math.random() * 320, y: 80 + Math.random() * 200,
        vx: (Math.random() - 0.5) * 0.25, vy: -0.08 - Math.random() * 0.14,
        r: 0.6 + Math.random() * 1.4, alpha: 0.08 + Math.random() * 0.18,
        life: Math.random() * 200, maxLife: 140 + Math.random() * 160, color: '',
      });
    }

    // ── particle spawners ────────────────────────────────────────────────────
    function spawnSparks() {
      const cols = ['#FFD700', '#F5B642', '#FF8C00', '#FFE040', '#9B7BFF', '#C9BBFF', '#FFA040'];
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1.8 + Math.random() * 5;
        sparks.push({
          x: ROCK_X, y: ROCK_Y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3,
          r: 1 + Math.random() * 2.5, alpha: 1, life: 0,
          maxLife: 18 + Math.random() * 22,
          color: cols[Math.floor(Math.random() * cols.length)],
        });
      }
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        const sp = 0.8 + Math.random() * 2.2;
        frags.push({
          x: ROCK_X, y: ROCK_Y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2,
          r: 2 + Math.random() * 4.5, alpha: 1, life: 0,
          maxLife: 25 + Math.random() * 30,
          color: Math.random() > 0.5 ? '#F5B642' : '#9B7BFF',
        });
      }
    }

    function spawnConfetti() {
      const cols = ['#9B7BFF', '#6E8BFF', '#27D980', '#F5B642', '#C9BBFF', '#FF6B8A'];
      for (let i = 0; i < 55; i++) {
        confetti.push({
          x: W / 2 + (Math.random() - 0.5) * 80, y: 55,
          vx: (Math.random() - 0.5) * 5.5, vy: -3.5 - Math.random() * 5,
          r: 3 + Math.random() * 5, alpha: 1, life: 0,
          maxLife: 70 + Math.random() * 65,
          color: cols[Math.floor(Math.random() * cols.length)],
        });
      }
    }

    // ── background ───────────────────────────────────────────────────────────
    function drawBG(isLocked: boolean) {
      const bg = c.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, isLocked ? '#06050F' : '#090716');
      bg.addColorStop(1, isLocked ? '#0A0818' : '#0B0A14');
      c.fillStyle = bg; c.fillRect(0, 0, W, H);

      // Gold + purple ambient glow near rock
      if (!isLocked) {
        const goldGlow = c.createRadialGradient(ROCK_X, ROCK_Y - 20, 0, ROCK_X, ROCK_Y - 20, 130);
        const gi = 0.05 + Math.sin(t * 0.0013) * 0.02 + rockFlash * 0.07;
        goldGlow.addColorStop(0,   `rgba(245,182,66,${gi})`);
        goldGlow.addColorStop(0.4, `rgba(155,123,255,${gi * 0.4})`);
        goldGlow.addColorStop(1,   'transparent');
        c.fillStyle = goldGlow; c.fillRect(0, 0, W, H);
      }

      // Left cave wall
      c.fillStyle = '#08061A';
      c.beginPath(); c.moveTo(0, 0); c.lineTo(58, 0);
      c.bezierCurveTo(48, 45, 28, 90, 42, 140);
      c.bezierCurveTo(52, 190, 32, 235, 48, H);
      c.lineTo(0, H); c.closePath(); c.fill();

      // Right cave wall
      c.fillStyle = '#07051A';
      c.beginPath(); c.moveTo(W, 0); c.lineTo(382, 0);
      c.bezierCurveTo(398, 55, 418, 110, 402, 165);
      c.bezierCurveTo(412, 215, 398, 265, 408, H);
      c.lineTo(W, H); c.closePath(); c.fill();

      // Ground plane
      c.fillStyle = '#0A0818';
      c.fillRect(48, 255, 344, H - 255);
      c.strokeStyle = 'rgba(155,123,255,0.08)';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(48, 255); c.lineTo(392, 255); c.stroke();

      // Foreground ledge
      c.fillStyle = '#060514';
      c.beginPath(); c.moveTo(0, H);
      c.lineTo(0, 288); c.bezierCurveTo(80, 282, 160, 294, 240, 288);
      c.bezierCurveTo(300, 283, 360, 291, W, 286);
      c.lineTo(W, H); c.closePath(); c.fill();

      // Subtle wall cracks
      c.strokeStyle = 'rgba(155,123,255,0.04)'; c.lineWidth = 0.6;
      [[65, 22, 55, 62], [55, 62, 68, 98], [390, 40, 403, 82], [403, 82, 396, 118]].forEach(([x1, y1, x2, y2]) => {
        c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      });
    }

    // ── cave vein decorations ────────────────────────────────────────────────
    function drawVeins(isActive: boolean) {
      const p = Math.sin(t * 0.0014) * 0.5 + 0.5;
      const veins = [
        { x1: 22, y1: 55, cx: 48, cy: 95, x2: 75, y2: 130 },
        { x1: 390, y1: 30, cx: 412, cy: 85, x2: 420, y2: 118 },
        { x1: 14, y1: 195, cx: 42, cy: 250, x2: 58, y2: 275 },
      ];
      c.lineWidth = 1.2;
      for (const v of veins) {
        c.strokeStyle = `rgba(110,139,255,${0.10 + p * 0.07})`;
        c.beginPath(); c.moveTo(v.x1, v.y1);
        c.quadraticCurveTo(v.cx, v.cy, v.x2, v.y2); c.stroke();
        c.save(); c.shadowBlur = 6; c.shadowColor = '#6E8BFF';
        c.fillStyle = `rgba(155,123,255,${0.28 + p * 0.18})`;
        c.beginPath(); c.arc(v.x2, v.y2, 2.5, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      if (isActive) {
        const sy = (t * 0.048) % H;
        const sg = c.createLinearGradient(0, sy - 5, 0, sy + 5);
        sg.addColorStop(0, 'transparent');
        sg.addColorStop(0.5, 'rgba(110,139,255,0.055)');
        sg.addColorStop(1, 'transparent');
        c.fillStyle = sg; c.fillRect(0, sy - 5, W, 10);
      }
    }

    // ── gold-ore rock ────────────────────────────────────────────────────────
    function drawRock(isLocked: boolean) {
      const rx = ROCK_X, by = ROCK_BASE_Y;
      const p  = Math.sin(t * 0.0018) * 0.5 + 0.5;
      const fl = rockFlash;

      // Gold ambient glow under rock
      if (!isLocked) {
        const ag = c.createRadialGradient(rx, by - 25, 0, rx, by - 25, 65);
        ag.addColorStop(0, `rgba(245,182,66,${0.10 + p * 0.06 + fl * 0.22})`);
        ag.addColorStop(1, 'transparent');
        c.fillStyle = ag; c.beginPath(); c.arc(rx, by - 25, 65, 0, Math.PI * 2); c.fill();
      }

      // Rock shadow
      c.save(); c.globalAlpha = 0.28;
      c.fillStyle = '#000';
      c.beginPath(); c.ellipse(rx, by + 2, 38, 8, 0, 0, Math.PI * 2); c.fill();
      c.restore();

      // Main rock body — irregular polygon
      c.fillStyle = isLocked ? '#1A1208' : '#2A1E0C';
      c.strokeStyle = isLocked ? '#281E0E' : '#3D2A14'; c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(rx - 35, by);
      c.lineTo(rx - 42, by - 16);
      c.lineTo(rx - 36, by - 34);
      c.lineTo(rx - 20, by - 46);
      c.lineTo(rx + 5,  by - 52);
      c.lineTo(rx + 28, by - 44);
      c.lineTo(rx + 38, by - 26);
      c.lineTo(rx + 32, by - 8);
      c.lineTo(rx + 30, by);
      c.closePath();
      c.fill(); c.stroke();

      // Rock facets for depth
      c.fillStyle = isLocked ? '#1E1608' : '#3D2A14';
      c.beginPath();
      c.moveTo(rx - 20, by - 46); c.lineTo(rx + 5, by - 52);
      c.lineTo(rx + 2,  by - 38); c.lineTo(rx - 18, by - 35);
      c.closePath(); c.fill();

      c.fillStyle = isLocked ? '#120E06' : '#221508';
      c.beginPath();
      c.moveTo(rx + 28, by - 44); c.lineTo(rx + 38, by - 26);
      c.lineTo(rx + 22, by - 28); c.lineTo(rx + 14, by - 40);
      c.closePath(); c.fill();

      // Rock cracks
      c.strokeStyle = isLocked ? '#100C05' : '#1A1008'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(rx - 10, by - 15); c.lineTo(rx + 5, by - 30); c.stroke();
      c.beginPath(); c.moveTo(rx + 8, by - 18); c.lineTo(rx + 18, by - 8); c.stroke();
      c.beginPath(); c.moveTo(rx - 8, by - 38); c.lineTo(rx + 2, by - 28); c.stroke();

      // Gold nuggets embedded in rock
      const nuggets = [
        { x: rx - 10, y: by - 30, rx: 8,   ry: 6,   rot: -0.3 },
        { x: rx + 10, y: by - 42, rx: 6,   ry: 5,   rot:  0.4 },
        { x: rx - 22, y: by - 20, rx: 5,   ry: 4,   rot: -0.5 },
        { x: rx + 20, y: by - 18, rx: 4.5, ry: 3.5, rot:  0.2 },
      ];

      for (const n of nuggets) {
        c.save();
        if (!isLocked) {
          c.shadowBlur  = 10 + p * 6 + fl * 20;
          c.shadowColor = '#F5B642';
        }
        const gg = c.createRadialGradient(
          n.x - n.rx * 0.3, n.y - n.ry * 0.35, 0,
          n.x, n.y, Math.max(n.rx, n.ry),
        );
        if (isLocked) {
          gg.addColorStop(0, '#5A4010'); gg.addColorStop(1, '#2A1E08');
        } else {
          gg.addColorStop(0, fl > 0.3 ? '#FFFAAA' : '#FFE040');
          gg.addColorStop(0.5, '#F5B642');
          gg.addColorStop(1, '#8B5A10');
        }
        c.fillStyle = gg;
        c.save(); c.translate(n.x, n.y); c.rotate(n.rot);
        c.beginPath(); c.ellipse(0, 0, n.rx, n.ry, 0, 0, Math.PI * 2); c.fill();
        c.restore();

        if (!isLocked) {
          c.fillStyle = `rgba(255,255,255,${0.42 + fl * 0.35})`;
          c.beginPath();
          c.ellipse(n.x - n.rx * 0.3, n.y - n.ry * 0.35, n.rx * 0.3, n.ry * 0.25, 0, 0, Math.PI * 2);
          c.fill();
        }
        c.restore();
      }

      // Impact flash ring
      if (fl > 0.05) {
        c.save(); c.globalAlpha = fl * 0.72;
        c.strokeStyle = '#FFE040'; c.lineWidth = 2.5;
        c.shadowBlur = 20; c.shadowColor = '#F5B642';
        const fr = (1 - fl) * 50;
        c.beginPath(); c.arc(rx, by - 28, fr, 0, Math.PI * 2); c.stroke();
        c.restore();
      }
    }

    // ── character drawing helpers ────────────────────────────────────────────
    // All helpers draw in char-local space (origin = CHAR_X, CHAR_Y after translate)

    function drawLegs(isLocked: boolean, legSwing: number) {
      const ov  = isLocked ? '#1A2A5A' : '#2854C5';
      const ovD = isLocked ? '#0F1A38' : '#1A3A9B';
      const bt  = isLocked ? '#1A100A' : '#5C3318';
      const btS = isLocked ? '#281808' : '#7A4422';

      for (const [sx, tx] of [[-12, -10 - legSwing], [12, 10 + legSwing]] as [number, number][]) {
        // Thigh
        c.fillStyle = ov; c.strokeStyle = isLocked ? '#223260' : '#3A6AE0'; c.lineWidth = 1;
        rr(c, sx - 8, 42, 16, 22, 4); c.fill(); c.stroke();
        // Knee
        c.fillStyle = ovD; rr(c, sx - 7, 58, 14, 7, 3); c.fill();
        // Shin
        c.fillStyle = ov; rr(c, tx - 7, 64, 14, 20, 3); c.fill(); c.stroke();
        // Boot
        c.fillStyle = bt; c.strokeStyle = btS; c.lineWidth = 1;
        c.beginPath();
        c.moveTo(tx - 9, 84); c.lineTo(tx + 9, 84);
        c.lineTo(tx + 12, 94); c.lineTo(tx - 9, 94);
        c.closePath(); c.fill(); c.stroke();
        // Boot toe shine
        if (!isLocked) {
          c.fillStyle = 'rgba(255,255,255,0.09)';
          c.beginPath(); c.ellipse(tx + 5, 86, 4, 3, 0.3, 0, Math.PI * 2); c.fill();
        }
      }
    }

    function drawTorso(isLocked: boolean, isActive: boolean) {
      const ov   = isLocked ? '#1A2A5A' : '#2854C5';
      const ovD  = isLocked ? '#0F1A38' : '#1A3A9B';
      const strap = isLocked ? '#142248' : '#1E3FAA';
      const shrt = isLocked ? '#2A2444' : '#D8D4F0';
      const belt = isLocked ? '#14102A' : '#4A2808';

      // Back straps (overalls braces)
      c.fillStyle = strap;
      rr(c, -18, -42, 9, 72, 3); c.fill();
      rr(c,   9, -42, 9, 72, 3); c.fill();

      // Shirt collar / visible shirt area
      c.fillStyle = shrt;
      rr(c, -20, -44, 40, 22, 4); c.fill();

      // Main overalls body
      c.fillStyle = ov; c.strokeStyle = isLocked ? '#22326A' : '#3A6AE0'; c.lineWidth = 1.2;
      rr(c, -24, -32, 48, 74, 5); c.fill(); c.stroke();

      // Bib (front panel)
      c.fillStyle = ovD;
      rr(c, -16, -30, 32, 36, 4); c.fill();

      // Shoulder strap ends visible above bib
      c.fillStyle = strap;
      rr(c, -16, -44, 10, 16, 2); c.fill();
      rr(c,   6, -44, 10, 16, 2); c.fill();

      // Bib buckle clips
      c.fillStyle = isLocked ? '#303060' : '#B8C8D8';
      rr(c, -16, -34, 5, 5, 1); c.fill();
      rr(c,  11, -34, 5, 5, 1); c.fill();

      // Pocket on bib
      c.strokeStyle = isLocked ? '#1E2E6A' : '#3A6AE0'; c.lineWidth = 0.8;
      rr(c, 3, -14, 11, 11, 2); c.stroke();

      // Chest glow strip (Etheon power indicator)
      const gp = isActive ? (Math.sin(t * 0.00449) * 0.5 + 0.5) : 0.4;
      c.save();
      c.shadowBlur = isActive ? 14 : 3; c.shadowColor = '#9B7BFF';
      c.fillStyle = `rgba(155,123,255,${isLocked ? 0.08 : 0.35 + gp * 0.28})`;
      rr(c, -3, -20, 6, 20, 3); c.fill();
      c.restore();

      // Status LED
      c.save();
      c.shadowBlur = isActive ? 10 : 0; c.shadowColor = '#16D98A';
      c.fillStyle = isLocked ? '#2A2848' : isActive ? '#16D98A' : '#9B7BFF';
      c.beginPath(); c.arc(-9, -5, 3.5, 0, Math.PI * 2); c.fill();
      c.restore();

      // Belt
      c.fillStyle = belt; c.strokeStyle = isLocked ? '#1E1430' : '#6B3A0E'; c.lineWidth = 1;
      rr(c, -24, 38, 48, 8, 2); c.fill(); c.stroke();
      // Belt buckle
      c.fillStyle = isLocked ? '#303060' : '#B8C8D8';
      rr(c, -6, 39, 12, 6, 1.5); c.fill();
    }

    function drawLeftArm(swing: number, isLocked: boolean) {
      c.save();
      c.translate(-22, -22); c.rotate(-0.18 + swing);
      const ov   = isLocked ? '#1A2A5A' : '#2854C5';
      const skin = isLocked ? '#5A3A22' : '#F0B07A';
      const skinD = isLocked ? '#3A2210' : '#C87A40';
      c.fillStyle = ov; c.strokeStyle = isLocked ? '#22326A' : '#3A6AE0'; c.lineWidth = 1;
      // Sleeve (upper arm)
      rr(c, -6, 0, 13, 24, 4); c.fill(); c.stroke();
      // Forearm (skin)
      c.fillStyle = skin;
      rr(c, -5, 22, 11, 18, 3); c.fill();
      // Hand
      c.fillStyle = skin; c.strokeStyle = skinD; c.lineWidth = 0.8;
      c.beginPath(); c.ellipse(0, 42, 7, 5.5, 0.1, 0, Math.PI * 2); c.fill(); c.stroke();
      c.restore();
    }

    function drawRightArm(phase: number, animate: boolean, isLocked: boolean) {
      let ang: number;
      if (!animate) {
        ang = -1.2;
      } else {
        const isPaused = stateRef.current === 'paused';
        const p = phase;
        if      (p < 0.30) ang = lerp(-1.40, IMPACT_ANGLE, eio(p / 0.30));
        else if (p < 0.44) ang = lerp(IMPACT_ANGLE, 0.62, (p - 0.30) / 0.14);
        else if (p < 0.62) ang = lerp(0.62, 0.70, (p - 0.44) / 0.18);
        else               ang = lerp(0.70, -1.40, eio((p - 0.62) / 0.38));
        if (isPaused) ang = lerp(ang, -0.8, 0.5);
      }

      c.save();
      c.translate(SHOULDER_LX, SHOULDER_LY); c.rotate(ang);

      const ov    = isLocked ? '#1A2A5A' : '#2854C5';
      const ovD   = isLocked ? '#0F1A38' : '#1A3A9B';
      const skin  = isLocked ? '#5A3A22' : '#F0B07A';
      const skinD = isLocked ? '#3A2210' : '#C87A40';

      // Sleeve (upper arm)
      c.fillStyle = ov; c.strokeStyle = isLocked ? '#22326A' : '#3A6AE0'; c.lineWidth = 1;
      rr(c, -7, 0, 14, ARM_UPPER + 2, 4); c.fill(); c.stroke();
      // Elbow pad
      c.fillStyle = ovD;
      c.beginPath(); c.arc(0, ARM_UPPER + 1, 7, 0, Math.PI * 2); c.fill();
      // Forearm (skin)
      c.fillStyle = skin;
      rr(c, -5, ARM_UPPER, 10, ARM_FORE + 2, 3); c.fill();
      // Hand
      c.fillStyle = skin; c.strokeStyle = skinD; c.lineWidth = 0.8;
      c.beginPath(); c.ellipse(0, ARM_UPPER + ARM_FORE + 3, 7, 5.5, 0, 0, Math.PI * 2); c.fill(); c.stroke();

      // Wooden handle
      c.save();
      c.strokeStyle = isLocked ? '#3A2808' : '#7B5A28'; c.lineWidth = 5.5; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(0, ARM_UPPER + ARM_FORE + 1);
      c.lineTo(4, ARM_UPPER + ARM_FORE + 1 + HANDLE_LEN);
      c.stroke();
      // Wood grain
      if (!isLocked) {
        c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 0.9;
        for (let i = 0; i < 3; i++) {
          const hy = ARM_UPPER + ARM_FORE + 12 + i * 22;
          c.beginPath(); c.moveTo(-1.5, hy); c.lineTo(3.5, hy + 6); c.stroke();
        }
      }
      c.restore();

      // Pickaxe head
      c.save();
      c.translate(4, ARM_UPPER + ARM_FORE + 1 + HANDLE_LEN); c.rotate(0.32);
      if (!isLocked) { c.shadowBlur = 9; c.shadowColor = 'rgba(185,205,225,0.65)'; }

      // Shaft
      c.fillStyle = isLocked ? '#505568' : '#8898B0';
      rr(c, -22, -6, 44, 12, 3); c.fill();

      // Blunt end
      c.fillStyle = isLocked ? '#505060' : '#6A7888';
      c.beginPath();
      c.moveTo(-22, -6); c.lineTo(-37, -4); c.lineTo(-37, 4); c.lineTo(-22, 6); c.closePath(); c.fill();

      // Sharp tip — impacts rock
      c.fillStyle = isLocked ? '#707080' : '#C0CED8';
      c.beginPath();
      c.moveTo(22, -6); c.lineTo(PICK_REACH + 10, -10);
      c.lineTo(PICK_REACH + 14, 0); c.lineTo(PICK_REACH + 10, 10); c.lineTo(22, 6);
      c.closePath(); c.fill();

      // Edge highlight
      c.strokeStyle = 'rgba(255,255,255,0.52)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(22, -6); c.lineTo(PICK_REACH + 10, -10); c.stroke();

      c.shadowBlur = 0;
      c.restore(); // pickaxe head
      c.restore(); // arm pivot
    }

    function drawHead(isLocked: boolean, isActive: boolean) {
      const skin  = isLocked ? '#4A2818' : '#F0B07A';
      const skinD = isLocked ? '#3A1E10' : '#D4855A';
      const eyeC  = '#1A1428';

      // Ears
      c.fillStyle = skin; c.strokeStyle = isLocked ? '#3A2010' : skinD; c.lineWidth = 1;
      c.beginPath(); c.ellipse(-26, -65, 8, 10, 0.2, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.ellipse( 26, -65, 8, 10,-0.2, 0, Math.PI * 2); c.fill(); c.stroke();

      // Head dome
      c.fillStyle = skin; c.strokeStyle = skinD; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(0, -68, 28, 30, 0, 0, Math.PI * 2); c.fill(); c.stroke();

      // Chin shading
      c.fillStyle = skinD;
      c.beginPath(); c.ellipse(0, -47, 20, 8, 0, 0, Math.PI * 2); c.fill();

      // Eyebrows
      const browA = isActive ? -0.18 : 0;
      c.strokeStyle = isLocked ? '#2A1408' : '#7A4820'; c.lineWidth = 2.2; c.lineCap = 'round';
      c.save(); c.translate(-9, -78); c.rotate( browA);
      c.beginPath(); c.moveTo(-5, 0); c.lineTo(5, 0); c.stroke(); c.restore();
      c.save(); c.translate( 9, -78); c.rotate(-browA);
      c.beginPath(); c.moveTo(-5, 0); c.lineTo(5, 0); c.stroke(); c.restore();

      // Eyes — with occasional blink
      const blinkPhase = t % 4500;
      const isBlinking = isActive && blinkPhase < 140;
      c.fillStyle = eyeC;
      if (isBlinking) {
        c.strokeStyle = eyeC; c.lineWidth = 2.2;
        c.beginPath(); c.moveTo(-13, -70); c.lineTo(-5, -70); c.stroke();
        c.beginPath(); c.moveTo(5, -70); c.lineTo(13, -70); c.stroke();
      } else {
        c.beginPath(); c.ellipse(-9, -70, 5, 6.5, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse( 9, -70, 5, 6.5, 0, 0, Math.PI * 2); c.fill();
        if (!isLocked) {
          c.fillStyle = 'rgba(255,255,255,0.75)';
          c.beginPath(); c.ellipse(-11, -72.5, 1.5, 1.8, 0, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.ellipse(  7, -72.5, 1.5, 1.8, 0, 0, Math.PI * 2); c.fill();
        }
      }

      // Rosy cheeks
      if (!isLocked) {
        c.fillStyle = 'rgba(255,110,70,0.15)';
        c.beginPath(); c.ellipse(-17, -60, 7, 5.5, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse( 17, -60, 7, 5.5, 0, 0, Math.PI * 2); c.fill();
      }

      // Mouth
      c.strokeStyle = isLocked ? '#2A1408' : '#C85840'; c.lineWidth = 1.6; c.lineCap = 'round';
      c.beginPath();
      if (isLocked) {
        c.arc(0, -56, 7, 0.25, Math.PI - 0.25);        // neutral / slight frown
      } else if (isActive) {
        c.arc(0, -59, 6, 0.1, Math.PI - 0.1, false);   // determined smile
      } else {
        c.arc(0, -61, 5.5, 0.2, Math.PI - 0.2, false); // relaxed smile
      }
      c.stroke();

      // Neck
      c.fillStyle = skin;
      rr(c, -5.5, -40, 11, 13, 2); c.fill();
    }

    function drawHardHat(isLocked: boolean, isActive: boolean) {
      const p    = isActive ? (Math.sin(t * 0.00449) * 0.5 + 0.5) : 0.5;
      const hatY = isLocked ? '#7A6800' : '#F5C200';
      const hatD = isLocked ? '#4A3E00' : '#CC9900';
      const hatR = isLocked ? '#3A3000' : '#AA7A00';

      // Brim
      c.fillStyle = hatD; c.strokeStyle = hatR; c.lineWidth = 1;
      c.beginPath(); c.ellipse(0, -90, 33, 6, 0, 0, Math.PI * 2); c.fill(); c.stroke();

      // Dome glow halo
      if (!isLocked) {
        c.save(); c.shadowBlur = 14 + p * 8; c.shadowColor = 'rgba(245,194,0,0.38)';
        c.fillStyle = 'transparent';
        c.beginPath(); c.ellipse(0, -105, 30, 22, 0, 0, Math.PI * 2); c.fill();
        c.restore();
      }

      // Dome
      const hg = c.createLinearGradient(-29, -124, 29, -90);
      hg.addColorStop(0, isLocked ? '#C0A000' : '#FFE840');
      hg.addColorStop(0.5, hatY);
      hg.addColorStop(1, hatD);
      c.fillStyle = hg; c.strokeStyle = hatR; c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(-29, -92);
      c.bezierCurveTo(-32, -122, 32, -122, 29, -92);
      c.closePath(); c.fill(); c.stroke();

      // Hat band
      c.fillStyle = isLocked ? '#2A2000' : '#6B3A08';
      rr(c, -27, -98, 54, 7, 2); c.fill();

      // Etheon logo dot on hat
      c.save();
      c.shadowBlur = isActive ? 10 : 3; c.shadowColor = '#9B7BFF';
      c.fillStyle = isLocked ? '#1E1A38' : '#9B7BFF';
      c.beginPath(); c.arc(0, -108, 4.5, 0, Math.PI * 2); c.fill();
      c.restore();

      // Headlamp
      c.save();
      c.shadowBlur  = isActive ? 22 + p * 12 : 4; c.shadowColor = '#FFD700';
      const lg = c.createRadialGradient(-2, -95, 0, -2, -95, 6.5);
      lg.addColorStop(0, '#FFFFFF');
      lg.addColorStop(0.4, '#FFEE66');
      lg.addColorStop(1, isActive ? '#FFB800' : '#664400');
      c.fillStyle = lg;
      c.beginPath(); c.arc(-2, -95, 6.5, 0, Math.PI * 2); c.fill();
      c.restore();

      // Lamp cone (active only)
      if (isActive) {
        c.save();
        const cone = c.createLinearGradient(-2, -88, 50, 25);
        cone.addColorStop(0, `rgba(255,220,80,${0.07 + p * 0.04})`);
        cone.addColorStop(1, 'rgba(255,220,80,0)');
        c.fillStyle = cone;
        c.beginPath(); c.moveTo(-2, -88); c.lineTo(-30, 30); c.lineTo(62, 30); c.lineTo(38, -88); c.closePath();
        c.fill(); c.restore();
      }

      // Lock overlay
      if (isLocked) {
        c.save(); c.globalAlpha = 0.87;
        c.fillStyle = 'rgba(11,10,20,0.76)';
        rr(c, -14, -122, 28, 28, 5); c.fill();
        c.strokeStyle = 'rgba(155,123,255,0.42)'; c.lineWidth = 1.2;
        rr(c, -14, -122, 28, 28, 5); c.stroke();
        c.strokeStyle = '#3A3060'; c.lineWidth = 2.4;
        c.beginPath(); c.moveTo(-5.5, -108); c.lineTo(-5.5, -114);
        c.arc(0, -114, 5.5, Math.PI, 0); c.lineTo(5.5, -108); c.stroke();
        c.fillStyle = '#1E1A38'; c.strokeStyle = '#9B7BFF'; c.lineWidth = 1.1;
        rr(c, -7, -108, 14, 13, 2.5); c.fill(); c.stroke();
        c.fillStyle = '#9B7BFF';
        c.beginPath(); c.arc(0, -102, 2.8, 0, Math.PI * 2); c.fill();
        rr(c, -1.2, -101, 2.4, 4.5, 1.2); c.fill();
        c.restore();
      }
    }

    // ── full character ───────────────────────────────────────────────────────
    function drawCharacter(isLocked: boolean, swingPhase: number, isActive: boolean) {
      const bob   = isActive ? Math.sin(t * 0.00449) * 2.5 : 0;
      const twist = isActive ? Math.sin(swingPhase * Math.PI * 2) * 0.03 : 0;

      c.save();
      c.translate(CHAR_X, CHAR_Y + bob); c.rotate(twist);
      c.globalAlpha = isLocked ? 0.38 : 1;

      // Ground shadow
      c.save(); c.globalAlpha = isLocked ? 0.08 : 0.18;
      c.fillStyle = '#000';
      c.beginPath(); c.ellipse(0, 88, 36, 8, 0, 0, Math.PI * 2); c.fill();
      c.restore();

      const legSwing = isActive ? Math.sin(swingPhase * Math.PI * 2) * 3 : 0;
      const leftSwing = isActive ? Math.sin(swingPhase * Math.PI * 2 + Math.PI) * 0.12 : 0;

      drawLegs(isLocked, legSwing);
      drawLeftArm(leftSwing, isLocked);
      drawTorso(isLocked, isActive);
      drawRightArm(swingPhase, isActive || stateRef.current === 'paused', isLocked);
      drawHead(isLocked, isActive);
      drawHardHat(isLocked, isActive);

      c.restore();
    }

    // ── EQ visualiser ────────────────────────────────────────────────────────
    function drawEQ(isLocked: boolean, isActive: boolean, isReady: boolean) {
      const BOTTOM = 222, BW = 7, GAP = 4;
      const ao = isLocked ? 0.14 : isActive ? 0.88 : 0.38;

      for (let i = 0; i < EQ_L.length; i++) {
        const b  = EQ_L[i];
        const bh = isActive ? b.mh * (Math.sin(t * b.sp + b.ph) * 0.42 + 0.58)
                 : isReady  ? b.mh * (Math.sin(t * b.sp * 0.3 + b.ph) * 0.15 + 0.22)
                 : b.mh * 0.18;
        const bx = 55 + i * (BW + GAP), by = BOTTOM - bh;
        const bg = c.createLinearGradient(bx, BOTTOM, bx, by);
        bg.addColorStop(0, `rgba(155,123,255,${ao})`);
        bg.addColorStop(1, `rgba(110,139,255,${ao * 0.45})`);
        c.save(); c.shadowBlur = isActive ? 10 : 0; c.shadowColor = '#9B7BFF';
        c.fillStyle = bg; rr(c, bx, by, BW, bh, 3); c.fill();
        c.restore();
      }
      for (let i = 0; i < EQ_R.length; i++) {
        const b  = EQ_R[i];
        const bh = isActive ? b.mh * (Math.sin(t * b.sp + b.ph) * 0.42 + 0.58)
                 : isReady  ? b.mh * (Math.sin(t * b.sp * 0.3 + b.ph) * 0.15 + 0.22)
                 : b.mh * 0.18;
        const bx = 346 + i * (BW + GAP), by = BOTTOM - bh;
        const bg = c.createLinearGradient(bx, BOTTOM, bx, by);
        bg.addColorStop(0, `rgba(110,139,255,${ao})`);
        bg.addColorStop(1, `rgba(155,123,255,${ao * 0.45})`);
        c.save(); c.shadowBlur = isActive ? 10 : 0; c.shadowColor = '#6E8BFF';
        c.fillStyle = bg; rr(c, bx, by, BW, bh, 3); c.fill();
        c.restore();
      }
    }

    // ── particles ────────────────────────────────────────────────────────────
    function drawParticles() {
      for (const s of sparks) {
        c.save(); c.globalAlpha = s.alpha;
        c.shadowBlur = 7; c.shadowColor = s.color; c.fillStyle = s.color;
        c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      for (const f of frags) {
        c.save(); c.globalAlpha = f.alpha; c.translate(f.x, f.y); c.rotate(f.life * 0.12);
        c.shadowBlur = 10; c.shadowColor = f.color;
        const fg = c.createLinearGradient(-f.r, -f.r, f.r, f.r);
        fg.addColorStop(0, f.color === '#F5B642' ? '#FFE080' : '#D0C4FF');
        fg.addColorStop(1, f.color === '#F5B642' ? '#8B5A10' : '#6048B0');
        c.fillStyle = fg;
        c.beginPath(); c.moveTo(0, -f.r); c.lineTo(f.r * 0.6, f.r * 0.5); c.lineTo(-f.r * 0.6, f.r * 0.5); c.closePath();
        c.fill(); c.restore();
      }
      const isActive = stateRef.current === 'active';
      for (const d of dust) {
        if (d.y < 50 || d.y > 268) continue;
        c.save(); c.globalAlpha = d.alpha * (isActive ? 1 : 0.38);
        c.fillStyle = 'rgba(175,158,255,1)';
        c.beginPath(); c.arc(d.x, d.y, d.r, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      for (const co of confetti) {
        c.save(); c.globalAlpha = co.alpha; c.translate(co.x, co.y); c.rotate(co.life * 0.08);
        c.shadowBlur = 4; c.shadowColor = co.color; c.fillStyle = co.color;
        c.fillRect(-co.r / 2, -co.r / 4, co.r, co.r / 2); c.restore();
      }
    }

    // ── HUD / progress ───────────────────────────────────────────────────────
    function drawHUD(isActive: boolean, isPaused: boolean, isComplete: boolean) {
      const pct = pctRef.current;
      if (isActive) {
        c.save(); c.globalAlpha = 0.72;
        c.font = '700 9px monospace'; c.fillStyle = '#9B7BFF';
        c.fillText('MINING ACTIVE', 65, 26);
        c.font = '700 8px monospace'; c.fillStyle = '#6E8BFF';
        c.fillText(`PROGRESS ${pct.toFixed(1)}%`, 65, 38);
        c.restore();
      }
      if (isPaused) {
        c.save(); c.globalAlpha = 0.65; c.textAlign = 'center';
        c.font = '700 10px monospace'; c.fillStyle = '#F5B642';
        c.fillText('SESSION PAUSED', W / 2, 30); c.restore();
      }
      if (isComplete) {
        c.save();
        c.shadowBlur = 20; c.shadowColor = '#27D980';
        c.strokeStyle = 'rgba(39,217,128,0.7)'; c.lineWidth = 1.5;
        rr(c, W / 2 - 72, 12, 144, 34, 9); c.stroke();
        c.fillStyle = 'rgba(39,217,128,0.12)';
        rr(c, W / 2 - 72, 12, 144, 34, 9); c.fill();
        c.shadowBlur = 0; c.font = '700 11px monospace'; c.fillStyle = '#27D980';
        c.textAlign = 'center'; c.fillText('SESSION COMPLETE', W / 2, 35);
        c.restore();
      }
      if (isActive || isPaused || isComplete) {
        const bx = 65, by = H - 26, bw = 312;
        c.fillStyle = 'rgba(28,22,55,0.85)';
        rr(c, bx, by, bw, 5, 2.5); c.fill();
        const fw = clamp((pct / 100) * bw, 0, bw);
        if (fw > 0) {
          const pg = c.createLinearGradient(bx, 0, bx + bw, 0);
          pg.addColorStop(0, '#9B7BFF'); pg.addColorStop(1, '#6E8BFF');
          c.fillStyle = isComplete ? '#27D980' : pg;
          rr(c, bx, by, fw, 5, 2.5); c.fill();
        }
      }
    }

    function drawVignette() {
      const vg = c.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.82);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.58)');
      c.fillStyle = vg; c.fillRect(0, 0, W, H);
    }

    // ── main render ──────────────────────────────────────────────────────────
    function render() {
      const st         = stateRef.current;
      const isActive   = st === 'active';
      const isPaused   = st === 'paused';
      const isLocked   = st === 'locked';
      const isComplete = st === 'complete';
      const isReady    = st === 'ready';

      const swingMs    = isActive ? 1400 : isPaused ? 5600 : 0;
      const swingPhase = swingMs > 0 ? (t % swingMs) / swingMs : 0;

      // impact detection
      if (isActive && swingPhase > 0.28 && swingPhase < 0.36 && t - lastImpactT > swingMs * 0.8) {
        spawnSparks();
        rockFlash = 1;
        shakeX = (Math.random() - 0.5) * 5.5;
        shakeY = (Math.random() - 0.5) * 2.5;
        lastImpactT = t;
      }

      rockFlash = Math.max(0, rockFlash - 0.045);
      shakeX   *= 0.78; shakeY *= 0.78;

      if (isComplete && !confettiDone) { spawnConfetti(); confettiDone = true; }
      if (!isComplete) confettiDone = false;

      // update particles
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]; s.x += s.vx; s.y += s.vy; s.vy += 0.16; s.life++;
        s.alpha = 1 - s.life / s.maxLife; if (s.life >= s.maxLife) sparks.splice(i, 1);
      }
      for (let i = frags.length - 1; i >= 0; i--) {
        const f = frags[i]; f.x += f.vx; f.y += f.vy; f.vy += 0.09; f.life++;
        f.alpha = 1 - f.life / f.maxLife; if (f.life >= f.maxLife) frags.splice(i, 1);
      }
      for (const d of dust) {
        d.x += d.vx; d.y += d.vy; d.life++;
        if (d.life > d.maxLife) {
          d.x = 60 + Math.random() * 320; d.y = H - 18;
          d.vx = (Math.random() - 0.5) * 0.25; d.vy = -0.08 - Math.random() * 0.14;
          d.life = 0; d.maxLife = 140 + Math.random() * 160;
        }
      }
      for (let i = confetti.length - 1; i >= 0; i--) {
        const co = confetti[i]; co.x += co.vx; co.y += co.vy; co.vy += 0.07; co.life++;
        co.alpha = 1 - co.life / co.maxLife; if (co.life >= co.maxLife) confetti.splice(i, 1);
      }

      c.save();
      if (Math.abs(shakeX) > 0.15 || Math.abs(shakeY) > 0.15) c.translate(shakeX, shakeY);

      drawBG(isLocked);
      drawVeins(isActive);
      drawEQ(isLocked, isActive, isReady);
      drawRock(isLocked);
      drawCharacter(isLocked, swingPhase, isActive);
      drawParticles();
      drawHUD(isActive, isPaused, isComplete);
      drawVignette();

      c.restore();
    }

    function frame(now: number) {
      const dt = Math.min(now - lastNow, 50);
      lastNow = now;
      if (!reduced || stateRef.current === 'active') t += dt;
      render();
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(n => {
      lastNow = n; rafRef.current = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', userSelect: 'none' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%', maxWidth: '440px', height: 'auto', aspectRatio: '440/320',
          borderRadius: '18px', display: 'block',
          boxShadow: '0 0 40px rgba(155,123,255,0.14), 0 8px 32px rgba(0,0,0,0.5)',
        }}
        aria-label={`Etheon mining scene — ${state}`}
      />
      <div style={{
        fontSize: '12px', color: '#6F6B82', fontWeight: 600,
        textAlign: 'center', maxWidth: '320px', lineHeight: 1.4,
      }}>
        {state === 'locked'   && 'Subscribe and deposit to unlock rewards mining'}
        {state === 'ready'    && 'Ready — press Start to begin your session'}
        {state === 'active'   && `Mining in progress — ${sessionPct.toFixed(1)}% of session`}
        {state === 'paused'   && 'Session paused'}
        {state === 'complete' && 'Session complete!'}
      </div>
    </div>
  );
}
