import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  amount_eth: z.number().positive().max(1000),
  wallet_address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
});

const DEFAULT_WITHDRAWAL_UNLOCK_USD = 1000;

async function fetchEthPriceUsd(): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { signal: controller.signal, headers: { Accept: 'application/json' } }
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json() as { ethereum?: { usd?: number } };
    const price = json?.ethereum?.usd;
    return typeof price === 'number' && price > 0 ? price : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const { amount_eth, wallet_address } = parsed.data;
  const service = await createServiceClient();

  const { data: profile } = await service
    .from('profiles')
    .select('eth_balance, gbp_balance, is_active, eth_wallet_address, admin_withdrawal_override')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  // Rule 1: active subscription required
  if (!profile.is_active) {
    return NextResponse.json({ error: 'An active plan is required to make withdrawals.' }, { status: 403 });
  }

  // Rule 2: admin override check
  const override = profile.admin_withdrawal_override as string | null;
  if (override === 'locked') {
    return NextResponse.json({ error: 'Your withdrawal access has been restricted. Please contact support.' }, { status: 403 });
  }
  if (override === 'under_review') {
    return NextResponse.json({ error: 'Your withdrawal access is currently under review. Please contact support.' }, { status: 403 });
  }

  // Rule 3: wallet address must match registered address
  if (!profile.eth_wallet_address) {
    return NextResponse.json({
      error: 'No withdrawal address configured. Add your wallet address in Settings first.',
    }, { status: 400 });
  }
  if (wallet_address.toLowerCase() !== profile.eth_wallet_address.toLowerCase()) {
    return NextResponse.json({
      error: 'Wallet address does not match your registered withdrawal address.',
    }, { status: 400 });
  }

  // Rule 4: total account balance (ETH + GBP) must meet unlock threshold
  // Skip threshold check if admin has explicitly unlocked
  if (override !== 'unlocked') {
    const { data: thresholdRow } = await service
      .from('ui_content')
      .select('value')
      .eq('page', 'mining')
      .eq('element_key', 'withdrawal_unlock_balance_usd')
      .maybeSingle();

    const thresholdUsd = thresholdRow?.value
      ? (parseFloat(thresholdRow.value) || DEFAULT_WITHDRAWAL_UNLOCK_USD)
      : DEFAULT_WITHDRAWAL_UNLOCK_USD;

    const ethPrice = await fetchEthPriceUsd();
    if (ethPrice === null) {
      return NextResponse.json({
        error: 'Unable to verify your balance at this time. Please try again in a moment.',
      }, { status: 503 });
    }

    // Total balance = ETH value + GBP deposits
    const totalBalanceGbp = (profile.eth_balance ?? 0) * ethPrice + (profile.gbp_balance ?? 0);
    if (totalBalanceGbp < thresholdUsd) {
      return NextResponse.json({
        error: `Withdrawals unlock when your total balance reaches £${thresholdUsd.toLocaleString()}. Your current balance is £${totalBalanceGbp.toFixed(2)}.`,
      }, { status: 403 });
    }
  }

  // Rule 5: sufficient ETH balance for the withdrawal amount
  if ((profile.eth_balance ?? 0) < amount_eth) {
    return NextResponse.json({ error: 'Insufficient ETH balance.' }, { status: 400 });
  }

  // Rule 6: no existing pending or approved withdrawal (prevent duplicates)
  const { data: existingPending } = await service
    .from('transactions')
    .select('id, status, created_at')
    .eq('user_id', user.id)
    .eq('type', 'withdrawal')
    .in('status', ['pending', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPending) {
    return NextResponse.json({
      error: `You already have a withdrawal request under review (status: ${existingPending.status}). Please wait for it to be processed before submitting a new one.`,
    }, { status: 409 });
  }

  // Deduct ETH balance immediately to hold funds during review
  const { error: deductErr } = await service.rpc('increment_eth_balance', { user_id: user.id, delta: -amount_eth });
  if (deductErr) {
    return NextResponse.json({ error: 'Failed to hold balance. Please try again.' }, { status: 500 });
  }

  const { error: insertError } = await service.from('transactions').insert({
    user_id: user.id,
    type: 'withdrawal',
    amount_eth: -amount_eth,
    status: 'pending',
    description: `Withdrawal request to ${wallet_address} — pending admin review`,
  });

  if (insertError) {
    // Rollback the balance deduction
    await service.rpc('increment_eth_balance', { user_id: user.id, delta: amount_eth });
    return NextResponse.json({ error: 'Failed to submit withdrawal request.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Withdrawal request submitted for review.' });
}
