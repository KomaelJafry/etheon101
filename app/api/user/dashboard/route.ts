import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const supabase = await createClient()

  const [profileRes, subscriptionRes, messagesRes, promptsRes, earningsRes, transactionsRes] = await Promise.all([
    supabase.from('profiles')
      .select('eth_balance, hashrate_th, hashrate_capacity_th, mining_status, vip_tier, full_name')
      .eq('id', user!.id)
      .single(),

    supabase.from('subscriptions')
      .select('status, billing_period, current_period_end, cancel_at_period_end')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),

    supabase.from('customer_messages')
      .select('id, title, body, type, is_read, created_at')
      .eq('user_id', user!.id)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase.from('verification_prompts')
      .select('id, type, title, body, cta_label, cta_url, is_dismissible')
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),

    supabase.from('earnings_history')
      .select('date, eth_earned, usd_value')
      .eq('user_id', user!.id)
      .order('date', { ascending: false })
      .limit(30),

    supabase.from('transactions')
      .select('id, type, amount_eth, amount_usd, status, description, created_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return NextResponse.json({
    profile: profileRes.data,
    subscription: subscriptionRes.data,
    messages: messagesRes.data ?? [],
    prompts: promptsRes.data ?? [],
    earnings: earningsRes.data ?? [],
    recent_transactions: transactionsRes.data ?? [],
  })
}
