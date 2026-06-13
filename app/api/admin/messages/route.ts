import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const createSchema = z.object({
  user_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  type: z.enum(['info', 'warning', 'success', 'error']).default('info'),
})

export async function POST(req: NextRequest) {
  const { profile, error } = await requireAdmin()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })

  const supabase = await createServiceClient()
  const { data, error: dbErr } = await supabase
    .from('customer_messages')
    .insert({ ...parsed.data, created_by: profile!.id })
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  await logAudit({
    adminId: profile!.id,
    action: 'create_customer_message',
    targetTable: 'customer_messages',
    targetId: data.id,
    newValue: parsed.data as Record<string, unknown>,
  })

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { profile, error } = await requireAdmin()
  if (error) return error

  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = await createServiceClient()
  await supabase.from('customer_messages').update({ is_visible: false }).eq('id', id)

  await logAudit({ adminId: profile!.id, action: 'hide_customer_message', targetTable: 'customer_messages', targetId: id })
  return NextResponse.json({ ok: true })
}
