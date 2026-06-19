import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

// ── GET — return current owner-control state for one customer ─
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const supabase = await createServiceClient()

  const { data, error: dbErr } = await supabase
    .from('profiles')
    .select(`
      id, full_name, email, eth_balance, gbp_balance,
      is_active, account_status,
      mining_status, admin_mining_override,
      admin_withdrawal_override,
      admin_subscription_override,
      admin_subscription_status,
      admin_subscription_plan,
      admin_subscription_interval,
      admin_subscription_reason,
      admin_subscription_updated_at
    `)
    .eq('id', id)
    .single()

  if (dbErr || !data) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json({ profile: data })
}

// ── PATCH — apply an owner control action ─────────────────────
//
// Body shapes:
//
//   action: 'balance'
//     currency: 'ETH' | 'GBP'
//     operation: 'add' | 'subtract' | 'set'
//     amount: number (positive)
//     reason: string (required)
//     internal_note: string (required)
//
//   action: 'subscription'
//     override: boolean
//     status: string | null
//     plan: string | null
//     interval: string | null
//     reason: string (required)
//
//   action: 'access'
//     account_status?: string
//     admin_mining_override?: string | null
//     admin_withdrawal_override?: string | null
//     reason: string (required)
//
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body?.action) return NextResponse.json({ error: 'action required' }, { status: 400 })

  const supabase = await createServiceClient()

  // Verify target user exists and fetch current state
  const { data: target } = await supabase
    .from('profiles')
    .select('id, full_name, eth_balance, gbp_balance, is_active, account_status, mining_status, admin_mining_override, admin_withdrawal_override, admin_subscription_override, admin_subscription_status, admin_subscription_plan, admin_subscription_interval, admin_subscription_reason')
    .eq('id', id)
    .single()

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // ── Action: balance ───────────────────────────────────────
  if (body.action === 'balance') {
    const { currency, operation, amount, reason, internal_note } = body

    if (!['ETH', 'GBP'].includes(currency)) return NextResponse.json({ error: 'currency must be ETH or GBP' }, { status: 400 })
    if (!['add', 'subtract', 'set'].includes(operation)) return NextResponse.json({ error: 'operation must be add, subtract, or set' }, { status: 400 })
    if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'amount must be a positive finite number' }, { status: 400 })
    if (!reason?.trim() || reason.trim().length < 3) return NextResponse.json({ error: 'reason required (min 3 chars)' }, { status: 400 })
    if (!internal_note?.trim() || internal_note.trim().length < 3) return NextResponse.json({ error: 'internal_note required (min 3 chars)' }, { status: 400 })

    const field = currency === 'ETH' ? 'eth_balance' : 'gbp_balance'
    const current: number = currency === 'ETH' ? (target.eth_balance ?? 0) : (target.gbp_balance ?? 0)

    let newBalance: number
    let delta: number

    if (operation === 'set') {
      newBalance = amount
      delta = amount - current
    } else if (operation === 'add') {
      newBalance = current + amount
      delta = amount
    } else {
      // subtract
      if (current < amount) {
        return NextResponse.json({
          error: `Cannot subtract ${amount} ${currency} — current balance is ${current}. Would go negative.`,
          current_balance: current,
        }, { status: 400 })
      }
      newBalance = current - amount
      delta = -amount
    }

    // For ETH use the atomic RPC, for GBP update directly
    if (currency === 'ETH') {
      const { error: rpcErr } = await supabase.rpc('increment_eth_balance', { user_id: id, delta })
      if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 })
    } else {
      const { error: updErr } = await supabase.from('profiles').update({ gbp_balance: newBalance }).eq('id', id)
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // Transaction record
    const txType = delta >= 0 ? 'adjustment' : 'adjustment'
    const txInsert: Record<string, unknown> = {
      user_id: id,
      type: txType,
      amount_eth: currency === 'ETH' ? Math.abs(delta) : 0,
      status: 'completed',
      description: `[Owner override] ${operation} ${amount} ${currency} — ${reason}`,
      created_by: user!.id,
    }
    if (currency === 'GBP') txInsert.amount_gbp = Math.abs(delta)

    const { data: tx } = await supabase.from('transactions').insert(txInsert).select().single()

    await logAudit({
      adminId: user!.id,
      action: `owner_balance_${operation}_${currency.toLowerCase()}`,
      targetTable: 'profiles',
      targetId: id,
      oldValue: { [field]: current },
      newValue: { [field]: newBalance, amount, operation, reason, internal_note },
    })

    return NextResponse.json({ ok: true, [field]: newBalance, transaction_id: tx?.id })
  }

  // ── Action: subscription ──────────────────────────────────
  if (body.action === 'subscription') {
    const { override, status, plan, interval, reason } = body

    if (typeof override !== 'boolean') return NextResponse.json({ error: 'override (boolean) required' }, { status: 400 })
    if (!reason?.trim() || reason.trim().length < 3) return NextResponse.json({ error: 'reason required (min 3 chars)' }, { status: 400 })

    const VALID_STATUS = ['active', 'inactive', 'canceled', 'past_due', 'trialing', null]
    const VALID_PLAN   = ['Starter', 'Growth', 'Annual Pro', 'Manual', null]
    const VALID_INTV   = ['monthly', 'yearly', 'manual', null]

    if (override && !VALID_STATUS.includes(status ?? null)) return NextResponse.json({ error: 'Invalid subscription status' }, { status: 400 })
    if (plan !== undefined && !VALID_PLAN.includes(plan ?? null)) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    if (interval !== undefined && !VALID_INTV.includes(interval ?? null)) return NextResponse.json({ error: 'Invalid interval' }, { status: 400 })

    const updatePayload: Record<string, unknown> = {
      admin_subscription_override: override,
      admin_subscription_status: override ? (status ?? null) : null,
      admin_subscription_plan: override ? (plan ?? null) : null,
      admin_subscription_interval: override ? (interval ?? null) : null,
      admin_subscription_reason: reason,
      admin_subscription_updated_at: new Date().toISOString(),
    }

    const { error: updErr } = await supabase.from('profiles').update(updatePayload).eq('id', id)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    await logAudit({
      adminId: user!.id,
      action: override ? 'owner_subscription_override_granted' : 'owner_subscription_override_revoked',
      targetTable: 'profiles',
      targetId: id,
      oldValue: {
        admin_subscription_override: target.admin_subscription_override,
        admin_subscription_status: target.admin_subscription_status,
        admin_subscription_plan: target.admin_subscription_plan,
      },
      newValue: { override, status, plan, interval, reason },
    })

    return NextResponse.json({ ok: true, override, status, plan, interval })
  }

  // ── Action: access ────────────────────────────────────────
  if (body.action === 'access') {
    const { account_status, admin_mining_override, admin_withdrawal_override, reason } = body

    if (!reason?.trim() || reason.trim().length < 3) return NextResponse.json({ error: 'reason required (min 3 chars)' }, { status: 400 })

    const VALID_ACCT = ['active', 'suspended', 'restricted', 'under_review']
    const VALID_MINE = ['locked', 'unlocked', 'active', 'paused', null]
    const VALID_WITH = ['locked', 'unlocked', 'under_review', null]

    if (account_status !== undefined && !VALID_ACCT.includes(account_status)) return NextResponse.json({ error: 'Invalid account_status' }, { status: 400 })
    if (admin_mining_override !== undefined && !VALID_MINE.includes(admin_mining_override ?? null)) return NextResponse.json({ error: 'Invalid admin_mining_override' }, { status: 400 })
    if (admin_withdrawal_override !== undefined && !VALID_WITH.includes(admin_withdrawal_override ?? null)) return NextResponse.json({ error: 'Invalid admin_withdrawal_override' }, { status: 400 })

    const updatePayload: Record<string, unknown> = {}
    if (account_status !== undefined) updatePayload.account_status = account_status
    if (admin_mining_override !== undefined) updatePayload.admin_mining_override = admin_mining_override ?? null
    if (admin_withdrawal_override !== undefined) updatePayload.admin_withdrawal_override = admin_withdrawal_override ?? null

    // If suspending, also set is_active false; if re-activating, set is_active true
    if (account_status === 'suspended') updatePayload.is_active = false
    if (account_status === 'active') updatePayload.is_active = true

    if (Object.keys(updatePayload).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

    const { error: updErr } = await supabase.from('profiles').update(updatePayload).eq('id', id)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    await logAudit({
      adminId: user!.id,
      action: 'owner_access_override',
      targetTable: 'profiles',
      targetId: id,
      oldValue: {
        account_status: target.account_status,
        admin_mining_override: target.admin_mining_override,
        admin_withdrawal_override: target.admin_withdrawal_override,
      },
      newValue: { account_status, admin_mining_override, admin_withdrawal_override, reason },
    })

    return NextResponse.json({ ok: true, ...updatePayload })
  }

  return NextResponse.json({ error: `Unknown action: ${body.action}` }, { status: 400 })
}
