'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { createBrowserClient } from '@supabase/ssr';
import Icon from '../../../components/Icon';
import RippleButton from '../../../components/RippleButton';
import { EtheonCrystal } from '@/components/EtheonBrand';
import { OWNER_ADMIN_EMAIL } from '@/lib/admin-config';

interface ContentRow { page: string; element_key: string; value: string; description?: string }


const FIELD_GROUPS: { page: string; label: string; icon: string; fields: { key: string; label: string; desc: string; multiline?: boolean; isLink?: boolean; isAddress?: boolean }[] }[] = [
  {
    page: 'wallet', label: 'Wallet & Deposits', icon: 'account_balance_wallet',
    fields: [
      { key: 'deposit_address', label: 'Deposit address (QR target)', desc: 'ETH wallet address shown in the deposit QR code and copy button. Required for deposits.', isAddress: true },
      { key: 'deposit_qr_target', label: 'QR code target value', desc: 'Override: the value encoded in the QR code (use this to embed a payment URL or custom string instead of the raw address).', multiline: false },
      { key: 'deposit_qr_image_url', label: 'Custom QR image URL', desc: 'Optional: paste a URL to a custom QR image. If set, this image is shown instead of the generated QR code.', isLink: true },
      { key: 'deposit_instructions', label: 'Deposit instructions', desc: 'Text shown under the deposit card.', multiline: true },
      { key: 'deposit_warning', label: 'Deposit warning note', desc: 'Warning shown below the deposit address (e.g. "ERC-20 only").', multiline: true },
      { key: 'minimum_deposit_note', label: 'Minimum deposit note', desc: 'Text explaining the minimum deposit amount, if any.', multiline: true },
    ],
  },
  {
    page: 'withdrawal', label: 'Withdrawals', icon: 'north_east',
    fields: [
      { key: 'min_withdrawal_note', label: 'Minimum withdrawal note', desc: 'Text shown on the withdrawals page about minimum amounts.', multiline: true },
      { key: 'withdrawal_instructions', label: 'Withdrawal instructions', desc: 'Instructions shown above the withdrawal form.', multiline: true },
    ],
  },
  {
    page: 'global', label: 'Global / Contact', icon: 'public',
    fields: [
      { key: 'support_email', label: 'Support / contact email', desc: 'Email shown on legal pages, support page, and error messages.', isLink: true },
      { key: 'support_cta', label: 'Support call-to-action text', desc: 'Short text shown in the support CTA section.' },
      { key: 'company_name', label: 'Company name', desc: 'Used in footers and emails.' },
      { key: 'deposit_cta_href', label: 'Deposit CTA link', desc: 'URL the "Add funds" / deposit buttons navigate to. Default: /deposit.', isLink: true },
    ],
  },
  {
    page: 'landing', label: 'Landing Page', icon: 'home',
    fields: [
      { key: 'hero_headline', label: 'Hero headline', desc: 'Main headline on the landing page.' },
      { key: 'hero_subheadline', label: 'Hero subheadline', desc: 'Paragraph text below the hero headline.', multiline: true },
      { key: 'cta_primary_label', label: 'Primary CTA label', desc: 'Text of the main call-to-action button.' },
      { key: 'cta_primary_href', label: 'Primary CTA link', desc: 'URL the primary CTA button navigates to.', isLink: true },
      { key: 'stat_miners', label: 'Stat: Miners', desc: 'Number shown in "Active miners" stat card (e.g. "5M+").' },
      { key: 'stat_uptime', label: 'Stat: Uptime', desc: 'Uptime percentage shown on landing (e.g. "99.98%").' },
      { key: 'step1_title', label: 'Step 1 title', desc: 'Title of the first how-it-works step.' },
      { key: 'step1_desc', label: 'Step 1 description', desc: 'Description of step 1.', multiline: true },
      { key: 'step2_title', label: 'Step 2 title', desc: 'Title of the second how-it-works step.' },
      { key: 'step2_desc', label: 'Step 2 description', desc: 'Description of step 2.', multiline: true },
      { key: 'step3_title', label: 'Step 3 title', desc: 'Title of the third how-it-works step.' },
      { key: 'step3_desc', label: 'Step 3 description', desc: 'Description of step 3.', multiline: true },
    ],
  },
  {
    page: 'legal', label: 'Legal Pages', icon: 'gavel',
    fields: [
      { key: 'privacy_intro', label: 'Privacy policy intro', desc: 'Introductory text shown on the privacy policy page.', multiline: true },
      { key: 'terms_intro', label: 'Terms of service intro', desc: 'Introductory text shown on the terms page.', multiline: true },
      { key: 'security_intro', label: 'Security page intro', desc: 'Introductory text shown on the security page.', multiline: true },
    ],
  },
  {
    page: 'auth', label: 'Auth Pages', icon: 'lock',
    fields: [
      { key: 'auth_google_unavailable_message', label: 'Google unavailable message', desc: 'Message shown when a user clicks "Continue with Google" while it is temporarily unavailable.', multiline: true },
      { key: 'login_headline', label: 'Login headline', desc: 'Headline shown on the sign-in form.' },
      { key: 'login_subtext', label: 'Login subtext', desc: 'Paragraph below the login headline.' },
      { key: 'signup_headline', label: 'Sign-up headline', desc: 'Headline shown on the create account form.' },
      { key: 'brand_panel_headline', label: 'Brand panel headline', desc: 'Large headline on the left panel of the auth page.', multiline: true },
      { key: 'security_badge_text', label: 'Security badge text', desc: 'Small text inside the security badge on the auth page.' },
    ],
  },
  {
    page: 'dashboard', label: 'Dashboard', icon: 'dashboard',
    fields: [
      { key: 'upgrade_card_title', label: 'Upgrade card title', desc: 'Title in the "Upgrade now" sidebar card.' },
      { key: 'upgrade_card_body', label: 'Upgrade card body', desc: 'Description text in the upgrade card.', multiline: true },
    ],
  },
  {
    page: 'mining', label: 'Mining & Progress Rules', icon: 'bolt',
    fields: [
      { key: 'pool_name', label: 'Mining pool name', desc: 'Pool name shown in the mining console header.' },
      { key: 'mining_badge_text', label: 'Mining badge text', desc: 'Badge text shown on the mining page (e.g. "Etheon Rewards Mining").' },
      { key: 'mining_daily_reward_usd', label: 'Daily reward target (USD)', desc: 'Displayed daily reward amount in USD. Default: 20. This is a display value only.' },
      { key: 'mining_minimum_start_balance_usd', label: 'Mining unlock: minimum balance (USD)', desc: 'Minimum USD balance required to start rewards mining. Default: 100.' },
      { key: 'withdrawal_unlock_balance_usd', label: 'Withdrawal unlock: minimum balance (USD)', desc: 'Display threshold shown in progress bars. Default: 1000.' },
      { key: 'deposit_cta_href', label: 'Deposit CTA link', desc: 'URL for deposit calls-to-action. Default: /deposit.', isLink: true },
      { key: 'mining_unlock_title', label: 'Mining unlock card: title', desc: 'Title of the mining unlock progress card.' },
      { key: 'mining_unlock_body', label: 'Mining unlock card: body', desc: 'Description text of the mining unlock card.', multiline: true },
      { key: 'mining_unlock_cta_label', label: 'Mining unlock card: CTA label', desc: 'Button label on the mining unlock card.' },
      { key: 'mining_locked_subscription_text', label: 'Mining locked: subscription message', desc: 'Message shown when user has no active subscription.', multiline: true },
      { key: 'mining_locked_balance_text', label: 'Mining locked: balance message', desc: 'Message shown when user has a subscription but insufficient balance.', multiline: true },
      { key: 'mining_ready_text', label: 'Mining ready: label', desc: 'Label shown when mining is eligible and ready.' },
      { key: 'mining_complete_text', label: 'Mining complete: message', desc: 'Message shown after a session completes.' },
      { key: 'withdrawal_unlock_title', label: 'Withdrawal unlock card: title', desc: 'Title of the withdrawal unlock progress card.' },
      { key: 'withdrawal_unlock_body', label: 'Withdrawal unlock card: body', desc: 'Description text of the withdrawal unlock card.', multiline: true },
      { key: 'withdrawal_unlock_cta_label', label: 'Withdrawal unlock card: CTA label', desc: 'Button label on the withdrawal unlock card.' },
      { key: 'withdrawal_locked_text', label: 'Withdrawal locked notice', desc: 'Notice shown when withdrawals are locked due to insufficient balance.', multiline: true },
    ],
  },
  {
    page: 'payment', label: 'Stripe Payment Links', icon: 'credit_card',
    fields: [
      { key: 'payment_link_20',  label: '$20 payment link',  desc: 'Stripe Payment Link for the $20 amount. Must start with https://buy.stripe.com/ or https://checkout.stripe.com/.', isLink: true },
      { key: 'payment_link_50',  label: '$50 payment link',  desc: 'Stripe Payment Link for the $50 amount.', isLink: true },
      { key: 'payment_link_100', label: '$100 payment link', desc: 'Stripe Payment Link for the $100 amount.', isLink: true },
      { key: 'payment_link_250', label: '$250 payment link', desc: 'Stripe Payment Link for the $250 amount.', isLink: true },
      { key: 'payment_link_500', label: '$500 payment link', desc: 'Stripe Payment Link for the $500 amount.', isLink: true },
      { key: 'payment_options_title',    label: 'Payment page title',    desc: 'Headline shown on the /deposit page. Default: "Add funds to your account".' },
      { key: 'payment_options_subtitle', label: 'Payment page subtitle', desc: 'Subheading under the title on /deposit.', multiline: true },
      { key: 'payment_options_notice',   label: 'Payment notice',        desc: 'Notice shown inside the card section, above amount tiles.', multiline: true },
      { key: 'payment_options_footer_note', label: 'Payment footer note', desc: 'Note shown below the payment cards (e.g. email matching reminder).', multiline: true },
      { key: 'payment_success_message',  label: 'Success page message',  desc: 'Message shown on /deposit/success after Stripe redirects back.', multiline: true },
      { key: 'payment_cancel_message',   label: 'Cancel page message',   desc: 'Message shown on /deposit/cancel when the user exits Stripe without paying.', multiline: true },
    ],
  },
];

