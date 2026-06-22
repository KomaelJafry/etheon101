import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const supabase = await createServiceClient()

  const [
    customersRes,
    subscriptionsRes,
    pendingDepositsRes,
    ethTotalRes,
    pendingChecksRes,
    recentSignupsRes,
    recentActionsRes,
    creditedTodayRes,
    rejectedTodayRes,
    totalReviewedRes,
  ] = await Promise.all([
    // Total customers
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer'),

    // Active subscriptions
    supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['active', 'trialing']),

    // Pending deposit reviews (with customer profile)
    supabase
      .from('payment_events')
      .select('id, amount_cents, currency, created_at, user_id, profiles(full_name, email)', { count: 'exact' })
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })
      .limit(10),

    // Total ETH held by customers
    supabase
      .from('profiles')
      .select('eth_balance')
      .eq('role', 'customer'),

    // Customers with pending verification checks
    supabase
      .from('verification_checks')
      .select('user_id', { count: 'exact', head: true })
      .eq('status', 'pending'),

    // Recent signups
    supabase
      .from('profiles')
      .select('id, full_name, email, created_at, is_active')
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .limit(6),

    // Recent admin actions
    supabase
      .from('audit_logs')
      .select('id, action, target_table, target_id, created_at, admin_id')
      .order('created_at', { ascending: false })
      .limit(10),

    // Credited today
    supabase
      .from('payment_events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'credited')
      .gte('reviewed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),

    // Rejected today
    supabase
      .from('payment_events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected')
      .gte('reviewed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),

    // Total deposits reviewed (all time)
    supabase
      .from('payment_events')
      .select('*', { count: 'exact', head: true })
      .in('status', ['credited', 'rejected', 'refunded']),
  ])

  // Total ETH
  const totalEth = (ethTotalRes.data ?? []).reduce(
    (sum, p) => sum + (p.eth_balance ?? 0),
    0
  )

  return NextResponse.json({
    stats: {
      total_customers:         customersRes.count ?? 0,
      active_subscriptions:    subscriptionsRes.count ?? 0,
      pending_deposits:        pendingDepositsRes.count ?? 0,
      total_eth_held:          totalEth,
      pending_checks:          pendingChecksRes.count ?? 0,
      credited_today:          creditedTodayRes.count ?? 0,
      rejected_today:          rejectedTodayRes.count ?? 0,
      total_deposits_reviewed: totalReviewedRes.count ?? 0,
    },
    pending_deposits: pendingDepositsRes.data ?? [],
    recent_signups:   recentSignupsRes.data ?? [],
    recent_actions:   recentActionsRes.data ?? [],
  })
}
