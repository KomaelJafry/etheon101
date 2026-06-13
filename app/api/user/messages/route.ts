import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const supabase = await createClient()
  const { data } = await supabase
    .from('customer_messages')
    .select('id, title, body, type, is_read, created_at')
    .eq('user_id', user!.id)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })

  return NextResponse.json({ messages: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'Missing message id' }, { status: 400 })

  const supabase = await createClient()
  await supabase.from('customer_messages').update({ is_read: true }).eq('id', id).eq('user_id', user!.id)
  return NextResponse.json({ ok: true })
}
