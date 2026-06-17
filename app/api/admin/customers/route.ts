import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const search  = searchParams.get('search') ?? ''
  const limit   = Math.min(parseInt(searchParams.get('limit') ?? '100'), 200)
  const offset  = parseInt(searchParams.get('offset') ?? '0')

  const supabase = await createServiceClient()

  // Fetch thresholds from ui_content (defaults match frontend)
  const { data: thresholdRows } = await supabase
    .from('ui_content')
    .select('element_key, value')
    .in('element_key', ['mining_minimum_start_balance_usd', 'withdrawal_unlock_balance_usd'])

  const thresholds: Record<string, number> = {}
  for (const row of thresholdRows ?? []) {
    thresholds[row.element_key] = parseFloat(row.value) || 0
  }
  const miningThreshold     = thresholds['mining_minimum_start_balance_usd'] ?? 100
  const withdrawalThreshold = thresholds['withdrawal_unlock_balance_usd'] ?? 1000

  let query = supabase
    .from('profiles')
    .select(`
      id, email, full_name, role, eth_balance, hashrate_th, hashrate_capacity_th,
      mining_status, vip_tier, is_active, created_at, eth_wallet_address,
      subscriptions(id, status, billing_period, current_period_end),
      verification_checks(key, status)
    `, { count: 'exact' })
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,id.eq.${search.match(/^[0-9a-f-]{36}$/) ? search : '00000000-0000-0000-0000-000000000000'}`)
  }

  const { data, count, error: dbErr } = await query
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  // Annotate each user with computed status fields.
  // ETH price is applied client-side; we return eth_balance and thresholds.
  const users = (data ?? []).map(u => {
    const sub = Array.isArray(u.subscriptions) ? u.subscriptions[0] : u.subscriptions
    const checks = Array.isArray(u.verification_checks) ? u.verification_checks : []
    const checksTotal = checks.length
    const checksComplete = checks.filter((c: { status: string }) => c.status === 'complete').length
    const subStatus = sub?.status ?? 'none'
    const hasActiveSub = ['active', 'trialing'].includes(subStatus)

    return {
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      eth_balance: u.eth_balance ?? 0,
      hashrate_th: u.hashrate_th ?? 0,
      mining_status: u.mining_status,
      vip_tier: u.vip_tier,
      is_active: u.is_active,
      created_at: u.created_at,
      has_wallet: !!u.eth_wallet_address,
      subscription_status: subStatus,
      subscription_plan: sub?.billing_period ?? null,
      has_active_subscription: hasActiveSub,
      checks_total: checksTotal,
      checks_complete: checksComplete,
    }
  })

  return NextResponse.json({
    users,
    total: count,
    config: { miningThreshold, withdrawalThreshold },
  })
}
