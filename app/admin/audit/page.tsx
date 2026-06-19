'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Icon from '../../../components/Icon';
import RippleButton from '../../../components/RippleButton';
import { OWNER_ADMIN_EMAIL } from '@/lib/admin-config';

interface AuditLog {
  id: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  admin_id: string;
  profiles?: { full_name: string; email: string } | null;
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function actionColor(action: string): string {
  if (action.includes('credit') || action.includes('approved') || action.includes('complete')) return '#16D98A';
  if (action.includes('reject') || action.includes('failed') || action.includes('delete')) return '#FF6B8A';
  if (action.includes('adjust') || action.includes('edit') || action.includes('update')) return '#FFB55C';
  if (action.includes('impersonat')) return '#FF8DA3';
  return '#9b7bff';
}
function actionIcon(action: string): string {
  if (action.includes('credit')) return 'account_balance_wallet';
  if (action.includes('deposit')) return 'payments';
  if (action.includes('withdrawal')) return 'north_east';
  if (action.includes('adjust')) return 'tune';
  if (action.includes('check') || action.includes('verification')) return 'verified_user';
  if (action.includes('message')) return 'mail';
  if (action.includes('note')) return 'note';
  if (action.includes('content')) return 'edit_note';
  if (action.includes('impersonat')) return 'switch_account';
  return 'admin_panel_settings';
}

export default function AdminAuditPage() {
  const router = useRouter();
  const [logs, setLogs]       = useState<AuditLog[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const LIMIT = 50;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => { document.title = 'Audit Log | Etheon Admin'; }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      if ((user.email ?? '').toLowerCase() !== OWNER_ADMIN_EMAIL) { setAccessDenied(true); }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(page * LIMIT) });
    const res = await fetch(`/api/admin/audit-logs?${params}`);
    if (res.ok) {
      const json = await res.json();
      let rows: AuditLog[] = json.logs ?? [];
      if (search.trim()) {
        const s = search.toLowerCase();
        rows = rows.filter(r =>
          r.action.toLowerCase().includes(s) ||
          (r.target_table ?? '').toLowerCase().includes(s) ||
          (r.target_id ?? '').toLowerCase().includes(s)
        );
      }
      setLogs(rows);
      setTotal(json.total ?? 0);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    const headers = ['Timestamp','Action','Table','Target ID','Admin'];
    const rows = logs.map(l => [
      fmtDateTime(l.created_at),
      l.action,
      l.target_table ?? '',
      l.target_id ?? '',
      l.profiles?.email ?? l.admin_id,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `etheon-audit-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (accessDenied) return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <Icon name="lock" size={40} color="#FF6B8A" />
        <div style={{ marginTop: '12px', fontSize: '18px', fontWeight: 700, color: '#FF6B8A', fontFamily: "'Space Grotesk'" }}>Access denied</div>
        <Link href="/admin" style={{ display: 'block', marginTop: '12px', color: '#9b7bff', textDecoration: 'none', fontSize: '13px' }}>← Back to admin</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', color: '#F4F3FA', fontFamily: "'Manrope', system-ui, sans-serif", padding: '32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Link href="/admin" style={{ fontSize: '13px', color: '#7E7A8F', textDecoration: 'none' }}>Admin</Link>
              <span style={{ color: '#3A3750' }}>/</span>
              <span style={{ fontSize: '13px', color: '#C9BBFF', fontWeight: 700 }}>Audit Log</span>
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '26px' }}>Audit Command Centre</h1>
            <div style={{ fontSize: '13px', color: '#8A8699', marginTop: '3px' }}>Complete record of every admin action — searchable, filterable, exportable</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <RippleButton variant="ghost" onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '40px', padding: '0 16px', borderRadius: '12px', fontWeight: 700, fontSize: '13px' }}>
              <Icon name="download" size={16} color="#C9BBFF" /> Export CSV
            </RippleButton>
            <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#C9BBFF', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
              <Icon name="arrow_back" size={15} color="#C9BBFF" />Back
            </Link>
          </div>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 14px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '20px', maxWidth: '420px' }}>
          <Icon name="search" size={17} color="#6F6B82" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search actions, tables, target IDs…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#F4F3FA', fontSize: '13px', fontFamily: 'inherit' }} />
        </div>

        <div style={{ fontSize: '12px', color: '#6F6B82', marginBottom: '14px' }}>
          {loading ? 'Loading…' : `${logs.length} of ${total} records`}
        </div>

        {/* Log list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '64px', borderRadius: '14px' }} />
            ))
          ) : logs.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Icon name="history" size={36} color="#3A3750" />
              <div style={{ fontWeight: 700, color: '#4A4763', marginTop: '10px' }}>No audit records found</div>
            </div>
          ) : logs.map(log => {
            const color = actionColor(log.action);
            const icon  = actionIcon(log.action);
            const isExp = expanded === log.id;
            return (
              <div key={log.id}
                style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', background: isExp ? 'rgba(255,255,255,0.03)' : 'transparent', overflow: 'hidden', cursor: 'pointer', transition: 'background 0.15s' }}
                onClick={() => setExpanded(isExp ? null : log.id)}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '34px 1fr 180px 120px', gap: '14px', padding: '14px 18px', alignItems: 'center' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `${color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={icon} size={17} color={color} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#E9E7F2', fontFamily: 'monospace' }}>{log.action.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: '11.5px', color: '#6F6B82', marginTop: '2px' }}>
                      {log.target_table && <span>{log.target_table}</span>}
                      {log.target_id && <span> · {log.target_id.length > 20 ? log.target_id.slice(0, 20) + '…' : log.target_id}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#6F6B82', textAlign: 'right' }}>
                    {log.profiles?.email ?? log.admin_id.slice(0, 14) + '…'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#5A5673', textAlign: 'right' }}>{fmtDateTime(log.created_at)}</div>
                </div>
                {isExp && (
                  <div style={{ padding: '0 18px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                      {log.old_value && Object.keys(log.old_value).length > 0 && (
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6F6B82', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Before</div>
                          <pre style={{ margin: 0, fontSize: '11.5px', color: '#B6B3D9', background: 'rgba(255,107,138,0.06)', border: '1px solid rgba(255,107,138,0.15)', borderRadius: '8px', padding: '10px 12px', overflow: 'auto', maxHeight: '160px' }}>{JSON.stringify(log.old_value, null, 2)}</pre>
                        </div>
                      )}
                      {log.new_value && Object.keys(log.new_value).length > 0 && (
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6F6B82', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>After</div>
                          <pre style={{ margin: 0, fontSize: '11.5px', color: '#B6B3D9', background: 'rgba(22,217,138,0.06)', border: '1px solid rgba(22,217,138,0.15)', borderRadius: '8px', padding: '10px 12px', overflow: 'auto', maxHeight: '160px' }}>{JSON.stringify(log.new_value, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
                      <div><span style={{ fontSize: '11px', color: '#5A5673' }}>Log ID: </span><span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#7E7A8F' }}>{log.id}</span></div>
                      {log.profiles && <div><span style={{ fontSize: '11px', color: '#5A5673' }}>Admin: </span><span style={{ fontSize: '11px', color: '#7E7A8F' }}>{log.profiles.full_name} ({log.profiles.email})</span></div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '24px' }}>
            <RippleButton variant="ghost" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ height: '38px', padding: '0 18px', borderRadius: '10px', fontWeight: 700, fontSize: '13px' }}>
              ← Prev
            </RippleButton>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#7E7A8F' }}>Page {page + 1} of {Math.ceil(total / LIMIT)}</span>
            <RippleButton variant="ghost" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * LIMIT >= total} style={{ height: '38px', padding: '0 18px', borderRadius: '10px', fontWeight: 700, fontSize: '13px' }}>
              Next →
            </RippleButton>
          </div>
        )}
      </div>
    </div>
  );
}
