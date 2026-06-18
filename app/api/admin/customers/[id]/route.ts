import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const supabase = await createServiceClient()

  const [profileRes, checksRes, notesRes, msgsRes, threshRes, depositsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select(`
        *, subscriptions(*),
        transactions(id, type, amount_eth, amount_usd, status, description, created_at),
        customer_messages(id, title, body, type, is_read, is_visible, created_at)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('verification_checks')
      .select('*')
      .eq('user_id', id)
      .order('created_at'),
    supabase
      .from('admin_notes')
      .select('id, note, created_by, created_at, updated_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('customer_messages')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('ui_content')
      .select('element_key, value')
      .in('element_key', ['mining_minimum_start_balance_usd', 'withdrawal_unlock_balance_usd']),
    supabase
      .from('payment_events')
      .select('id, stripe_event_id, type, amount_cents, currency, status, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  if (profileRes.error) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const thresholds: Record<string, number> = {}
  for (const row of threshRes.data ?? []) {
    thresholds[row.element_key] = parseFloat(row.value) || 0
  }

  return NextResponse.json({
    profile: profileRes.data,
    checks: checksRes.data ?? [],
    notes: notesRes.data ?? [],
    messages: msgsRes.data ?? [],
    deposits: depositsRes.data ?? [],
    config: {
      miningThreshold: thresholds['mining_minimum_start_balance_usd'] ?? 100,
      withdrawalThreshold: thresholds['withdrawal_unlock_balance_usd'] ?? 1000,
    },
  })
}