export default function AdminContentPage() {
  const router = useRouter();
  const [content, setContent] = useState<Record<string, string>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      if ((user.email ?? '').toLowerCase() !== OWNER_ADMIN_EMAIL) {
        setAccessDenied(true); setLoading(false); return;
      }
      const res = await fetch('/api/admin/content');
      if (!res.ok) { setAccessDenied(true); setLoading(false); return; }
      const json = await res.json();
      const map: Record<string, string> = {};
      (json.content as ContentRow[]).forEach(r => { map[`${r.page}:${r.element_key}`] = r.value; });
      setContent(map);
      setLoading(false);
    }
    load();
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  if (accessDenied) return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: "'Manrope',sans-serif" }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'rgba(255,107,138,0.12)', border: '1px solid rgba(255,107,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="lock" size={28} color="#FF6B8A" />
      </div>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '22px', color: '#F5F4FF' }}>Access denied</div>
      <div style={{ fontSize: '13.5px', color: '#7D789E' }}>This area is restricted to the platform owner only.</div>
      <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '11px 22px', borderRadius: '12px', background: 'rgba(155,123,255,0.14)', border: '1px solid rgba(155,123,255,0.3)', color: '#C9BBFF', fontWeight: 700, fontSize: '13.5px', textDecoration: 'none' }}>
        <Icon name="arrow_back" size={16} color="#C9BBFF" />Back to dashboard
      </Link>
    </div>
  );

  function getVal(page: string, key: string) {
    const id = `${page}:${key}`;
    return id in edits ? edits[id] : (content[id] ?? '');
  }

  function setVal(page: string, key: string, val: string) {
    const id = `${page}:${key}`;
    setEdits(e => ({ ...e, [id]: val }));
    setSaved(s => ({ ...s, [id]: false }));
  }

  async function save(page: string, key: string) {
    const id = `${page}:${key}`;
    const value = getVal(page, key).trim();
    if (!value) { setErrors(e => ({ ...e, [id]: 'Value cannot be empty.' })); return; }
    setSaving(s => ({ ...s, [id]: true }));
    setErrors(e => ({ ...e, [id]: '' }));
    const res = await fetch('/api/admin/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page, element_key: key, value }),
    });
    if (res.ok) {
      setContent(c => ({ ...c, [id]: value }));
      setSaved(s => ({ ...s, [id]: true }));
      setTimeout(() => setSaved(s => ({ ...s, [id]: false })), 2500);
    } else {
      const j = await res.json().catch(() => ({}));
      setErrors(e => ({ ...e, [id]: j.error || 'Failed to save.' }));
    }
    setSaving(s => ({ ...s, [id]: false }));
  }

  const group = FIELD_GROUPS[activeGroup];

  return (
    <div style={{ minHeight: '100vh', background: '#0B0A14', color: '#F4F3FA', fontFamily: "'Manrope', system-ui, sans-serif", padding: '32px' }}>
      <div style={{ position: 'fixed', top: '-220px', left: '8%', width: '620px', height: '620px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,92,255,0.18),transparent 62%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg,#9b7bff,#6e8bff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(124,92,255,0.4)' }}>
                <EtheonCrystal size={22} />
              </div>
              <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '20px', letterSpacing: '-0.02em' }}>Etheon</span>
              <span style={{ padding: '4px 11px', borderRadius: '999px', background: 'rgba(255,181,92,0.14)', border: '1px solid rgba(255,181,92,0.25)', fontSize: '11.5px', fontWeight: 700, color: '#FFB55C' }}>Admin</span>
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '26px', letterSpacing: '-0.02em' }}>Content editor</h1>
            <div style={{ fontSize: '13px', color: '#8A8699', marginTop: '3px' }}>Edit customer-facing text, links, and the deposit address</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/admin" style={{ textDecoration: 'none' }}>
              <RippleButton variant="ghost" style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '42px', padding: '0 18px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, color: '#C9BBFF' }}>
                <Icon name="manage_accounts" size={17} color="#C9BBFF" />Users
              </RippleButton>
            </Link>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <RippleButton variant="ghost" style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '42px', padding: '0 18px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, color: '#C9BBFF' }}>
                <Icon name="arrow_back" size={17} color="#C9BBFF" />Back to app
              </RippleButton>
            </Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '20px', alignItems: 'start' }}>

          {/* Sidebar nav */}
          <div style={{ borderRadius: '22px', padding: '12px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: '24px' }}>
            {FIELD_GROUPS.map((g, i) => (
              <button key={g.page} onClick={() => setActiveGroup(i)} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 13px', borderRadius: '13px', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: "'Manrope'", fontWeight: 600, fontSize: '13.5px', background: activeGroup === i ? 'rgba(124,92,255,0.18)' : 'transparent', color: activeGroup === i ? '#C9BBFF' : '#8A8699', marginBottom: '2px', transition: 'all .15s ease' }}>
                <Icon name={g.icon} size={17} color={activeGroup === i ? '#C9BBFF' : '#6F6B82'} />
                {g.label}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ borderRadius: '26px', padding: '28px', background: 'linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(124,92,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={group.icon} size={22} color="#C9BBFF" />
              </div>
              <div>
                <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '18px' }}>{group.label}</div>
                <div style={{ fontSize: '12.5px', color: '#6F6B82', marginTop: '2px' }}>Changes save immediately per field.</div>
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '88px', borderRadius: '16px' }} />)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                {group.fields.map(f => {
                  const id = `${group.page}:${f.key}`;
                  const val = getVal(group.page, f.key);
                  const isSaving = saving[id];
                  const isSaved = saved[id];
                  const err = errors[id];
                  const isDirty = id in edits && edits[id] !== (content[id] ?? '');

                  return (
                    <div key={f.key}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#E9E7F2' }}>{f.label}</div>
                          <div style={{ fontSize: '12px', color: '#6F6B82', marginTop: '3px' }}>{f.desc}</div>
                        </div>
                        <RippleButton variant={isSaved ? 'none' : 'purple'} onClick={() => save(group.page, f.key)} disabled={isSaving || !isDirty} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 14px', borderRadius: '999px', fontSize: '12.5px', fontWeight: 700, flexShrink: 0, color: isSaved ? '#16D98A' : '#fff', background: isSaved ? 'rgba(22,217,138,0.14)' : isSaving || !isDirty ? 'rgba(124,92,255,0.3)' : '#7C5CFF', cursor: isSaving || !isDirty ? 'not-allowed' : 'pointer', border: isSaved ? '1px solid rgba(22,217,138,0.3)' : 'none' }}>
                          <Icon name={isSaved ? 'check' : 'save'} size={15} color={isSaved ? '#16D98A' : '#fff'} />
                          {isSaving ? 'Saving…' : isSaved ? 'Saved' : 'Save'}
                        </RippleButton>
                      </div>

                      {f.multiline ? (
                        <textarea
                          value={val}
                          onChange={e => setVal(group.page, f.key, e.target.value)}
                          rows={3}
                          style={{ width: '100%', padding: '13px 15px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${err ? 'rgba(255,107,138,0.4)' : 'rgba(255,255,255,0.1)'}`, color: '#F4F3FA', fontFamily: "'Manrope'", fontSize: '14px', outline: 'none', resize: 'vertical', lineHeight: 1.55, boxSizing: 'border-box' }}
                          placeholder={`Enter ${f.label.toLowerCase()}…`}
                        />
                      ) : (
                        <input
                          type="text"
                          value={val}
                          onChange={e => setVal(group.page, f.key, e.target.value)}
                          style={{ width: '100%', padding: '13px 15px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${err ? 'rgba(255,107,138,0.4)' : 'rgba(255,255,255,0.1)'}`, color: '#F4F3FA', fontFamily: f.isAddress ? "'Space Grotesk'" : "'Manrope'", fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                          placeholder={f.isAddress ? '0x…' : f.isLink ? 'https://… or mailto:…' : `Enter ${f.label.toLowerCase()}…`}
                        />
                      )}

                      {err && <div style={{ marginTop: '7px', fontSize: '12.5px', color: '#FF6B8A' }}>{err}</div>}

                      {/* QR preview for deposit address */}
                      {f.isAddress && val && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '14px', padding: '14px', borderRadius: '16px', background: 'rgba(124,92,255,0.07)', border: '1px solid rgba(124,92,255,0.18)' }}>
                          <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: '#fff', padding: '6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <QRCodeSVG value={val} size={68} bgColor="#ffffff" fgColor="#0B0A14" level="M" />
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#C9BBFF', marginBottom: '4px' }}>QR preview</div>
                            <div className="sg" style={{ fontSize: '12px', color: '#8A8699', wordBreak: 'break-all', lineHeight: 1.4 }}>{val}</div>
                            <button onClick={() => navigator.clipboard.writeText(val)} style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(124,92,255,0.3)', background: 'rgba(124,92,255,0.1)', color: '#C9BBFF', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope'" }}>
                              <Icon name="content_copy" size={13} color="#C9BBFF" />Copy
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

