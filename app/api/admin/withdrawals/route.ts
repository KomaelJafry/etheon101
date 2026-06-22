import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const url    = new URL(req.url)
  const status = url.searchParams.get('status') || 'pending'
  const search = url.searchParams.get('search') || ''
  const limit  = Math.min(parseInt(url.searchParams.get('limit')  || '50'), 200)
  const offset = parseInt(url.searchParams.get('offset') || '0')

  const supabase = await createServiceClient()

  let query = supabase
    .from('transactions')
    .select(
      `id, type, amount_eth, amount_usd, status, description, created_at, user_id,
       profiles!user_id(id, full_name, email, eth_balance, is_active, eth_wallet_address)`,
      { count: 'exact' }
    )
    .eq('type', 'withdrawal')
    .order('created_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)

  const { data, error: qErr, count } = await query

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  interface WithdrawalRow {
    id: string; type: string; amount_eth: number; amount_usd: number | null
    status: string; description: string | null; created_at: string; user_id: string
    profiles: { id: string; full_name: string; email: string; eth_balance: number; is_active: boolean; eth_wallet_address: string | null } | null
  }

  let rows = (data ?? []) as unknown as WithdrawalRow[]

  if (search) {
    const s = search.toLowerCase()
    rows = rows.filter(r => {
      const p = r.profiles
      return (
        (p?.email     ?? '').toLowerCase().includes(s) ||
        (p?.full_name ?? '').toLowerCase().includes(s) ||
        r.id.toLowerCase().includes(s)
      )
    })
  }

  const total = rows.length
  const paged = rows.slice(offset, offset + limit)

  return NextResponse.json({ withdrawals: paged, total: count ?? total })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAdmin()
  if (error) return error

  const body = await req.json().catch(() => null)
  if (!body?.id || !body?.status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 })
  }

  // approved = admin has reviewed and authorised payout
  // completed = physically paid out
  // failed = rejected — ETH is refunded to customer
  const VALID = ['approved', 'completed', 'failed']
  if (!VALID.includes(body.status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID.join(', ')}` }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { data: existing, error: fetchErr } = await supabase
    .from('transactions')
    .select('id, user_id, status, amount_eth, type')
    .eq('id', body.id)
    .eq('type', 'withdrawal')
    .single()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
  }

  // Terminal guard — completed and failed cannot be changed again
  const TERMINAL = new Set(['completed', 'failed'])
  if (TERMINAL.has(existing.status)) {
    return NextResponse.json({ error: `Withdrawal is already ${existing.status} and cannot be changed.` }, { status: 409 })
  }

  // Transition rules:
  // pending  → approved  ✓
  // pending  → failed    ✓
  // approved → completed ✓
  // approved → failed    ✓
  // (completed/failed are terminal — blocked above)
  const allowed: Record<string, string[]> = {
    pending:  ['approved', 'failed'],
    approved: ['completed', 'failed'],
  }
  if (!allowed[existing.status]?.includes(body.status)) {
    return NextResponse.json({
      error: `Cannot transition from ${existing.status} to ${body.status}.`,
    }, { status: 400 })
  }

  const { error: updErr } = await supabase
    .from('transactions')
    .update({ status: body.status })
    .eq('id', body.id)

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // Refund ETH when rejecting — reverse the balance hold taken at submission
  let refundApplied = false
  if (body.status === 'failed') {
    const amountEth = Math.abs(existing.amount_eth ?? 0)
    if (amountEth > 0) {
      const { error: refundErr } = await supabase.rpc('increment_eth_balance', {
        user_id: existing.user_id,
        delta: amountEth,
      })
      if (refundErr) {
        console.error('[admin/withdrawals] Failed to refund ETH balance on rejection', refundErr, existing.id)
        // Non-fatal: status already updated, log the issue
      } else {
        refundApplied = true
      }
    }
  }

  await logAudit({
    adminId:     user!.id,
    action:      `withdrawal_${body.status}`,
    targetTable: 'transactions',
    targetId:    body.id,
    oldValue:    { status: existing.status },
    newValue:    { status: body.status, note: body.note ?? '', refund_applied: refundApplied },
  })

  return NextResponse.json({ ok: true, refund_applied: refundApplied })
}
