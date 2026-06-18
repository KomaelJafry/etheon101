'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useApp } from '../AppContext';
import Icon from '../../../components/Icon';
import RippleButton from '../../../components/RippleButton';

interface Txn {
  id: string; type: string; amount_eth: number;
  status: string; description: string; created_at: string;
}

const TYPE_META: Record<string, { icon: string; bg: string; fg: string; label: string }> = {
  mining_reward: { icon: 'bolt',         bg: 'rgba(124,92,255,0.18)', fg: '#C9BBFF', label: 'Mining reward' },
  deposit:       { icon: 'add_circle',   bg: 'rgba(22,217,138,0.16)', fg: '#16D98A', label: 'Deposit' },
  withdrawal:    { icon: 'north_east',   bg: 'rgba(255,107,138,0.16)', fg: '#FF6B8A', label: 'Withdrawal' },
  adjustment:    { icon: 'tune',         bg: 'rgba(255,181,92,0.16)',  fg: '#FFB55C', label: 'Adjustment' },
};

const STATUS_META: Record<string, { color: string; bg: string }> = {
  completed: { color: '#16D98A', bg: 'rgba(22,217,138,0.14)' },
  pending:   { color: '#FFB55C', bg: 'rgba(255,181,92,0.14)' },
  failed:    { color: '#FF6B8A', bg: 'rgba(255,107,138,0.14)' },
};

const FILTERS = ['All', 'Rewards', 'Deposits', 'Withdrawals'];
const FILTER_TYPE: Record<string, string> = { All: '', Rewards: 'mining_reward', Deposits: 'deposit', Withdrawals: 'withdrawal' };

function shortHash(id: string) { return `0x${id.replace(/-/g, '').slice(0, 8)}…${id.slice(-4)}`; }

function SkeletonRow() {
  return (
    <div style={{ padding: '15px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px' }}>
        <div className="skeleton" style={{ height: '13px', width: '40%', borderRadius: '6px' }} />
        <div className="skeleton" style={{ height: '11px', width: '24%', borderRadius: '6px' }} />
      </div>
      <div className="skeleton" style={{ width: '80px', height: '13px', borderRadius: '6px' }} />
    </div>
  );
}

export default function TransactionsPage() {
  const { ethPrice } = useApp();
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
      if (data) setTxns(data);
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- supabase client is stable

  const filtered = FILTER_TYPE[filter]
    ? txns.filter(t => t.type === FILTER_TYPE[filter])
    : txns;

  return (
    <div style={{ maxWidth: '1100px' }}>
      {/* Filters + export */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '999px', padding: '4px' }}>
          {FILTERS.map(f => (
            <RippleButton key={f} variant="none" onClick={() => setFilter(f)} style={{ fontSize: '12.5px', fontWeight: filter === f ? 700 : 600, color: filter === f ? '#0B0A14' : '#A39FB5', background: filter === f ? '#fff' : 'transparent', padding: '7px 15px', borderRadius: '999px' }}>
              {f}
            </RippleButton>
          ))}
        </div>
        <RippleButton variant="ghost" onClick={() => {
          if (!txns.length) return;
          const rows = [['Date','Type','Amount ETH','Status','Description']];
          txns.forEach(t => rows.push([
            new Date(t.created_at).toISOString().slice(0,10),
            t.type,
            t.amount_eth.toString(),
            t.status,
            t.description || '',
          ]));
          const csv = rows.map(r => r.map(v => `"${v.replace(/"/g,'""')}"`).join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'etheon-transactions.csv'; a.click();
          URL.revokeObjectURL(url);
        }} style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '40px', padding: '0 16px', borderRadius: '999px', fontSize: '13px', color: '#C5C1D6' }}>
          <Icon name="download" size={18} color="#C5C1D6" />Export CSV
        </RippleButton>
      </div>

      {/* Table */}
      <div style={{ borderRadius: '24px', overflow: 'hidden', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Desktop header — hidden on mobile via CSS */}
        <div className="tx-table-header">
          <span>Transaction</span><span>Amount</span><span>Value</span><span>Tx hash</span><span style={{ textAlign: 'right' }}>Status</span>
        </div>

        {loading ? (
          <>{[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}</>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <Icon name="receipt_long" size={44} color="#3A3750" />
            <div style={{ marginTop: '14px', fontSize: '15px', fontWeight: 700, color: '#6F6B82' }}>No transactions yet</div>
            <div style={{ fontSize: '13px', color: '#4A4763', marginTop: '5px' }}>Your mining rewards and withdrawals will appear here.</div>
          </div>
        ) : (
          filtered.map(t => {
            const m = TYPE_META[t.type] ?? { icon: 'swap_horiz', bg: 'rgba(255,255,255,0.08)', fg: '#C5C1D6', label: t.type.replace('_', ' ') };
            const s = STATUS_META[t.status] ?? { color: '#8A8699', bg: 'rgba(255,255,255,0.08)' };
            const positive = t.amount_eth >= 0;
            const date = new Date(t.created_at);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return (
              <div key={t.id}>
                {/* Desktop row */}
                <div className="tx-table-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '13px', minWidth: 0 }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.bg }}>
                      <Icon name={m.icon} size={20} color={m.fg} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</div>
                      <div style={{ fontSize: '11.5px', color: '#7E7A8F', marginTop: '2px' }}>{dateStr}</div>
                    </div>
                  </div>
                  <span className="sg" style={{ fontWeight: 600, fontSize: '13.5px', color: positive ? '#16D98A' : '#FF6B8A' }}>
                    {positive ? '+' : ''}{t.amount_eth.toFixed(6)} ETH
                  </span>
                  <span style={{ fontSize: '13px', color: '#A39FB5' }}>£{Math.abs(t.amount_eth * ethPrice).toFixed(2)}</span>
                  <span className="sg" style={{ fontSize: '12.5px', color: '#7E7A8F' }}>{shortHash(t.id)}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: s.color, background: s.bg, padding: '5px 11px', borderRadius: '999px', textTransform: 'capitalize' }}>{t.status}</span>
                  </div>
                </div>

                {/* Mobile card */}
                <div className="tx-card" style={{ padding: '15px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', gap: '13px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '13px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.bg }}>
                    <Icon name={m.icon} size={21} color={m.fg} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{m.label}</div>
                    <div style={{ fontSize: '11.5px', color: '#7E7A8F', marginTop: '2px' }}>{dateStr}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="sg" style={{ fontWeight: 700, fontSize: '14px', color: positive ? '#16D98A' : '#FF6B8A' }}>{positive ? '+' : ''}{t.amount_eth.toFixed(5)} ETH</div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: s.color, background: s.bg, padding: '3px 8px', borderRadius: '999px', textTransform: 'capitalize', display: 'inline-block', marginTop: '3px' }}>{t.status}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
