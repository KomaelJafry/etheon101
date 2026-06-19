import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const url    = new URL(req.url)
  const status = url.searchParams.get('status') || 'pending'
  const search = url.searchParams.get('search') || ''
  const limit  = Math.min(parseInt(url.searchParams.get('limit')  || '50'), 200)
  const offset = parseInt(url.searchParams.get('offset') || '0')

  const supabase = await createServiceClient()

  let query = supabase
    .from('transactions')
    .select(
      `id, type, amount_eth, amount_usd, status, description, created_at, user_id,
       profiles(id, full_name, email, eth_balance, is_active, eth_wallet_address)`,
      { count: 'exact' }
    )
    .eq('type', 'withdrawal')
    .order('created_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)

  const { data, error: qErr, count } = await query

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  let rows = (data ?? []) as any[]

  if (search) {
    const s = search.toLowerCase()
    rows = rows.filter(r => {
      const p = r.profiles as any
      return (
        (p?.email     ?? '').toLowerCase().includes(s) ||
        (p?.full_name ?? '').toLowerCase().includes(s) ||
        r.id.toLowerCase().includes(s)
      )
    })
  }

  const total = rows.length
  const paged = rows.slice(offset, offset + limit)

  return NextResponse.json({ withdrawals: paged, total: count ?? total })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAdmin()
  if (error) return error

  const body = await req.json().catch(() => null)
  if (!body?.id || !body?.status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 })
  }

  const VALID = ['completed', 'failed']
  if (!VALID.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { data: existing, error: fetchErr } = await supabase
    .from('transactions')
    .select('id, user_id, status, amount_eth, type')
    .eq('id', body.id)
    .eq('type', 'withdrawal')
    .single()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
  }

  if (existing.status !== 'pending') {
    return NextResponse.json({ error: 'Withdrawal already actioned', current: existing.status }, { status: 409 })
  }

  const { error: updErr } = await supabase
    .from('transactions')
    .update({ status: body.status })
    .eq('id', body.id)

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  await logAudit({
    adminId:     user!.id,
    action:      `withdrawal_${body.status}`,
    targetTable: 'transactions',
    targetId:    body.id,
    oldValue:    { status: existing.status },
    newValue:    { status: body.status, note: body.note ?? '' },
  })

  return NextResponse.json({ ok: true })
}
