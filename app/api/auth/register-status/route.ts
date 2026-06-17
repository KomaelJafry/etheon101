import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createServiceClient();
  const { data, error } = await supabase.rpc('get_registration_status');
  if (error) return NextResponse.json({ open: false }, { status: 500 });
  return NextResponse.json(data);
}
