import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const offset = parseInt(searchParams.get('offset') ?? '0')
  const adminFilter = searchParams.get('admin_id')

  const supabase = await createServiceClient()
  let query = supabase
    .from('audit_logs')
    .select('id, action, target_table, target_id, old_value, new_value, created_at, admin_id, profiles!admin_id(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (adminFilter) query = query.eq('admin_id', adminFilter)

  const { data, count } = await query
  return NextResponse.json({ logs: data, total: count })
}
