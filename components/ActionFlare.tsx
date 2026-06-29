'use client';
import { useEffect, useState } from 'react';

interface FlareOpts {
  x?: number;
  y?: number;
}

// Module-level singleton — callable from any file without React context
let triggerFlareFn: ((opts?: FlareOpts) => void) | null = null;

export function triggerFlare(opts?: FlareOpts) {
  triggerFlareFn?.(opts);
}

interface FlareState {
  id: number;
  x: number;
  y: number;
}

let nextId = 0;

export default function ActionFlare() {
  const [flares, setFlares] = useState<FlareState[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    triggerFlareFn = (opts) => {
      if (reduced) return;
      const x = opts?.x ?? window.innerWidth / 2;
      const y = opts?.y ?? window.innerHeight / 2;
      const id = nextId++;
      setFlares(prev => [...prev, { id, x, y }]);
      setTimeout(() => {
        setFlares(prev => prev.filter(f => f.id !== id));
      }, 700);
    };
    return () => { triggerFlareFn = null; };
  }, []);

  if (flares.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes flareExpand {
          0%   { transform: scale(0);  opacity: 1;   }
          60%  { opacity: 0.55; }
          100% { transform: scale(60); opacity: 0;   }
        }
      `}</style>
      {flares.map(f => (
        <div
          key={f.id}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: f.x,
              top: f.y,
              width: '12px',
              height: '12px',
              marginLeft: '-6px',
              marginTop: '-6px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(155,123,255,0.72) 0%, rgba(110,139,255,0.45) 40%, transparent 70%)',
              animation: 'flareExpand 0.65s cubic-bezier(0.2,0,0.4,1) forwards',
            }}
          />
        </div>
      ))}
    </>
  );
}
