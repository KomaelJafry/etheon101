'use client';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { createBrowserClient } from '@supabase/ssr';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '../../../components/Toast';

function Skeleton({ h = 20, w = '100%', r = 10 }: { h?: number; w?: string | number; r?: number }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r, flexShrink: 0 }} />;
}
import Icon from '../../../components/Icon';
import RippleButton from '../../../components/RippleButton';
import { useContent } from '../../../hooks/useContent';

export default function WalletPage() {
  const { profile, ethPrice, loading } = useApp();
  const { show } = useToast();
  const { get } = useContent(['wallet']);
  const depositRef = useRef<HTMLDivElement>(null);
  const convertRef = useRef<HTMLDivElement>(null);

  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [depositQrTarget, setDepositQrTarget] = useState<string | null>(null);
  const [depositQrImageUrl, setDepositQrImageUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAddress() {
      setContentLoading(true);
      const { data } = await supabase
        .from('ui_content')
        .select('element_key,value')
        .eq('page', 'wallet')
        .in('element_key', ['deposit_address', 'deposit_qr_target', 'deposit_qr_image_url']);
      if (data) {
        const m: Record<string, string> = {};
        data.forEach(r => { m[r.element_key] = r.value; });
        setDepositAddress(m['deposit_address'] ?? null);
        setDepositQrTarget(m['deposit_qr_target'] ?? null);
        setDepositQrImageUrl(m['deposit_qr_image_url'] ?? null);
      }
      setContentLoading(false);
    }
    fetchAddress();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const qrValue = depositQrTarget || depositAddress;
  const copyTarget = depositAddress || depositQrTarget;

  const ethBalance = profile?.eth_balance ?? 0;
  const usdValue = (ethBalance * ethPrice).toFixed(2);

  function copyAddress() {
    if (!copyTarget) return;
    navigator.clipboard.writeText(copyTarget).then(() => {
      show('Address copied to clipboard', 'success');
    }).catch(() => {
      show('Could not copy — please copy manually', 'error');
    });
  }

  const shortAddr = depositAddress && depositAddress.length > 16
    ? `${depositAddress.slice(0, 6)}…${depositAddress.slice(-6)}`
    : depositAddress;

  const assets = [
    { name: 'Ethereum', sym: 'ETH', bal: ethBalance.toFixed(6), val: `$${usdValue}`, chg: '+2.41%', chgColor: '#16D98A', iconBg: 'linear-gradient(135deg,#627EEA,#4A6CF7)', icon: 'diamond' },
    { name: 'Tether USD', sym: 'USDT', bal: '0.00', val: '$0.00', chg: '+0.01%', chgColor: '#16D98A', iconBg: 'linear-gradient(135deg,#1a9e7a,#26c79b)', icon: 'attach_money' },
    { name: 'USD Coin', sym: 'USDC', bal: '0.00', val: '$0.00', chg: '0.00%', chgColor: '#8A8699', iconBg: 'linear-gradient(135deg,#2775CA,#4A9EF7)', icon: 'paid' },
    { name: 'Wrapped BTC', sym: 'WBTC', bal: '0.00000000', val: '$0.00', chg: '+1.12%', chgColor: '#16D98A', iconBg: 'linear-gradient(135deg,#F7931A,#FFB347)', icon: 'currency_bitcoin' },
  ];

  return (
    <div className="resp-grid-2-even" style={{ alignItems: 'start', maxWidth: '1280px' }}>

      {/* LEFT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>

        {/* Total value hero */}
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '26px', padding: '24px 26px', background: 'linear-gradient(160deg,rgba(124,92,255,0.16),rgba(255,255,255,0.02) 55%)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ position: 'absolute', top: '-60px', right: '-30px', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,92,255,0.3),transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#A39FB5', fontWeight: 600 }}>Wallet value</div>
              {loading ? <Skeleton h={44} w="60%" r={8} /> : <div className="sg" style={{ fontWeight: 600, fontSize: '40px', letterSpacing: '-0.03em', marginTop: '8px', lineHeight: 1 }}>${usdValue}</div>}
              <div style={{ fontSize: '13px', color: '#8A8699', marginTop: '8px' }}>Across {assets.filter(a => parseFloat(a.bal) > 0).length + 3} assets</div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <RippleButton variant="purple" onClick={() => depositRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '42px', padding: '0 18px', borderRadius: '999px', fontSize: '13.5px', color: '#fff', boxShadow: '0 8px 20px rgba(124,92,255,0.4)' }}>
                <Icon name="add" size={18} color="#fff" />Deposit
              </RippleButton>
              <RippleButton variant="ghost" onClick={() => convertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '42px', padding: '0 18px', borderRadius: '999px', fontSize: '13.5px', color: '#C9BBFF', background: 'rgba(124,92,255,0.14)', borderColor: 'rgba(124,92,255,0.25)' }}>
                <Icon name="swap_vert" size={18} color="#C9BBFF" />Convert
              </RippleButton>
            </div>
          </div>
        </div>

        {/* Assets table */}
        <div style={{ borderRadius: '26px', padding: '22px 24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="sg" style={{ fontWeight: 600, fontSize: '17px', marginBottom: '6px' }}>Your assets</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {assets.map(a => (
              <div key={a.sym} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '15px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '13px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: a.iconBg }}>
                  <Icon name={a.icon} size={23} color="#0B0A14" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14.5px', fontWeight: 700 }}>{a.name}</div>
                  <div style={{ fontSize: '12px', color: '#7E7A8F', marginTop: '2px' }}>{a.bal} {a.sym}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="sg" style={{ fontWeight: 600, fontSize: '14.5px' }}>{a.val}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: a.chgColor, marginTop: '2px' }}>{a.chg}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>

        {/* Deposit card */}
        <div ref={depositRef} style={{ borderRadius: '26px', padding: '24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="sg" style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>Deposit ETH</div>
          <div style={{ fontSize: '12.5px', color: '#8A8699', marginBottom: '18px' }}>{get('wallet','deposit_instructions','Send only Ethereum (ERC-20) to this address.')}</div>

          {contentLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div className="skeleton" style={{ width: '140px', height: '140px', borderRadius: '14px', margin: '0 auto 16px' }} />
              <div className="skeleton" style={{ height: '14px', width: '80%', margin: '0 auto', borderRadius: '7px' }} />
            </div>
          ) : (qrValue || depositQrImageUrl) ? (
            <>
              <div style={{ width: '164px', height: '164px', margin: '0 auto 18px', borderRadius: '18px', background: '#fff', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {depositQrImageUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={depositQrImageUrl} alt="Deposit QR code" style={{ width: '140px', height: '140px', objectFit: 'contain' }} />
                  : <QRCodeSVG value={qrValue!} size={140} bgColor="#ffffff" fgColor="#0B0A14" level="M" />
                }
              </div>
              {copyTarget && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 15px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="sg" style={{ flex: 1, fontSize: '13px', color: '#C5C1D6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shortAddr || copyTarget}</span>
                  <RippleButton variant="none" onClick={copyAddress} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '10px', border: 'none', background: 'rgba(124,92,255,0.18)', flexShrink: 0 }}>
                    <Icon name="content_copy" size={18} color="#C9BBFF" />
                  </RippleButton>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', fontSize: '12px', color: '#FFB55C', background: 'rgba(255,181,92,0.1)', border: '1px solid rgba(255,181,92,0.2)', padding: '10px 13px', borderRadius: '12px' }}>
                <Icon name="info" size={17} color="#FFB55C" style={{ flexShrink: 0 }} />
                Deposits credit after 12 network confirmations.
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '28px 16px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,181,92,0.12)', border: '1px solid rgba(255,181,92,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Icon name="qr_code" size={28} color="#FFB55C" />
              </div>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#C5C1D6', marginBottom: '8px' }}>Deposit address not configured yet</div>
              <div style={{ fontSize: '13px', color: '#6F6B82', lineHeight: 1.5 }}>An administrator needs to set the deposit address before you can deposit. Please check back soon.</div>
            </div>
          )}
        </div>

        {/* Quick convert */}
        <div ref={convertRef} style={{ borderRadius: '26px', padding: '22px 24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="sg" style={{ fontWeight: 600, fontSize: '16px', marginBottom: '14px' }}>Quick convert</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '13px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg,#1a9e7a,#26c79b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="attach_money" size={18} color="#0B0A14" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#8A8699' }}>You pay</div>
                <div className="sg" style={{ fontWeight: 600, fontSize: '16px' }}>500.00 USDT</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#7C5CFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(124,92,255,0.5)' }}>
                <Icon name="arrow_downward" size={18} color="#fff" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '13px', borderRadius: '14px', background: 'rgba(124,92,255,0.1)', border: '1px solid rgba(124,92,255,0.2)' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg,#6e8bff,#9b7bff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="diamond" size={18} color="#0B0A14" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#8A8699' }}>You receive</div>
                <div className="sg" style={{ fontWeight: 600, fontSize: '16px' }}>{(500 / ethPrice).toFixed(5)} ETH</div>
              </div>
            </div>
          </div>
          <RippleButton variant="ghost" onClick={() => show('Currency conversions are coming soon. Stay tuned!', 'info')} style={{ width: '100%', marginTop: '16px', fontSize: '14px', color: '#C9BBFF', padding: '13px', borderRadius: '14px' }}>
            Convert now
          </RippleButton>
        </div>
      </div>
    </div>
  );
}
