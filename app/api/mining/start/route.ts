import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { createServiceClient } from '@/lib/supabase/server';

// Server-side only: allows shorter cycle for testing (set MINING_CYCLE_SECONDS=120 in env)
// Production default: 86400 seconds (24 hours). Never exposed to clients.
const CYCLE_SECONDS = parseInt(process.env.MINING_CYCLE_SECONDS ?? '86400', 10);

export async function POST() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const supabase = await createServiceClient();

  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('mining_status, mining_session_started_at, mining_session_ends_at, mining_reward_credited_at, is_active, account_status, admin_mining_override, admin_subscription_override, admin_subscription_status')
    .eq('id', user!.id)
    .single();

  if (pErr || !profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  if (profile.account_status !== 'active')
    return NextResponse.json({ error: 'Account inactive' }, { status: 403 });

  // Eligibility check (mirrors mining page logic)
  const override = profile.admin_mining_override;
  const isSubscribed =
    profile.is_active ||
    (profile.admin_subscription_override && profile.admin_subscription_status === 'active');
  const eligible =
    override === 'unlocked' || override === 'active' ? true
    : override === 'locked' || override === 'paused' ? false
    : isSubscribed;

  if (!eligible) return NextResponse.json({ error: 'Mining not eligible' }, { status: 403 });

  // If session is already active and not yet expired, return it (no duplicate start)
  if (profile.mining_status === 'active' && profile.mining_session_ends_at) {
    const endsAt = new Date(profile.mining_session_ends_at as string);
    if (endsAt > new Date()) {
      return NextResponse.json({
        started_at: profile.mining_session_started_at,
        ends_at: profile.mining_session_ends_at,
        cycle_seconds: CYCLE_SECONDS,
      });
    }
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + CYCLE_SECONDS * 1000);

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({
      mining_status: 'active',
      mining_session_started_at: now.toISOString(),
      mining_session_ends_at: endsAt.toISOString(),
      mining_reward_credited_at: null, // reset guard for new cycle
    })
    .eq('id', user!.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({
    started_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
    cycle_seconds: CYCLE_SECONDS,
  });
}
