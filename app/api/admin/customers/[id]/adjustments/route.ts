import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const adjustSchema = z.object({
  type: z.enum(['credit', 'debit', 'reward', 'correction', 'bonus', 'manual_review']),
  amount_eth: z.number().positive(),
  amount_usd: z.number().min(0).optional(),
  reason: z.string().min(3).max(500),
  customer_note: z.string().max(500).optional(),
  internal_note: z.string().min(3).max(1000),
})

// Map adjustment type to transaction type for existing schema
function toTransactionType(type: string): 'reward' | 'deposit' | 'withdrawal' | 'conversion' {
  if (['credit', 'reward', 'bonus', 'correction'].includes(type) || type === 'manual_review') return 'reward'
  if (type === 'debit') return 'withdrawal'
  return 'reward'
}

function isDelta(type: string): boolean {
  return type !== 'debit'
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { profile: admin, error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = adjustSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { type, amount_eth, amount_usd, reason, customer_note, internal_note } = parsed.data
  const supabase = await createServiceClient()

  // Verify target user exists
  const { data: targetUser } = await supabase.from('profiles').select('id, eth_balance, full_name').eq('id', id).single()
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Prevent debit below zero
  if (type === 'debit' && targetUser.eth_balance < amount_eth) {
    return NextResponse.json({ error: 'Insufficient balance for debit' }, { status: 400 })
  }

  const txType = toTransactionType(type)
  const delta = isDelta(type) ? amount_eth : -amount_eth

  // Build description
  const desc = customer_note
    ? `${reason} — ${customer_note}`
    : reason

  // Create transaction record
  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .insert({
      user_id: id,
      type: txType,
      amount_eth,
      amount_usd: amount_usd ?? null,
      status: 'completed',
      description: desc,
      created_by: admin!.id,
    })
    .select()
    .single()

  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 })

  // Atomically update ETH balance
  await supabase.rpc('increment_eth_balance', { user_id: id, delta })

  // Audit log with full context
  await logAudit({
    adminId: admin!.id,
    action: `admin_adjustment_${type}`,
    targetTable: 'transactions',
    targetId: tx.id,
    oldValue: { eth_balance: targetUser.eth_balance },
    newValue: {
      adjustment_type: type,
      amount_eth,
      amount_usd,
      reason,
      internal_note,
      customer_note,
      new_balance: targetUser.eth_balance + delta,
    },
  })

  return NextResponse.json({ transaction: tx, new_balance: targetUser.eth_balance + delta }, { status: 201 })
}
