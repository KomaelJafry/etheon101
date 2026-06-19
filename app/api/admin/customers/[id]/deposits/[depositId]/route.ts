import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

const ALLOWED_STATUSES = ['credited', 'rejected', 'refunded'] as const
type AllowedStatus = typeof ALLOWED_STATUSES[number]

// Statuses that are terminal — cannot be overwritten
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

  // Fetch current deposit — verify it belongs to this user
  const { data: existing, error: fetchErr } = await supabase
    .from('payment_events')
    .select('id, status, amount_cents, currency, stripe_event_id, user_id')
    .eq('id', depositId)
    .eq('user_id', userId)
    .single()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
  }

  // Double-credit protection — terminal statuses cannot be changed
  if (TERMINAL_STATUSES.has(existing.status)) {
    return NextResponse.json(
      { error: `Deposit is already ${existing.status}. Terminal statuses cannot be changed.` },
      { status: 409 }
    )
  }

  const { error: updateErr } = await supabase
    .from('payment_events')
    .update({ status })
    .eq('id', depositId)
    .eq('user_id', userId)

  if (updateErr) {
    console.error('[admin] Failed to update deposit status', updateErr, depositId)
    return NextResponse.json({ error: 'Failed to update deposit status' }, { status: 500 })
  }

  await logAudit({
    adminId: admin!.id,
    action: `deposit_status_${status}`,
    targetTable: 'payment_events',
    targetId: depositId,
    oldValue: { status: existing.status, amount_cents: existing.amount_cents, currency: existing.currency },
    newValue: { status, stripe_event_id: existing.stripe_event_id },
  })

  return NextResponse.json({ ok: true })
}
