'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '../../../components/Icon';

interface HealthData {
  env:    Record<string, boolean>;
  tables: Record<string, boolean>;
  counts: Record<string, number | null>;
  checks: {
    ui_content_seeded:      boolean;
    migration_004_applied:  boolean;
    stripe_webhook_env_set: boolean;
    google_auth_status:     string;
  };
  current_user: { id: string; email: string; role: string };
}

function Row({ label, ok, note }: { label: string; ok: boolean; note?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <Icon name={ok ? 'check_circle' : 'cancel'} size={18} color={ok ? '#16D98A' : '#FF6B8A'} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 600, color: ok ? '#E9E7F2' : '#FF8DA3', fontFamily: "'Space Grotesk', monospace" }}>{label}</div>
        {note && <div style={{ fontSize: '12px', color: '#7E7A8F', marginTop: '2px' }}>{note}</div>}
      </div>
      <span style={{ fontSize: '11.5px', fontWeight: 700, color: ok ? '#16D98A' : '#FF6B8A', background: ok ? 'rgba(22,217,138,0.1)' : 'rgba(255,107,138,0.1)', padding: '3px 10px', borderRadius: '999px' }}>
        {ok ? 'OK' : 'Missing'}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: '20px', padding: '22px 24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '16px' }}>
      <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '15px', marginBottom: '12px', color: '#C9BBFF' }}>{title}</div>
      {children}
    </div>
  );
}

export default function AdminSystemPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/admin/system-health')
      .then(r => { if (!r.ok) throw new Error('Access denied'); return r.json(); })
      .then(setData)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', color: '#F4F3FA', fontFamily: "'Manrope', system-ui, sans-serif", padding: '32px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <Link href="/admin" style={{ color: '#8A8699', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>← Admin</Link>
          <span style={{ color: '#3A3752' }}>/</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#C9BBFF' }}>System health</span>
        </div>

        <h1 style={{ margin: '0 0 6px', fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '24px', letterSpacing: '-0.02em' }}>System health</h1>
        <p style={{ margin: '0 0 28px', fontSize: '13.5px', color: '#7E7A8F' }}>
          Shows configuration and setup status. No secret values are displayed.
        </p>

        {loading && <div style={{ color: '#7E7A8F', fontSize: '14px' }}>Checking…</div>}
        {err && <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,107,138,0.1)', border: '1px solid rgba(255,107,138,0.25)', color: '#FF8DA3', fontSize: '14px' }}>{err}</div>}

        {data && (
          <>
            <Section title="Environment variables">
              {Object.entries(data.env).map(([k, v]) => <Row key={k} label={k} ok={v} />)}
            </Section>

            <Section title="Database tables">
              {Object.entries(data.tables).map(([k, v]) => (
                <Row key={k} label={k} ok={v}
                  note={v ? `${data.counts[k] ?? '?'} rows` : 'Table missing — run the relevant migration SQL'} />
              ))}
            </Section>

            <Section title="Setup checks">
              <Row label="ui_content seeded"       ok={data.checks.ui_content_seeded}      note={data.checks.ui_content_seeded ? undefined : 'Run the seed SQL from the setup guide'} />
              <Row label="Migration 004 applied"   ok={data.checks.migration_004_applied}   note={data.checks.migration_004_applied ? undefined : 'Run supabase/migrations/004_customers_system.sql in Supabase SQL Editor'} />
              <Row label="Stripe webhook env set"  ok={data.checks.stripe_webhook_env_set}  note={data.checks.stripe_webhook_env_set ? undefined : 'Add STRIPE_WEBHOOK_SECRET after creating webhook in Stripe dashboard'} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0' }}>
                <Icon name="info" size={18} color="#FFB55C" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '13.5px', color: '#A39FB5' }}>Google sign-in: <strong style={{ color: '#FFB55C' }}>{data.checks.google_auth_status}</strong></div>
              </div>
            </Section>

            <Section title="Current session">
              <div style={{ fontSize: '13.5px', color: '#A39FB5', lineHeight: 2 }}>
                <div>Email: <span style={{ color: '#E9E7F2', fontFamily: 'monospace' }}>{data.current_user.email}</span></div>
                <div>Role: <span style={{ color: data.current_user.role === 'admin' ? '#16D98A' : '#FFB55C', fontWeight: 700 }}>{data.current_user.role}</span></div>
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
