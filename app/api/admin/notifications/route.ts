import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const supabase = await createServiceClient()

  const since24h = new Date(Date.now() - 86_400_000).toISOString()

  const [depositsRes, withdrawalsRes, signupsRes, pendingChecksRes] = await Promise.all([
    supabase
      .from('payment_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review'),

    supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'withdrawal')
      .eq('status', 'pending'),

    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'customer')
      .gte('created_at', since24h),

    supabase
      .from('verification_checks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  const pending_deposits    = depositsRes.count    ?? 0
  const pending_withdrawals = withdrawalsRes.count ?? 0
  const new_signups_24h     = signupsRes.count     ?? 0
  const pending_checks      = pendingChecksRes.count ?? 0

  const total = pending_deposits + pending_withdrawals + pending_checks

  return NextResponse.json({
    pending_deposits,
    pending_withdrawals,
    new_signups_24h,
    pending_checks,
    total,
  })
}
