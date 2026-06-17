import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  amount_eth: z.number().positive(),
  wallet_address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const { amount_eth, wallet_address } = parsed.data;
  const service = await createServiceClient();

  const { data: profile } = await service.from('profiles').select('eth_balance').eq('id', user.id).single();
  if (!profile || profile.eth_balance < amount_eth) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
  }

  const { error } = await service.from('transactions').insert({
    user_id: user.id,
    type: 'withdrawal',
    amount_eth: -amount_eth,
    status: 'pending',
    description: `Withdrawal to ${wallet_address}`,
  });

  if (error) return NextResponse.json({ error: 'Failed to create withdrawal' }, { status: 500 });

  await service.rpc('increment_eth_balance', { user_id: user.id, delta: -amount_eth });

  return NextResponse.json({ success: true });
}
