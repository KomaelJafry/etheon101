import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const createSchema = z.object({
  user_id: z.string().uuid(),
  type: z.enum(['reward', 'deposit', 'withdrawal', 'conversion']),
  amount_eth: z.number().positive(),
  amount_usd: z.number().optional(),
  status: z.enum(['pending', 'completed', 'failed']).default('completed'),
  tx_hash: z.string().optional(),
  description: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const { profile, error } = await requireAdmin()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })

  const supabase = await createServiceClient()
  const { data, error: dbErr } = await supabase
    .from('transactions')
    .insert({ ...parsed.data, created_by: profile!.id })
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  // Update user ETH balance
  const delta = ['reward', 'deposit', 'conversion'].includes(parsed.data.type)
    ? parsed.data.amount_eth
    : -parsed.data.amount_eth

  await supabase.rpc('increment_eth_balance', { user_id: parsed.data.user_id, delta })

  await logAudit({
    adminId: profile!.id,
    action: 'create_transaction',
    targetTable: 'transactions',
    targetId: data.id,
    newValue: parsed.data as Record<string, unknown>,
  })

  return NextResponse.json(data, { status: 201 })
}
