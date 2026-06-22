import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

const ALLOWED_STATUSES = ['credited', 'rejected', 'refunded'] as const
type AllowedStatus = typeof ALLOWED_STATUSES[number]

// Terminal statuses cannot be overwritten — prevents double-credit
const TERMINAL_STATUSES = new Set<string>(['credited', 'rejected', 'refunded'])

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; depositId: string }> }
) {
  const { user: admin, error } = await requireAdmin()
  if (error) return error

  const { id: userId, depositId } = await params

  let body: unknown
  try { body = await req.json() } catch { body = null }

  const status = (body as Record<string, unknown>)?.status as string
  if (!ALLOWED_STATUSES.includes(status as AllowedStatus)) {
    return NextResponse.json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Fetch deposit — verify it belongs to this user
  const { data: existing, error: fetchErr } = await supabase
    .from('payment_events')
    .select('id, status, amount_cents, currency, stripe_event_id, user_id')
    .eq('id', depositId)
    .eq('user_id', userId)
    .single()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
  }

  // Terminal-status guard — prevents double-credit
  if (TERMINAL_STATUSES.has(existing.status)) {
    return NextResponse.json(
      { error: `Deposit is already ${existing.status}. Terminal statuses cannot be changed.` },
      { status: 409 }
    )
  }

  // Mark deposit status + stamp reviewer
  const { error: updateErr } = await supabase
    .from('payment_events')
    .update({ status, reviewed_by: admin!.id, reviewed_at: new Date().toISOString() })
    .eq('id', depositId)
    .eq('user_id', userId)

  if (updateErr) {
    console.error('[admin] Failed to update deposit status', updateErr, depositId)
    return NextResponse.json({ error: 'Failed to update deposit status' }, { status: 500 })
  }

  let newGbpBalance: number | null = null

  // When crediting: add GBP to customer balance + create transaction
  if (status === 'credited') {
    const amountCents = existing.amount_cents ?? 0
    if (amountCents > 0) {
      const amountGbp = amountCents / 100

      // Fetch current balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('gbp_balance')
        .eq('id', userId)
        .single()

      const currentBalance = (profile?.gbp_balance ?? 0) as number
      newGbpBalance = currentBalance + amountGbp

      // Credit balance
      const { error: balErr } = await supabase
        .from('profiles')
        .update({ gbp_balance: newGbpBalance })
        .eq('id', userId)

      if (balErr) {
        console.error('[admin] Failed to credit gbp_balance', balErr, userId)
        return NextResponse.json({ error: 'Deposit marked but balance update failed: ' + balErr.message }, { status: 500 })
      }

      // Transaction record
      const { error: txErr } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'deposit',
          amount_eth: 0,
          amount_gbp: amountGbp,
          status: 'completed',
          description: `Deposit credited after admin review (event ${existing.stripe_event_id ?? depositId})`,
          created_by: admin!.id,
        })

      if (txErr) {
        console.error('[admin] Failed to insert transaction for deposit', txErr, depositId)
        // Non-fatal: balance already credited, log and continue
      }

      await logAudit({
        adminId: admin!.id,
        action: 'deposit_balance_credited',
        targetTable: 'profiles',
        targetId: userId,
        oldValue: { gbp_balance: currentBalance },
        newValue: { gbp_balance: newGbpBalance, amount_gbp: amountGbp, payment_event_id: depositId, stripe_event_id: existing.stripe_event_id },
      })
    }
  }

  await logAudit({
    adminId: admin!.id,
    action: `deposit_status_${status}`,
    targetTable: 'payment_events',
    targetId: depositId,
    oldValue: { status: existing.status, amount_cents: existing.amount_cents, currency: existing.currency },
    newValue: { status, stripe_event_id: existing.stripe_event_id },
  })

  return NextResponse.json({ ok: true, new_gbp_balance: newGbpBalance })
}
