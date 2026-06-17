'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useApp } from '../AppContext';

function Skel({ h = 16, w = '100%' }: { h?: number; w?: string }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: 8, display: 'inline-block' }} />;
}
import Icon from '../../../components/Icon';
import RippleButton from '../../../components/RippleButton';

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}
const VIP_LABEL = ['Standard', 'Bronze', 'Silver', 'Gold', 'Platinum'];

interface Toggle { label: string; sub: string; key: string; value: boolean }

export default function SettingsPage() {
  const router = useRouter();
  const { profile, refreshProfile, loading } = useApp();
  const [email, setEmail] = useState('');
  // nameOverride tracks user edits; null means "show profile value" so it stays in sync automatically
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const fullName = nameOverride !== null ? nameOverride : (profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [toggles, setToggles] = useState({
    twoFA: true, biometric: false, emailRewards: true, pushPrice: true, marketing: false, autoCompound: true,
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email || '');
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- supabase client is stable

  async function handleSave() {
    setSaving(true); setMsg('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
    setMsg(error ? 'Could not save changes.' : 'Changes saved successfully.');
    if (!error) refreshProfile();
    setSaving(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  function toggle(key: string) {
    setToggles(t => ({ ...t, [key]: !t[key as keyof typeof t] }));
  }

  const settingsGroups: { name: string; items: Toggle[] }[] = [
    {
      name: 'Security',
      items: [
        { label: 'Two-factor authentication', sub: 'Require a code on every sign-in', key: 'twoFA', value: toggles.twoFA },
        { label: 'Biometric login', sub: 'Sign in with Face ID or fingerprint', key: 'biometric', value: toggles.biometric },
      ],
    },
    {
      name: 'Notifications',
      items: [
        { label: 'Email reward alerts', sub: 'Get notified when a reward is paid', key: 'emailRewards', value: toggles.emailRewards },
        { label: 'Price movement alerts', sub: 'ETH price change notifications', key: 'pushPrice', value: toggles.pushPrice },
        { label: 'Product updates', sub: 'News, tips, and platform changes', key: 'marketing', value: toggles.marketing },
      ],
    },
    {
      name: 'Mining',
      items: [
        { label: 'Auto-compound rewards', sub: 'Reinvest earned ETH into hashrate automatically', key: 'autoCompound', value: toggles.autoCompound },
      ],
    },
  ];

  const vipLabel = VIP_LABEL[Math.min(profile?.vip_tier ?? 0, 4)];

  return (
    <div style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Profile card */}
      <div style={{ borderRadius: '26px', padding: '24px 26px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '22px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'linear-gradient(135deg,#3a3550,#222031)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '22px', color: '#C9BBFF', flexShrink: 0 }}>
            {profile ? initials(profile.full_name || 'U') : '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {loading ? <Skel h={22} w="140px" /> : <div className="sg" style={{ fontWeight: 600, fontSize: '19px' }}>{profile?.full_name || 'Your name'}</div>}
            <div style={{ fontSize: '13px', color: '#8A8699', marginTop: '2px' }}>{loading ? <Skel h={13} w="180px" /> : `${email} · ${vipLabel} tier`}</div>
          </div>
          <RippleButton variant="ghost" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '40px', padding: '0 16px', borderRadius: '999px', fontSize: '13px', color: '#C9BBFF', background: 'rgba(124,92,255,0.14)', cursor: saving ? 'not-allowed' : 'pointer' }}>
            <Icon name="edit" size={17} color="#C9BBFF" />{saving ? 'Saving…' : 'Edit'}
          </RippleButton>
        </div>

        {msg && (
          <div style={{ padding: '10px 14px', borderRadius: '12px', marginBottom: '16px', background: msg.includes('success') ? 'rgba(22,217,138,0.1)' : 'rgba(255,107,138,0.1)', border: `1px solid ${msg.includes('success') ? 'rgba(22,217,138,0.3)' : 'rgba(255,107,138,0.3)'}`, fontSize: '13.5px', color: msg.includes('success') ? '#16D98A' : '#FF6B8A' }}>
            {msg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#A39FB5', marginBottom: '8px' }}>Full name</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 15px', borderRadius: '13px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Icon name="person" size={19} color="#6F6B82" style={{ flexShrink: 0 }} />
              <input value={fullName} onChange={e => setNameOverride(e.target.value)} placeholder="Your full name" style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: '#F4F3FA', fontFamily: "'Manrope'", fontSize: '15px' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#A39FB5', marginBottom: '8px' }}>Email address</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 15px', borderRadius: '13px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Icon name="mail" size={19} color="#6F6B82" style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '15px', color: '#6A6479' }}>{email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings groups */}
      {settingsGroups.map(g => (
        <div key={g.name} style={{ borderRadius: '26px', padding: '8px 26px 12px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="sg" style={{ fontWeight: 600, fontSize: '14px', color: '#8A8699', letterSpacing: '0.03em', textTransform: 'uppercase', padding: '18px 0 6px' }}>{g.name}</div>
          {g.items.map(t => (
            <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '15px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14.5px', fontWeight: 700 }}>{t.label}</div>
                <div style={{ fontSize: '12.5px', color: '#7E7A8F', marginTop: '3px' }}>{t.sub}</div>
              </div>
              <RippleButton variant="none" onClick={() => toggle(t.key)} style={{ position: 'relative', width: '46px', height: '26px', borderRadius: '999px', border: 'none', flexShrink: 0, background: t.value ? '#7C5CFF' : 'rgba(255,255,255,0.12)', transition: 'background .2s ease', padding: 0 }}>
                <span style={{ position: 'absolute', top: '3px', left: t.value ? '23px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.3)', transition: 'left .2s ease' }} />
              </RippleButton>
            </div>
          ))}
        </div>
      ))}

      {/* Sign out */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderRadius: '20px', padding: '18px 24px', background: 'rgba(255,107,138,0.07)', border: '1px solid rgba(255,107,138,0.18)' }}>
        <Icon name="logout" size={22} color="#FF6B8A" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#FF8DA3' }}>Sign out of all devices</div>
          <div style={{ fontSize: '12.5px', color: '#9A8A92', marginTop: '2px' }}>End every active Etheon session immediately.</div>
        </div>
        <RippleButton variant="danger" onClick={handleSignOut} style={{ height: '38px', padding: '0 16px', borderRadius: '999px', fontSize: '13px', color: '#FF6B8A' }}>
          Sign out
        </RippleButton>
      </div>
    </div>
  );
}
