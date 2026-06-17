'use client';
import { useState } from 'react';
import { useApp } from '../AppContext';

function Skeleton({ h = 20, w = '100%', r = 10 }: { h?: number; w?: string | number; r?: number }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r, flexShrink: 0 }} />;
}
import Icon from '../../../components/Icon';
import RippleButton from '../../../components/RippleButton';

export default function WalletPage() {
  const { profile, ethPrice, loading } = useApp();
  const [copied, setCopied] = useState(false);

  const ethBalance = profile?.eth_balance ?? 0;
  const usdValue = (ethBalance * ethPrice).toFixed(2);

  function copyAddress() {
    navigator.clipboard.writeText('0x71C7656EC7ab88b098defB751B7401B5f6d8976a3F9b82e4d').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const assets = [
    { name: 'Ethereum', sym: 'ETH', bal: ethBalance.toFixed(6), val: `$${usdValue}`, chg: '+2.41%', chgColor: '#16D98A', iconBg: 'linear-gradient(135deg,#627EEA,#4A6CF7)', icon: 'diamond' },
    { name: 'Tether USD', sym: 'USDT', bal: '0.00', val: '$0.00', chg: '+0.01%', chgColor: '#16D98A', iconBg: 'linear-gradient(135deg,#1a9e7a,#26c79b)', icon: 'attach_money' },
    { name: 'USD Coin', sym: 'USDC', bal: '0.00', val: '$0.00', chg: '0.00%', chgColor: '#8A8699', iconBg: 'linear-gradient(135deg,#2775CA,#4A9EF7)', icon: 'paid' },
    { name: 'Wrapped BTC', sym: 'WBTC', bal: '0.00000000', val: '$0.00', chg: '+1.12%', chgColor: '#16D98A', iconBg: 'linear-gradient(135deg,#F7931A,#FFB347)', icon: 'currency_bitcoin' },
  ];

  return (
    <div className="resp-grid-2-even" style={{ alignItems: 'start', maxWidth: '1280px' }}>

      {/* LEFT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

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
              <RippleButton variant="purple" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '42px', padding: '0 18px', borderRadius: '999px', fontSize: '13.5px', color: '#fff', boxShadow: '0 8px 20px rgba(124,92,255,0.4)' }}>
                <Icon name="add" size={18} color="#fff" />Deposit
              </RippleButton>
              <RippleButton variant="ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '42px', padding: '0 18px', borderRadius: '999px', fontSize: '13.5px', color: '#C9BBFF', background: 'rgba(124,92,255,0.14)', borderColor: 'rgba(124,92,255,0.25)' }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Deposit card */}
        <div style={{ borderRadius: '26px', padding: '24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="sg" style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>Deposit ETH</div>
          <div style={{ fontSize: '12.5px', color: '#8A8699', marginBottom: '18px' }}>Send only Ethereum (ERC-20) to this address.</div>
          {/* QR placeholder */}
          <div style={{ width: '160px', height: '160px', margin: '0 auto 18px', borderRadius: '18px', background: '#fff', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '8px', backgroundImage: 'linear-gradient(45deg,#0B0A14 25%,transparent 25%,transparent 75%,#0B0A14 75%),linear-gradient(45deg,#0B0A14 25%,transparent 25%,transparent 75%,#0B0A14 75%)', backgroundSize: '18px 18px', backgroundPosition: '0 0,9px 9px', opacity: 0.92 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 15px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="sg" style={{ flex: 1, fontSize: '13px', color: '#C5C1D6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>0x71C…a3F9b82e4d</span>
            <RippleButton variant="none" onClick={copyAddress} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '10px', border: 'none', background: copied ? 'rgba(22,217,138,0.18)' : 'rgba(124,92,255,0.18)', flexShrink: 0 }}>
              <Icon name={copied ? 'check' : 'content_copy'} size={18} color={copied ? '#16D98A' : '#C9BBFF'} />
            </RippleButton>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', fontSize: '12px', color: '#FFB55C', background: 'rgba(255,181,92,0.1)', border: '1px solid rgba(255,181,92,0.2)', padding: '10px 13px', borderRadius: '12px' }}>
            <Icon name="info" size={17} color="#FFB55C" style={{ flexShrink: 0 }} />
            Deposits credit after 12 network confirmations.
          </div>
        </div>

        {/* Quick convert */}
        <div style={{ borderRadius: '26px', padding: '22px 24px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
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
          <RippleButton variant="purple" style={{ width: '100%', marginTop: '16px', fontSize: '14px', color: '#fff', padding: '13px', borderRadius: '14px', boxShadow: '0 8px 20px rgba(124,92,255,0.4)' }}>
            Convert now
          </RippleButton>
        </div>
      </div>
    </div>
  );
}
