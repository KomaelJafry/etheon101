'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// useSearchParams throws BailoutToCSRError during Next.js 16 static prerender.
// usePathname is safe and sufficient for detecting navigations.
function Bar() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevRef = useRef('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const curr = pathname;
    if (!prevRef.current) { prevRef.current = curr; return; }
    if (prevRef.current === curr) return;
    prevRef.current = curr;

    if (intervalRef.current) clearInterval(intervalRef.current);
    if (doneRef.current) clearTimeout(doneRef.current);

    setVisible(true);
    setWidth(20);

    intervalRef.current = setInterval(() => {
      setWidth(w => {
        if (w >= 88) { clearInterval(intervalRef.current!); return 88; }
        return w + 10;
      });
    }, 90);

    doneRef.current = setTimeout(() => {
      clearInterval(intervalRef.current!);
      setWidth(100);
      setTimeout(() => { setVisible(false); setWidth(0); }, 280);
    }, 480);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', zIndex: 9999, pointerEvents: 'none' }}>
      <div style={{
        height: '100%',
        width: `${width}%`,
        background: 'linear-gradient(90deg, #9B7BFF, #6E8BFF)',
        boxShadow: '0 0 10px rgba(155,123,255,0.8), 0 0 3px rgba(155,123,255,0.5)',
        borderRadius: '0 3px 3px 0',
        transition: 'width 0.12s ease',
      }} />
    </div>
  );
}

export default function NavigationProgress() {
  return <Bar />;
}
