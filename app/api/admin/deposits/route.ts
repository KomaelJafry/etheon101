import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const url = new URL(req.url)
  const status   = url.searchParams.get('status')  || 'pending_review'
  const search   = url.searchParams.get('search')  || ''
  const limit    = Math.min(parseInt(url.searchParams.get('limit')  || '50'), 200)
  const offset   = parseInt(url.searchParams.get('offset') || '0')

  const supabase = await createServiceClient()

  let query = supabase
    .from('payment_events')
    .select(
      `id, stripe_event_id, type, amount_cents, currency, status, created_at, user_id,
       profiles(id, full_name, email, eth_balance, is_active)`,
      { count: 'exact' }
    )
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
        (p?.email      ?? '').toLowerCase().includes(s) ||
        (p?.full_name  ?? '').toLowerCase().includes(s) ||
        (r.stripe_event_id ?? '').toLowerCase().includes(s) ||
        r.id.toLowerCase().includes(s)
      )
    })
  }

  // Paginate after search-filter (simpler for small datasets)
  const total  = rows.length
  const paged  = rows.slice(offset, offset + limit)

  return NextResponse.json({ deposits: paged, total: count ?? total })
}
