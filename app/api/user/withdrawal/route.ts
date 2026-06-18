import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  amount_eth: z.number().positive().max(1000),
  wallet_address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
});

const DEFAULT_WITHDRAWAL_UNLOCK_USD = 1000;

/** Fetch current ETH/USD price from CoinGecko free API. Returns null on failure. */
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

  // Fetch profile — need balance, subscription status, and registered wallet address
  const { data: profile } = await service
    .from('profiles')
    .select('eth_balance, is_active, eth_wallet_address')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  // Rule 1: active subscription required
  if (!profile.is_active) {
    return NextResponse.json({ error: 'An active plan is required to make withdrawals.' }, { status: 403 });
  }

  // Rule 2: wallet address must match the registered address on the account
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

  // Rule 3: total account balance must meet the USD unlock threshold
  // Read admin-configured threshold; default is $1,000 USD.
  const { data: thresholdRow } = await service
    .from('ui_content')
    .select('value')
    .eq('page', 'mining')
    .eq('element_key', 'withdrawal_unlock_balance_usd')
    .maybeSingle();

  const thresholdUsd = thresholdRow?.value
    ? (parseFloat(thresholdRow.value) || DEFAULT_WITHDRAWAL_UNLOCK_USD)
    : DEFAULT_WITHDRAWAL_UNLOCK_USD;

  // Get current ETH price to calculate USD balance
  const ethPrice = await fetchEthPriceUsd();
  if (ethPrice === null) {
    return NextResponse.json({
      error: 'Unable to verify your balance at this time. Please try again in a moment.',
    }, { status: 503 });
  }

  const balanceUsd = profile.eth_balance * ethPrice;
  if (balanceUsd < thresholdUsd) {
    return NextResponse.json({
      error: `Withdrawals unlock when your total balance reaches £${thresholdUsd.toLocaleString()}. Your current balance is £${balanceUsd.toFixed(2)}.`,
    }, { status: 403 });
  }

  // Rule 4: sufficient ETH balance for the requested withdrawal amount
  if (profile.eth_balance < amount_eth) {
    return NextResponse.json({ error: 'Insufficient balance.' }, { status: 400 });
  }

  // Insert withdrawal request as pending for admin review — this is not an instant payout
  const { error: insertError } = await service.from('transactions').insert({
    user_id: user.id,
    type: 'withdrawal',
    amount_eth: -amount_eth,
    status: 'pending',
    description: `Withdrawal request to ${wallet_address} — pending admin review`,
  });

  if (insertError) return NextResponse.json({ error: 'Failed to submit withdrawal request.' }, { status: 500 });

  // Hold balance while request is pending to prevent duplicate requests
  await service.rpc('increment_eth_balance', { user_id: user.id, delta: -amount_eth });

  return NextResponse.json({ success: true, message: 'Withdrawal request submitted for review.' });
}
