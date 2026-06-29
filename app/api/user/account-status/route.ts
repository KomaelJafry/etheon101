import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const supabase = await createServiceClient()

  const [profileRes, checksRes, msgsRes, threshRes, subRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, eth_balance, gbp_balance, mining_status, is_active, eth_wallet_address').eq('id', user!.id).single(),
    supabase.from('verification_checks').select('key, label, status, customer_note, customer_visible').eq('user_id', user!.id).eq('customer_visible', true).order('created_at'),
    supabase.from('customer_messages').select('id, title, body, type, is_read').eq('user_id', user!.id).eq('is_visible', true).order('created_at', { ascending: false }),
    supabase.from('ui_content').select('element_key, value').in('element_key', ['mining_minimum_start_balance_usd', 'withdrawal_unlock_balance_usd']),
    supabase.from('subscriptions').select('status, billing_period, current_period_end').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(1),
  ])

  if (profileRes.error) {
    // Profile row missing (trigger may not have fired). Return a safe empty setup state
    // rather than crashing the customer account page.
    const thresholds2: Record<string, number> = {}
    for (const row of threshRes.data ?? []) thresholds2[row.element_key] = parseFloat(row.value) || 0
    return NextResponse.json({
      profile: { id: user!.id, full_name: null, email: user!.email ?? '', eth_balance: 0, mining_status: 'offline', is_active: false, eth_wallet_address: null },
      subscription: null,
      checks: [],
      messages: [],
      config: {
        miningThreshold: thresholds2['mining_minimum_start_balance_usd'] ?? 100,
        withdrawalThreshold: thresholds2['withdrawal_unlock_balance_usd'] ?? 1000,
      },
    })
  }

  const thresholds: Record<string, number> = {}
  for (const row of threshRes.data ?? []) {
    thresholds[row.element_key] = parseFloat(row.value) || 0
  }

  const sub = subRes.data?.[0] ?? null

  return NextResponse.json({
    profile: profileRes.data,
    subscription: sub,
    checks: checksRes.data ?? [],
    messages: msgsRes.data ?? [],
    config: {
      miningThreshold: thresholds['mining_minimum_start_balance_usd'] ?? 100,
      withdrawalThreshold: thresholds['withdrawal_unlock_balance_usd'] ?? 1000,
    },
  })
}
