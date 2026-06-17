'use client';
import React, { useRef } from 'react';

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'purple' | 'ghost' | 'danger' | 'pause' | 'none';
  children: React.ReactNode;
}

export default function RippleButton({
  variant = 'none',
  children,
  style,
  className = '',
  onClick,
  ...props
}: RippleButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const btn = ref.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.4;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      const wave = document.createElement('span');
      wave.className = 'ripple-wave';
      wave.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
      btn.appendChild(wave);
      setTimeout(() => wave.remove(), 600);
    }
    onClick?.(e);
  }

  const variantClass = variant !== 'none' ? `btn btn-${variant}` : 'btn';

  return (
    <button
      ref={ref}
      className={`ripple-root ${variantClass} ${className}`.trim()}
      style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', ...style }}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}
