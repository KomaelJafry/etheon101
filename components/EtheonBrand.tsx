'use client';

/** Inline crystal icon — matches public/brand/etheon-icon.svg */
export function EtheonCrystal({ size = 20, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ec-tl" x1="80" y1="14" x2="26" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#E0C8FF" />
          <stop offset="1" stopColor="#9B7BFF" />
        </linearGradient>
        <linearGradient id="ec-tr" x1="80" y1="14" x2="134" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#C8B8FF" />
          <stop offset="1" stopColor="#6E8BFF" />
        </linearGradient>
        <linearGradient id="ec-bl" x1="26" y1="100" x2="80" y2="148" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6B55CC" />
          <stop offset="1" stopColor="#4A3DAA" />
        </linearGradient>
        <linearGradient id="ec-br" x1="134" y1="100" x2="80" y2="148" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5E7AE8" />
          <stop offset="1" stopColor="#6E8BFF" />
        </linearGradient>
      </defs>
      <polygon points="80,14 26,88 80,68"    fill="url(#ec-tl)" />
      <polygon points="80,14 134,88 80,68"   fill="url(#ec-tr)" />
      <polygon points="26,100 80,148 80,80"  fill="url(#ec-bl)" />
      <polygon points="134,100 80,148 80,80" fill="url(#ec-br)" />
      <polygon points="26,88 80,68 80,80 26,100"    fill="#8A6BFF" opacity="0.85" />
      <polygon points="134,88 80,68 80,80 134,100"  fill="#9B7BFF" opacity="0.65" />
    </svg>
  );
}

/**
 * Sidebar / header logomark: crystal in a rounded gradient pill.
 * Matches the existing visual exactly but uses the new crystal shape.
 */
export function EtheonLogoMark({
  size = 36,
  borderRadius = 11,
}: {
  size?: number;
  borderRadius?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius,
        background: 'linear-gradient(135deg,#9B7BFF,#6E8BFF)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 6px 20px rgba(155,123,255,0.5)',
        flexShrink: 0,
      }}
    >
      <EtheonCrystal size={Math.round(size * 0.58)} />
    </div>
  );
}
