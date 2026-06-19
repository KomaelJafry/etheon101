import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'

// Plan → monthly GBP value
const PLAN_MRR: Record<string, number> = {
  starter: 45,
  growth:  60,
  annual:  33.25, // 399/12
}

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const supabase = await createServiceClient()

  const [activeRes, cancelledRes, allRes] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('id, status, billing_period, stripe_price_id, created_at, canceled_at')
      .in('status', ['active', 'trialing']),

    supabase
      .from('subscriptions')
      .select('id, status, billing_period, canceled_at')
      .eq('status', 'canceled'),

    supabase
      .from('subscriptions')
      .select('id, status, billing_period, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const active    = (activeRes.data    ?? []) as any[]
  const cancelled = (cancelledRes.data ?? []) as any[]
  const all       = (allRes.data       ?? []) as any[]

  // Deduce plan from billing_period (we don't store plan name, only price_id)
  // Use billing_period: 'annual' → annual, else use MRR mapping
  function planFromRow(r: any): string {
    if (r.billing_period === 'annual') return 'annual'
    // Heuristic: if we had a price_id we'd map it; for now treat monthly subs as 'growth'
    return 'growth'
  }

  const starter  = active.filter(r => planFromRow(r) === 'starter').length
  const growth   = active.filter(r => planFromRow(r) === 'growth').length
  const annual   = active.filter(r => planFromRow(r) === 'annual').length

  const mrr = starter * PLAN_MRR.starter + growth * PLAN_MRR.growth + annual * PLAN_MRR.annual
  const arr = mrr * 12

  // Monthly new subscriptions for last 6 months
  const now = new Date()
  const monthly: { month: string; new_subs: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    const start = d.toISOString()
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString()
    const newSubs = all.filter(r => r.created_at >= start && r.created_at < end).length
    monthly.push({ month: label, new_subs: newSubs })
  }

  const totalActive    = active.length
  const totalCancelled = cancelled.length
  const totalEver      = all.length
  const conversionRate = totalEver > 0 ? Math.round((totalActive / totalEver) * 100) : 0
  const avgRevPerCust  = totalActive > 0 ? (mrr / totalActive) : 0

  return NextResponse.json({
    plans: { starter, growth, annual },
    mrr:   Math.round(mrr * 100) / 100,
    arr:   Math.round(arr * 100) / 100,
    active_subscriptions:    totalActive,
    cancelled_subscriptions: totalCancelled,
    conversion_rate:         conversionRate,
    avg_revenue_per_customer: Math.round(avgRevPerCust * 100) / 100,
    monthly_growth: monthly,
  })
}
