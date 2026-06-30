import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { createServiceClient } from '@/lib/supabase/server';

const REWARD_GBP = 20;

export async function POST() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const supabase = await createServiceClient();

  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('mining_status, mining_session_ends_at, mining_reward_credited_at, gbp_balance')
    .eq('id', user!.id)
    .single();

  if (pErr || !profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  if (profile.mining_status !== 'active')
    return NextResponse.json({ error: 'Session not active' }, { status: 400 });

  if (!profile.mining_session_ends_at)
    return NextResponse.json({ error: 'No active session' }, { status: 400 });

  const endsAt = new Date(profile.mining_session_ends_at as string);
  if (endsAt > new Date())
    return NextResponse.json({ error: 'Session not complete yet' }, { status: 400 });

  // Double-credit guard: atomically claim the reward slot.
  // Only one request will pass the IS NULL filter and get a row back.
  const now = new Date().toISOString();
  const { data: claimed } = await supabase
    .from('profiles')
    .update({ mining_reward_credited_at: now })
    .eq('id', user!.id)
    .is('mining_reward_credited_at', null)
    .select('id');

  if (!claimed || claimed.length === 0)
    return NextResponse.json({ error: 'Reward already credited', already_credited: true }, { status: 409 });

  // Safe to update balance + status — we have exclusive claim
  const newBalance = Number(profile.gbp_balance ?? 0) + REWARD_GBP;
  await supabase
    .from('profiles')
    .update({ gbp_balance: newBalance, mining_status: 'offline' })
    .eq('id', user!.id);

  // Create transaction record
  const { error: txErr } = await supabase.from('transactions').insert({
    user_id: user!.id,
    type: 'reward',
    amount_gbp: REWARD_GBP,
    amount_eth: 0,
    amount_usd: 0,
    status: 'completed',
    description: 'Mining cycle reward credited',
    created_by: user!.id,
  });
  if (txErr) console.error('mining/complete: transaction insert failed', txErr);

  return NextResponse.json({ ok: true, reward_gbp: REWARD_GBP, new_balance: newBalance });
}
