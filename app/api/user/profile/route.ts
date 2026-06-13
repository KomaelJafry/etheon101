import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const supabase = await createClient()
  const { data, error: dbErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, eth_balance, hashrate_th, hashrate_capacity_th, mining_status, vip_tier, eth_wallet_address, created_at')
    .eq('id', user!.id)
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}

const updateSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  eth_wallet_address: z.string().optional(),
})

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const supabase = await createClient()
  const { data, error: dbErr } = await supabase
    .from('profiles')
    .update(parsed.data)
    .eq('id', user!.id)
    .select('id, full_name, eth_wallet_address')
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}
