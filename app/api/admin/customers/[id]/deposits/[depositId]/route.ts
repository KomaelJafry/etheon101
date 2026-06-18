import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'

const ALLOWED_STATUSES = ['credited', 'rejected', 'refunded'] as const
type AllowedStatus = typeof ALLOWED_STATUSES[number]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; depositId: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id: userId, depositId } = await params

  let body: unknown
  try { body = await req.json() } catch { body = null }

  const status = (body as Record<string, unknown>)?.status as string
  if (!ALLOWED_STATUSES.includes(status as AllowedStatus)) {
    return NextResponse.json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { error: updateErr } = await supabase
    .from('payment_events')
    .update({ status })
    .eq('id', depositId)
    .eq('user_id', userId)

  if (updateErr) {
    console.error('[admin] Failed to update deposit status', updateErr, depositId)
    return NextResponse.json({ error: 'Failed to update deposit status' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
