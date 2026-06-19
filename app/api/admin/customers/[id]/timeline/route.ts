import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await requireAdmin()
  if (error) return error

  const supabase = await createServiceClient()

  const [profileRes, subsRes, txRes, depositsRes, checksRes, auditRes, messagesRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, created_at, is_active').eq('id', id).single(),
    supabase.from('subscriptions').select('id, status, billing_period, created_at, canceled_at').eq('user_id', id).order('created_at'),
    supabase.from('transactions').select('id, type, amount_eth, status, description, created_at').eq('user_id', id).order('created_at'),
    supabase.from('payment_events').select('id, amount_cents, currency, status, created_at').eq('user_id', id).order('created_at'),
    supabase.from('verification_checks').select('id, key, label, status, updated_at, customer_note, admin_note').eq('user_id', id).order('updated_at'),
    supabase.from('audit_logs').select('id, action, target_table, new_value, created_at, admin_id').eq('target_id', id).order('created_at'),
    supabase.from('customer_messages').select('id, title, type, created_at, is_read').eq('user_id', id).order('created_at'),
  ])

  if (!profileRes.data) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const events: { ts: string; type: string; label: string; detail: string; color: string; icon: string; source?: string }[] = []

  const p = profileRes.data

  // Registration
  events.push({ ts: p.created_at, type: 'registered', label: 'Account created', detail: p.email, color: '#9b7bff', icon: 'person_add', source: 'system' })

  // Subscriptions
  for (const s of (subsRes.data ?? [])) {
    events.push({ ts: s.created_at, type: 'subscription_started', label: `Subscription started (${s.billing_period})`, detail: `Status: ${s.status}`, color: '#16D98A', icon: 'workspace_premium', source: 'stripe' })
    if (s.canceled_at) {
      events.push({ ts: s.canceled_at, type: 'subscription_cancelled', label: 'Subscription cancelled', detail: `Billing period: ${s.billing_period}`, color: '#FF6B8A', icon: 'cancel', source: 'stripe' })
    }
  }

  // Deposits (payment events)
  for (const d of (depositsRes.data ?? [])) {
    const gbp = (d.amount_cents / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })
    const statusColor = d.status === 'credited' ? '#16D98A' : d.status === 'rejected' ? '#FF6B8A' : '#FFB55C'
    events.push({ ts: d.created_at, type: `deposit_${d.status}`, label: `Deposit ${d.status.replace('_', ' ')} — ${gbp}`, detail: `Status: ${d.status}`, color: statusColor, icon: 'payments', source: 'stripe' })
  }

  // Transactions (rewards, withdrawals, etc.)
  for (const t of (txRes.data ?? [])) {
    if (t.type === 'reward') {
      events.push({ ts: t.created_at, type: 'reward', label: `Reward credited — ${t.amount_eth} ETH`, detail: t.description ?? '', color: '#FFB55C', icon: 'toll', source: 'admin' })
    } else if (t.type === 'withdrawal') {
      const statusColor = t.status === 'completed' ? '#16D98A' : t.status === 'failed' ? '#FF6B8A' : '#FFB55C'
      events.push({ ts: t.created_at, type: `withdrawal_${t.status}`, label: `Withdrawal ${t.status} — ${t.amount_eth} ETH`, detail: t.description ?? '', color: statusColor, icon: 'north_east', source: 'system' })
    } else if (t.type === 'deposit') {
      events.push({ ts: t.created_at, type: 'balance_credited', label: `Balance credited — ${t.amount_eth} ETH`, detail: t.description ?? '', color: '#16D98A', icon: 'account_balance_wallet', source: 'admin' })
    }
  }

  // Verification checks (only completed/failed)
  for (const c of (checksRes.data ?? [])) {
    if (c.status === 'complete' || c.status === 'failed') {
      const color = c.status === 'complete' ? '#16D98A' : '#FF6B8A'
      events.push({ ts: c.updated_at, type: `check_${c.status}`, label: `${c.label} — ${c.status}`, detail: c.admin_note ?? c.customer_note ?? '', color, icon: 'verified_user', source: 'admin' })
    }
  }

  // Audit log actions on this customer
  for (const a of (auditRes.data ?? [])) {
    events.push({ ts: a.created_at, type: 'admin_action', label: a.action.replace(/_/g, ' '), detail: `Table: ${a.target_table}`, color: '#7C5CFF', icon: 'admin_panel_settings', source: 'admin' })
  }

  // Messages sent
  for (const m of (messagesRes.data ?? [])) {
    events.push({ ts: m.created_at, type: 'message_sent', label: `Message sent: ${m.title}`, detail: `Type: ${m.type} · Read: ${m.is_read ? 'yes' : 'no'}`, color: '#6E8BFF', icon: 'mail', source: 'admin' })
  }

  // Sort chronologically
  events.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())

  return NextResponse.json({ events })
}
