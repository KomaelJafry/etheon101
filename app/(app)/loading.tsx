export default function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', flexDirection: 'column', gap: '14px' }}>
      <svg width="38" height="38" viewBox="0 0 44 44" fill="none" style={{ animation: 'etheonSpin 0.8s linear infinite' }}>
        <circle cx="22" cy="22" r="18" stroke="rgba(155,123,255,0.15)" strokeWidth="3.5" />
        <path d="M22 4a18 18 0 0 1 18 18" stroke="#9B7BFF" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: '13.5px', color: '#9B7BFF' }}>
        Loading…
      </span>
    </div>
  );
}
