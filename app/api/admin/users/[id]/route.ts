import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const updateSchema = z.object({
  eth_balance: z.number().min(0).optional(),
  hashrate_th: z.number().min(0).optional(),
  hashrate_capacity_th: z.number().min(0).optional(),
  mining_status: z.enum(['active', 'paused', 'offline']).optional(),
  vip_tier: z.enum(['Bronze', 'Silver', 'Gold', 'Platinum']).optional(),
  is_active: z.boolean().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const supabase = await createServiceClient()
  const { data, error: dbErr } = await supabase
    .from('profiles')
    .select(`
      *, subscriptions(*), transactions(id, type, amount_eth, amount_usd, status, created_at),
      customer_messages(*), verification_prompts(*), earnings_history(date, eth_earned)
    `)
    .eq('id', id)
    .single()

  if (dbErr) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { profile: adminProfile, error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })

  const supabase = await createServiceClient()

  // Get current values for audit log
  const { data: current } = await supabase.from('profiles').select('*').eq('id', id).single()

  const { data, error: dbErr } = await supabase
    .from('profiles')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  await logAudit({
    adminId: adminProfile!.id,
    action: 'update_user_profile',
    targetTable: 'profiles',
    targetId: id,
    oldValue: current as Record<string, unknown>,
    newValue: parsed.data as Record<string, unknown>,
  })

  return NextResponse.json(data)
}
