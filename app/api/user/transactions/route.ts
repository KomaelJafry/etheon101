import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') // reward | deposit | withdrawal | conversion
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const supabase = await createClient()
  let query = supabase
    .from('transactions')
    .select('id, type, amount_eth, amount_usd, amount_gbp, status, tx_hash, description, created_at', { count: 'exact' })
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type) query = query.eq('type', type)

  const { data, count, error: dbErr } = await query
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ transactions: data, total: count })
}
