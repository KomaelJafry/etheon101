import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const supabase = await createServiceClient();

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ mining_status: 'paused' })
    .eq('id', user!.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
