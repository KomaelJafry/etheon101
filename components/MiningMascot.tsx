'use client';
import { useEffect, useRef } from 'react';

export type MascotState = 'locked' | 'ready' | 'active' | 'paused' | 'complete';

interface MiningMascotProps {
  state: MascotState;
  sessionPct?: number;
  pendingRewardUsd?: string;
}

// ── geometry constants (verified: at impact angle 0.93 rad, pickaxe tip = crystal pos) ──
const W = 440, H = 320;
const CHAR_X = 148, CHAR_Y = 175;   // character body origin (world)
const SHOULDER_LX = 22, SHOULDER_LY = 0; // right shoulder in char-local coords
const ARM_UPPER = 24, ARM_FORE = 20, HANDLE_LEN = 80, PICK_REACH = 32;
// total reach = 156px; at 53° → tip = (124.6, 93.8) + shoulder = (294.6, 268.8)
const CRYSTAL_X = 295, CRYSTAL_Y = 262; // crystal tip (world)
const CRYSTAL_BASE_Y = 285;              // crystal rock base y (world)
const IMPACT_ANGLE = 0.93;              // radians from vertical at impact

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
function eio(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

export default function MiningMascot({ state, sessionPct = 0 }: MiningMascotProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef<number>(0);
  const stateRef     = useRef(state);
  const pctRef       = useRef(sessionPct);

  useEffect(() => { stateRef.current = state; },      [state]);
  useEffect(() => { pctRef.current   = sessionPct; }, [sessionPct]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cOrNull = canvas.getContext('2d');
    if (!cOrNull) return;
    const c = cOrNull;
    canvas.width = W; canvas.height = H;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── mutable animation state ──────────────────────────────────────────────
    let t = 0, lastNow = 0;
    let shakeX = 0, shakeY = 0;
    let crystalFlash = 0;        // 0-1, decays
    let lastImpactT  = -9999;

    // particle pools
    type Pt = { x:number;y:number;vx:number;vy:number;r:number;alpha:number;life:number;maxLife:number;color:string };
    const sparks:    Pt[] = [];
    const frags:     Pt[] = [];
    const dust:      Pt[] = [];
    const confetti:  Pt[] = [];
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

    // ── helpers ──────────────────────────────────────────────────────────────
    function rr(x: number, y: number, w: number, h: number, r: number) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y);
      c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r);
      c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
    }

    function spawnSparks() {
      const cols = ['#FFD700','#FF8C00','#9B7BFF','#C9BBFF','#ffffff','#FF6B35','#6E8BFF'];
      for (let i = 0; i < 18; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1.5 + Math.random() * 4.5;
        sparks.push({ x: CRYSTAL_X, y: CRYSTAL_Y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - 2.5,
          r: 1+Math.random()*2.5, alpha:1, life:0, maxLife:18+Math.random()*20,
          color: cols[Math.floor(Math.random()*cols.length)] });
      }
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI/2 + (Math.random()-0.5)*Math.PI;
        const sp = 0.8+Math.random()*2;
        frags.push({ x: CRYSTAL_X, y: CRYSTAL_Y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp-1,
          r: 2+Math.random()*5, alpha:1, life:0, maxLife:28+Math.random()*28, color:'#9B7BFF' });
      }
    }

    function spawnConfetti() {
      const cols = ['#9B7BFF','#6E8BFF','#27D980','#F5B642','#C9BBFF','#FF6B8A'];
      for (let i = 0; i < 50; i++) {
        confetti.push({ x: W/2+(Math.random()-0.5)*80, y: 60,
          vx: (Math.random()-0.5)*5, vy:-3-Math.random()*5,
          r: 3+Math.random()*5, alpha:1, life:0, maxLife:70+Math.random()*60,
          color: cols[Math.floor(Math.random()*cols.length)] });
      }
    }

    // ── drawing helpers ───────────────────────────────────────────────────────
    function drawBG(isLocked: boolean) {
      const bg = c.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, isLocked ? '#06050F' : '#090716');
      bg.addColorStop(1, isLocked ? '#0A0818' : '#0B0A14');
      c.fillStyle = bg; c.fillRect(0, 0, W, H);

      // ambient crystal glow
      if (!isLocked) {
        const ag = c.createRadialGradient(CRYSTAL_X, CRYSTAL_Y-20, 0, CRYSTAL_X, CRYSTAL_Y-20, 180);
        const ai = 0.06 + Math.sin(t*0.0013)*0.02 + crystalFlash*0.08;
        ag.addColorStop(0, `rgba(155,123,255,${ai})`);
        ag.addColorStop(0.5, `rgba(110,139,255,${ai*0.4})`);
        ag.addColorStop(1, 'transparent');
        c.fillStyle = ag; c.fillRect(0, 0, W, H);
      }

      // left cave wall
      c.fillStyle = '#08061A';
      c.beginPath(); c.moveTo(0,0); c.lineTo(58,0);
      c.bezierCurveTo(48,45,28,90,42,140);
      c.bezierCurveTo(52,190,32,235,48,H);
      c.lineTo(0,H); c.closePath(); c.fill();

      // right cave wall
      c.fillStyle = '#07051A';
      c.beginPath(); c.moveTo(W,0); c.lineTo(382,0);
      c.bezierCurveTo(398,55,418,110,402,165);
      c.bezierCurveTo(412,215,398,265,408,H);
      c.lineTo(W,H); c.closePath(); c.fill();

      // ground plane
      c.fillStyle = '#0A0818';
      c.fillRect(48, 255, 344, H-255);
      c.strokeStyle = 'rgba(155,123,255,0.10)';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(48,255); c.lineTo(392,255); c.stroke();

      // foreground ledge
      c.fillStyle = '#060514';
      c.beginPath(); c.moveTo(0,H);
      c.lineTo(0,288); c.bezierCurveTo(80,282,160,294,240,288);
      c.bezierCurveTo(300,283,360,291,W,286);
      c.lineTo(W,H); c.closePath(); c.fill();
    }

    function drawVeins(isActive: boolean) {
      const p = Math.sin(t*0.0014)*0.5+0.5;
      const veins = [
        {x1:22,y1:55,cx:48,cy:95,x2:75,y2:130},
        {x1:390,y1:30,cx:412,cy:85,x2:420,y2:118},
        {x1:14,y1:195,cx:42,cy:250,x2:58,y2:275},
      ];
      c.lineWidth = 1.2;
      for (const v of veins) {
        c.strokeStyle = `rgba(110,139,255,${0.10+p*0.07})`;
        c.beginPath(); c.moveTo(v.x1,v.y1);
        c.quadraticCurveTo(v.cx,v.cy,v.x2,v.y2); c.stroke();
        c.save(); c.shadowBlur = 6; c.shadowColor='#6E8BFF';
        c.fillStyle=`rgba(155,123,255,${0.28+p*0.18})`;
        c.beginPath(); c.arc(v.x2,v.y2,2.5,0,Math.PI*2); c.fill();
        c.restore();
      }
      // scan line
      if (isActive) {
        const sy = (t*0.048) % H;
        const sg = c.createLinearGradient(0,sy-5,0,sy+5);
        sg.addColorStop(0,'transparent');
        sg.addColorStop(0.5,'rgba(110,139,255,0.055)');
        sg.addColorStop(1,'transparent');
        c.fillStyle=sg; c.fillRect(0,sy-5,W,10);
      }
    }

    function drawCrystal(isLocked: boolean) {
      const cx=CRYSTAL_X, cy=CRYSTAL_Y, by=CRYSTAL_BASE_Y;
      const p = Math.sin(t*0.0018)*0.5+0.5;
      const glow = isLocked ? 0.15 : 0.45 + p*0.3 + crystalFlash*0.55;

      // outer glow halo
      if (!isLocked) {
        c.save();
        const og = c.createRadialGradient(cx,cy-20,0,cx,cy-20,72);
        og.addColorStop(0,`rgba(155,123,255,${glow*0.55})`);
        og.addColorStop(0.4,`rgba(110,139,255,${glow*0.22})`);
        og.addColorStop(1,'transparent');
        c.fillStyle=og; c.beginPath(); c.arc(cx,cy-20,72,0,Math.PI*2); c.fill();
        c.restore();
      }

      // rock base
      c.fillStyle='#1A1430'; c.strokeStyle='#2A1F50'; c.lineWidth=1.5;
      c.beginPath();
      c.moveTo(cx-30,by); c.lineTo(cx-34,by-20);
      c.lineTo(cx-22,by-33); c.lineTo(cx-4,by-38);
      c.lineTo(cx+20,by-35); c.lineTo(cx+32,by-18);
      c.lineTo(cx+26,by); c.closePath();
      c.fill(); c.stroke();

      // shard function
      function shard(tx:number, ty:number, tipDx:number, tipDy:number, hw:number, alpha:number) {
        c.save();
        c.shadowBlur = isLocked ? 0 : 18*glow;
        c.shadowColor = '#9B7BFF';
        const g2 = c.createLinearGradient(tx+tipDx,ty+tipDy,tx,ty);
        const cc = isLocked ? '#2A2060' : `rgba(${lerp(155,210,crystalFlash)},${lerp(123,185,crystalFlash)},255,1)`;
        g2.addColorStop(0, cc); g2.addColorStop(0.65, cc); g2.addColorStop(1,'rgba(18,12,45,1)');
        c.globalAlpha = alpha;
        c.fillStyle = g2;
        c.beginPath();
        c.moveTo(tx+tipDx, ty+tipDy);
        c.lineTo(tx-hw, ty); c.lineTo(tx+hw, ty); c.closePath(); c.fill();
        // edge highlight
        c.strokeStyle=`rgba(210,195,255,${glow*0.5*alpha})`; c.lineWidth=1;
        c.beginPath(); c.moveTo(tx+tipDx,ty+tipDy); c.lineTo(tx-hw*0.4,ty); c.stroke();
        c.restore();
      }

      shard(cx,   cy,  -6, -52, 10, 1.0);
      shard(cx-14,cy+3,-5, -38, 8,  0.88);
      shard(cx+12,cy-2,-4, -34, 7,  0.92);
      shard(cx-23,cy+7,-3, -24, 6,  0.72);

      // white shine streak
      if (!isLocked) {
        c.save(); c.globalAlpha = 0.28+p*0.18;
        const sh = c.createLinearGradient(cx-3,cy-48,cx+3,cy-14);
        sh.addColorStop(0,'rgba(255,255,255,0.7)'); sh.addColorStop(1,'rgba(255,255,255,0)');
        c.fillStyle=sh; c.beginPath();
        c.moveTo(cx-2,cy-48); c.lineTo(cx+2,cy-48); c.lineTo(cx+4,cy-14); c.lineTo(cx-4,cy-14); c.closePath();
        c.fill(); c.restore();
      }

      // impact flash ring
      if (crystalFlash>0.05) {
        c.save(); c.globalAlpha=crystalFlash*0.75;
        c.strokeStyle='#D0C4FF'; c.lineWidth=2;
        c.shadowBlur=22; c.shadowColor='#9B7BFF';
        const fr=(1-crystalFlash)*55;
        c.beginPath(); c.arc(cx,cy-22,fr,0,Math.PI*2); c.stroke();
        c.restore();
      }
    }

    function drawCharacter(isLocked: boolean, swingPhase: number, isActive: boolean) {
      const bob = isActive ? Math.sin(t*0.00449)*2.5 : 0; // synced to 1.4s cycle
      const twist = isActive ? Math.sin(swingPhase*Math.PI*2)*0.04 : 0;

      c.save();
      c.translate(CHAR_X, CHAR_Y + bob);
      c.rotate(twist);
      c.globalAlpha = isLocked ? 0.38 : 1;

      // ground shadow
      c.save(); c.globalAlpha=(isLocked?0.1:0.22);
      c.fillStyle='#000';
      c.beginPath(); c.ellipse(0,82,38,9,0,0,Math.PI*2); c.fill();
      c.restore();

      // legs
      const legSwing = isActive ? Math.sin(swingPhase*Math.PI*2)*4 : 0;
      drawLeg(-13,42,-15-legSwing,78,isLocked);
      drawLeg(13, 42, 15+legSwing, 78, isLocked);

      // torso
      drawTorso(isLocked, isActive);

      // left arm (counter-swings)
      const leftSwing = isActive ? Math.sin(swingPhase*Math.PI*2+Math.PI)*0.14 : 0;
      drawLeftArm(leftSwing, isLocked);

      // right arm + pickaxe
      drawRightArm(swingPhase, isActive||stateRef.current==='paused', isLocked);

      // helmet
      drawHelmet(isLocked, isActive);

      c.restore();
    }

    function drawLeg(x1:number,y1:number,x2:number,y2:number,isLocked:boolean) {
      const col=isLocked?'#1A1630':'#1E1C38';
      const knee=isLocked?'#252044':'#2A2450';
      c.fillStyle=col; c.strokeStyle=isLocked?'#2A2848':'#3A3060'; c.lineWidth=1;
      // thigh
      rr(x1-8,y1,16,22,4); c.fill(); c.stroke();
      // knee pad
      c.fillStyle=knee; rr(x1-7,y1+16,14,8,3); c.fill();
      // shin
      c.fillStyle=col; rr(x2-7,y1+22,14,22,3); c.fill(); c.stroke();
      // boot
      c.fillStyle=isLocked?'#100D1E':'#14112A';
      rr(x2-9,y1+42,18,12,[0,0,4,4] as unknown as number); c.fill();
    }

    function drawTorso(isLocked:boolean, isActive:boolean) {
      // main body
      c.fillStyle=isLocked?'#18162E':'#1C1A36';
      c.strokeStyle=isLocked?'#2A2848':'#36325E'; c.lineWidth=1.5;
      c.beginPath();
      c.moveTo(-20,0); c.lineTo(20,0); c.lineTo(22,44); c.lineTo(-22,44); c.closePath();
      c.fill(); c.stroke();
      // chest plate
      c.fillStyle=isLocked?'#201D3A':'#242248';
      rr(-15,4,30,30,5); c.fill();
      // chest glow strip
      const gp=isActive?(Math.sin(t*0.00449)*0.5+0.5):0.4;
      c.save(); c.shadowBlur=isActive?14:4; c.shadowColor='#9B7BFF';
      c.fillStyle=`rgba(155,123,255,${isLocked?0.12:0.38+gp*0.32})`;
      rr(-2.5,8,5,22,2.5); c.fill();
      c.restore();
      // shoulder pads
      c.fillStyle=isLocked?'#252240':'#282450';
      c.strokeStyle=isLocked?'#363260':'#423A7A'; c.lineWidth=1;
      c.beginPath(); c.ellipse(-22,2,12,7,-0.2,0,Math.PI*2); c.fill(); c.stroke();
      c.beginPath(); c.ellipse( 22,2,12,7, 0.2,0,Math.PI*2); c.fill(); c.stroke();
      // belt
      c.fillStyle=isLocked?'#1C1A32':'#211F3C';
      rr(-22,40,44,8,2); c.fill();
      c.fillStyle=isLocked?'#2A2848':'#363260';
      rr(-5,41,10,6,1); c.fill();
      // status LED
      c.save(); c.shadowBlur=isActive?10:0; c.shadowColor='#16D98A';
      c.fillStyle=isLocked?'#2A2848':isActive?'#16D98A':'#9B7BFF';
      c.beginPath(); c.arc(-9,22,3.5,0,Math.PI*2); c.fill();
      c.restore();
    }

    function drawLeftArm(swing:number,isLocked:boolean) {
      c.save(); c.translate(-22,2); c.rotate(0.15+swing);
      const col=isLocked?'#1A1630':'#1C1A36';
      c.fillStyle=col; c.strokeStyle=isLocked?'#2A2848':'#3A3060'; c.lineWidth=1;
      rr(-6,0,12,22,4); c.fill(); c.stroke();
      rr(-5,20,10,20,3); c.fill(); c.stroke();
      c.fillStyle=isLocked?'#201D38':'#252248';
      c.beginPath(); c.ellipse(0,41,8,5,0.1,0,Math.PI*2); c.fill();
      c.restore();
    }

    function drawRightArm(phase:number, animate:boolean, isLocked:boolean) {
      // swing: 0=raised(-80°), 0.30=impact(+53°), 0.44=rebound(+38°), 1=raised
      let ang: number;
      if (!animate) {
        ang = -1.2; // raised rest
      } else {
        const isPaused = stateRef.current === 'paused';
        const p = phase;
        if (p < 0.30)       ang = lerp(-1.40, IMPACT_ANGLE, eio(p/0.30));
        else if (p < 0.44)  ang = lerp(IMPACT_ANGLE, 0.62, (p-0.30)/0.14);
        else if (p < 0.62)  ang = lerp(0.62, 0.70, (p-0.44)/0.18);
        else                 ang = lerp(0.70, -1.40, eio((p-0.62)/0.38));
        if (isPaused) ang = lerp(ang, -0.8, 0.5); // slow-settle when paused
      }

      c.save();
      c.translate(SHOULDER_LX, SHOULDER_LY); // shoulder pivot in char-local space
      c.rotate(ang);
      // all draws below are in arm-local space (0,0 = shoulder)

      const col=isLocked?'#1A1630':'#1C1A36';
      c.fillStyle=col; c.strokeStyle=isLocked?'#2A2848':'#3A3060'; c.lineWidth=1;

      // upper arm
      rr(-7,0,14,ARM_UPPER+2,4); c.fill(); c.stroke();
      // elbow joint
      c.fillStyle=isLocked?'#252240':'#2A2450';
      c.beginPath(); c.arc(0,ARM_UPPER+1,7,0,Math.PI*2); c.fill();
      // forearm
      c.fillStyle=col;
      rr(-6,ARM_UPPER,12,ARM_FORE+2,3); c.fill(); c.stroke();
      // glove
      c.fillStyle=isLocked?'#201D38':'#252248';
      c.beginPath(); c.ellipse(0,ARM_UPPER+ARM_FORE+3,8,5.5,0,0,Math.PI*2); c.fill();

      // handle
      c.save();
      c.strokeStyle=isLocked?'#4A3820':'#7B6040'; c.lineWidth=5; c.lineCap='round';
      c.beginPath();
      c.moveTo(0,ARM_UPPER+ARM_FORE+1);
      c.lineTo(4, ARM_UPPER+ARM_FORE+1+HANDLE_LEN);
      c.stroke(); c.lineWidth=1;
      c.restore();

      // pickaxe head at end of handle
      c.save();
      c.translate(4, ARM_UPPER+ARM_FORE+1+HANDLE_LEN);
      c.rotate(0.32); // angle head relative to handle

      if (!isLocked) { c.shadowBlur=8; c.shadowColor='rgba(180,190,220,0.55)'; }

      // shaft
      c.fillStyle=isLocked?'#505570':'#7888A8';
      rr(-22,-5.5,44,11,3); c.fill();
      // left blunt end
      c.fillStyle=isLocked?'#606080':'#8898B8';
      c.beginPath();
      c.moveTo(-22,-5.5); c.lineTo(-36,-3); c.lineTo(-36,3); c.lineTo(-22,5.5); c.closePath();
      c.fill();
      // right sharp end — hits crystal
      c.fillStyle=isLocked?'#808090':'#BCC8DC';
      c.beginPath();
      c.moveTo(22,-5.5); c.lineTo(PICK_REACH+10,-9); c.lineTo(PICK_REACH+12,0); c.lineTo(PICK_REACH+10,9); c.lineTo(22,5.5); c.closePath();
      c.fill();
      // sharp edge highlight
      c.strokeStyle='rgba(255,255,255,0.42)'; c.lineWidth=1;
      c.beginPath(); c.moveTo(22,-5.5); c.lineTo(PICK_REACH+10,-9); c.stroke();
      c.shadowBlur=0;

      c.restore(); // pickaxe head
      c.restore(); // arm pivot
    }

    function drawHelmet(isLocked:boolean, isActive:boolean) {
      const p=isActive?(Math.sin(t*0.00449)*0.5+0.5):0.5;
      c.save();

      // neck
      c.fillStyle=isLocked?'#16142A':'#1C1A38';
      rr(-5.5,-20,11,14,3); c.fill();

      // dome glow
      if (!isLocked) { c.shadowBlur=22+p*10; c.shadowColor='#6A4FBF'; }
      const hg=c.createLinearGradient(-24,-58,24,-24);
      hg.addColorStop(0,isLocked?'#1E1A3A':'#7A5FD8');
      hg.addColorStop(0.5,isLocked?'#2A2450':'#9B7BFF');
      hg.addColorStop(1,isLocked?'#141228':'#1A1045');
      c.fillStyle=hg; c.strokeStyle=isLocked?'#3A3060':'#7A5FD8'; c.lineWidth=1.5;
      c.beginPath(); c.ellipse(0,-36,25,23,0,0,Math.PI*2); c.fill(); c.stroke();
      c.shadowBlur=0;

      // visor
      c.fillStyle=isLocked?'#0A0818':'#050218';
      c.strokeStyle=isLocked?'#2A2448':'#4A3A9A'; c.lineWidth=1;
      c.beginPath(); c.ellipse(0,-31,17,11,0,0,Math.PI); c.fill(); c.stroke();

      if (!isLocked) {
        const vg=c.createLinearGradient(0,-42,0,-22);
        vg.addColorStop(0,`rgba(80,105,255,${0.32+p*0.18})`);
        vg.addColorStop(1,'rgba(4,2,24,0.92)');
        c.fillStyle=vg; c.beginPath(); c.ellipse(0,-31,16,10,0,0,Math.PI); c.fill();
        // visor scan line
        if (isActive) {
          const sy=-40+((t*0.018)%18);
          c.strokeStyle=`rgba(110,139,255,0.38)`; c.lineWidth=0.8;
          c.beginPath(); c.moveTo(-14,sy); c.lineTo(14,sy); c.stroke();
        }
        // reflection arc
        c.strokeStyle='rgba(175,158,255,0.28)'; c.lineWidth=1.5;
        c.beginPath(); c.arc(-4,-37,7,0.5,1.8); c.stroke();
      }

      // helmet lamp
      c.save();
      c.shadowBlur=isActive?22+p*14:4; c.shadowColor='#FFD700';
      const lg=c.createRadialGradient(0,-56,0,0,-56,7.5);
      lg.addColorStop(0,'#FFFFFF'); lg.addColorStop(0.4,'#FFE44A');
      lg.addColorStop(1,isActive?'#FFB800':'#775500');
      c.fillStyle=lg; c.beginPath(); c.arc(0,-56,6.5,0,Math.PI*2); c.fill();
      c.restore();

      // lamp light cone (active only)
      if (isActive) {
        c.save();
        const cone=c.createLinearGradient(0,-50,50,25);
        cone.addColorStop(0,`rgba(255,220,80,${0.07+p*0.04})`);
        cone.addColorStop(1,'rgba(255,220,80,0)');
        c.fillStyle=cone;
        c.beginPath(); c.moveTo(0,-50); c.lineTo(-25,30); c.lineTo(65,30); c.lineTo(40,-50); c.closePath();
        c.fill(); c.restore();
      }

      // side vents
      c.fillStyle=isLocked?'#1A1630':'#1E1A38';
      rr(-28,-42,4,14,2); c.fill(); rr(24,-42,4,14,2); c.fill();

      // lock overlay
      if (isLocked) {
        c.save(); c.globalAlpha=0.88;
        c.fillStyle='rgba(11,10,20,0.78)';
        rr(-15,-50,30,28,6); c.fill();
        c.strokeStyle='rgba(155,123,255,0.42)'; c.lineWidth=1.3;
        rr(-15,-50,30,28,6); c.stroke();
        c.strokeStyle='#3A3060'; c.lineWidth=2.5;
        c.beginPath(); c.moveTo(-7,-36); c.lineTo(-7,-42);
        c.arc(0,-42,7,Math.PI,0); c.lineTo(7,-36); c.stroke();
        c.fillStyle='#1E1A38'; c.strokeStyle='#9B7BFF'; c.lineWidth=1.2;
        rr(-9,-36,18,16,3); c.fill(); c.stroke();
        c.fillStyle='#9B7BFF';
        c.beginPath(); c.arc(0,-29,3.5,0,Math.PI*2); c.fill();
        rr(-1.5,-28,3,6,1.5); c.fill();
        c.restore();
      }

      c.restore();
    }

    function drawEQ(isLocked:boolean,isActive:boolean,isReady:boolean) {
      const BOTTOM=222, BW=7, GAP=4;
      const ao=isLocked?0.14:isActive?0.88:0.38;

      for (let i=0;i<EQ_L.length;i++) {
        const b=EQ_L[i];
        const bh=isActive ? b.mh*(Math.sin(t*b.sp+b.ph)*0.42+0.58)
                 : isReady ? b.mh*(Math.sin(t*b.sp*0.3+b.ph)*0.15+0.22)
                 : b.mh*0.18;
        const bx=55+i*(BW+GAP), by=BOTTOM-bh;
        const bg=c.createLinearGradient(bx,BOTTOM,bx,by);
        bg.addColorStop(0,`rgba(155,123,255,${ao})`);
        bg.addColorStop(1,`rgba(110,139,255,${ao*0.45})`);
        c.save(); c.shadowBlur=isActive?10:0; c.shadowColor='#9B7BFF';
        c.fillStyle=bg; rr(bx,by,BW,bh,[3,3,0,0] as unknown as number); c.fill();
        c.restore();
      }
      for (let i=0;i<EQ_R.length;i++) {
        const b=EQ_R[i];
        const bh=isActive ? b.mh*(Math.sin(t*b.sp+b.ph)*0.42+0.58)
                 : isReady ? b.mh*(Math.sin(t*b.sp*0.3+b.ph)*0.15+0.22)
                 : b.mh*0.18;
        const bx=346+i*(BW+GAP), by=BOTTOM-bh;
        const bg=c.createLinearGradient(bx,BOTTOM,bx,by);
        bg.addColorStop(0,`rgba(110,139,255,${ao})`);
        bg.addColorStop(1,`rgba(155,123,255,${ao*0.45})`);
        c.save(); c.shadowBlur=isActive?10:0; c.shadowColor='#6E8BFF';
        c.fillStyle=bg; rr(bx,by,BW,bh,[3,3,0,0] as unknown as number); c.fill();
        c.restore();
      }
    }

    function drawParticles() {
      for (const s of sparks) {
        c.save(); c.globalAlpha=s.alpha;
        c.shadowBlur=7; c.shadowColor=s.color; c.fillStyle=s.color;
        c.beginPath(); c.arc(s.x,s.y,s.r,0,Math.PI*2); c.fill();
        c.restore();
      }
      for (const f of frags) {
        c.save(); c.globalAlpha=f.alpha; c.translate(f.x,f.y); c.rotate(f.life*0.12);
        c.shadowBlur=10; c.shadowColor='#9B7BFF';
        const fg=c.createLinearGradient(-f.r,-f.r,f.r,f.r);
        fg.addColorStop(0,'#D0C4FF'); fg.addColorStop(1,'#6048B0');
        c.fillStyle=fg;
        c.beginPath(); c.moveTo(0,-f.r); c.lineTo(f.r*0.6,f.r*0.5); c.lineTo(-f.r*0.6,f.r*0.5); c.closePath();
        c.fill(); c.restore();
      }
      // dust
      const isActive=stateRef.current==='active';
      for (const d of dust) {
        if (d.y<50||d.y>268) continue;
        c.save(); c.globalAlpha=d.alpha*(isActive?1:0.38);
        c.fillStyle='rgba(175,158,255,1)';
        c.beginPath(); c.arc(d.x,d.y,d.r,0,Math.PI*2); c.fill();
        c.restore();
      }
      // confetti
      for (const co of confetti) {
        c.save(); c.globalAlpha=co.alpha; c.translate(co.x,co.y); c.rotate(co.life*0.08);
        c.shadowBlur=4; c.shadowColor=co.color; c.fillStyle=co.color;
        c.fillRect(-co.r/2,-co.r/4,co.r,co.r/2); c.restore();
      }
    }

    function drawHUD(isActive:boolean,isPaused:boolean,isComplete:boolean) {
      const pct=pctRef.current;
      if (isActive) {
        c.save(); c.globalAlpha=0.72;
        c.font='700 9px monospace'; c.fillStyle='#9B7BFF';
        c.fillText('MINING ACTIVE',65,26);
        c.font='700 8px monospace'; c.fillStyle='#6E8BFF';
        c.fillText(`PROGRESS ${pct.toFixed(1)}%`,65,38);
        c.restore();
      }
      if (isPaused) {
        c.save(); c.globalAlpha=0.65; c.textAlign='center';
        c.font='700 10px monospace'; c.fillStyle='#F5B642';
        c.fillText('SESSION PAUSED',W/2,30); c.restore();
      }
      if (isComplete) {
        c.save();
        c.shadowBlur=20; c.shadowColor='#27D980';
        c.strokeStyle='rgba(39,217,128,0.7)'; c.lineWidth=1.5;
        rr(W/2-72,12,144,34,9); c.stroke();
        c.fillStyle='rgba(39,217,128,0.12)';
        rr(W/2-72,12,144,34,9); c.fill();
        c.shadowBlur=0; c.font='700 11px monospace'; c.fillStyle='#27D980';
        c.textAlign='center'; c.fillText('SESSION COMPLETE',W/2,35);
        c.restore();
      }
      // progress bar
      if (isActive||isPaused||isComplete) {
        const bx=65,by=H-26,bw=312;
        c.fillStyle='rgba(28,22,55,0.85)';
        rr(bx,by,bw,5,2.5); c.fill();
        const fw=clamp((pct/100)*bw,0,bw);
        if (fw>0) {
          const pg=c.createLinearGradient(bx,0,bx+bw,0);
          pg.addColorStop(0,'#9B7BFF'); pg.addColorStop(1,'#6E8BFF');
          c.fillStyle=isComplete?'#27D980':pg;
          rr(bx,by,fw,5,2.5); c.fill();
        }
      }
    }

    function drawVignette() {
      const vg=c.createRadialGradient(W/2,H/2,H*0.28,W/2,H/2,H*0.82);
      vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.58)');
      c.fillStyle=vg; c.fillRect(0,0,W,H);
    }

    // ── main render ──────────────────────────────────────────────────────────
    function render() {
      const st=stateRef.current;
      const isActive=st==='active', isPaused=st==='paused', isLocked=st==='locked';
      const isComplete=st==='complete', isReady=st==='ready';

      // swing phase
      const swingMs=isActive?1400:isPaused?5600:0;
      const swingPhase=swingMs>0?(t%swingMs)/swingMs:0;

      // impact detection: phase enters [0.28,0.36] after at least 0.8 cycles
      if (isActive && swingPhase>0.28 && swingPhase<0.36 && t-lastImpactT>swingMs*0.8) {
        spawnSparks();
        crystalFlash=1;
        shakeX=(Math.random()-0.5)*5;
        shakeY=(Math.random()-0.5)*2.5;
        lastImpactT=t;
      }

      // decay
      crystalFlash=Math.max(0,crystalFlash-0.045);
      shakeX*=0.78; shakeY*=0.78;

      // complete confetti
      if (isComplete&&!confettiDone) { spawnConfetti(); confettiDone=true; }
      if (!isComplete) confettiDone=false;

      // update particles
      for (let i=sparks.length-1;i>=0;i--) {
        const s=sparks[i]; s.x+=s.vx; s.y+=s.vy; s.vy+=0.16; s.life++;
        s.alpha=1-s.life/s.maxLife; if(s.life>=s.maxLife)sparks.splice(i,1);
      }
      for (let i=frags.length-1;i>=0;i--) {
        const f=frags[i]; f.x+=f.vx; f.y+=f.vy; f.vy+=0.09; f.life++;
        f.alpha=1-f.life/f.maxLife; if(f.life>=f.maxLife)frags.splice(i,1);
      }
      for (const d of dust) {
        d.x+=d.vx; d.y+=d.vy; d.life++;
        if (d.life>d.maxLife) {
          d.x=60+Math.random()*320; d.y=H-18;
          d.vx=(Math.random()-0.5)*0.25; d.vy=-0.08-Math.random()*0.14;
          d.life=0; d.maxLife=140+Math.random()*160;
        }
      }
      for (let i=confetti.length-1;i>=0;i--) {
        const co=confetti[i]; co.x+=co.vx; co.y+=co.vy; co.vy+=0.07; co.life++;
        co.alpha=1-co.life/co.maxLife; if(co.life>=co.maxLife)confetti.splice(i,1);
      }

      // ── draw ──
      c.save();
      if (Math.abs(shakeX)>0.15||Math.abs(shakeY)>0.15) c.translate(shakeX,shakeY);

      drawBG(isLocked);
      drawVeins(isActive);
      drawEQ(isLocked,isActive,isReady);
      drawCrystal(isLocked);
      drawCharacter(isLocked, swingPhase, isActive);
      drawParticles();
      drawHUD(isActive,isPaused,isComplete);
      drawVignette();

      c.restore();
    }

    function frame(now: number) {
      const dt=Math.min(now-lastNow,50);
      lastNow=now;
      if (!reduced||stateRef.current==='active') t+=dt;
      render();
      rafRef.current=requestAnimationFrame(frame);
    }

    rafRef.current=requestAnimationFrame(n=>{ lastNow=n; rafRef.current=requestAnimationFrame(frame); });
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // runs once; reads state via refs

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', userSelect:'none' }}>
      <canvas
        ref={canvasRef}
        style={{ width:'100%', maxWidth:'440px', height:'auto', aspectRatio:'440/320',
                 borderRadius:'18px', display:'block',
                 boxShadow:'0 0 40px rgba(155,123,255,0.12), 0 8px 32px rgba(0,0,0,0.5)' }}
        aria-label={`Etheon mining scene — ${state}`}
      />
      <div style={{ fontSize:'12px', color:'#6F6B82', fontWeight:600, textAlign:'center', maxWidth:'320px', lineHeight:1.4 }}>
        {state==='locked'  &&'Subscribe and deposit to unlock rewards mining'}
        {state==='ready'   &&'Ready — press Start to begin your session'}
        {state==='active'  &&`Mining in progress — ${sessionPct.toFixed(1)}% of session`}
        {state==='paused'  &&'Session paused'}
        {state==='complete'&&'Session complete!'}
      </div>
    </div>
  );
}
