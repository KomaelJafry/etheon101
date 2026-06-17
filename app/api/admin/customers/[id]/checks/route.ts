import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const checkSchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  status: z.enum(['pending', 'complete', 'failed', 'not_required']),
  customer_visible: z.boolean().default(true),
  admin_note: z.string().max(500).optional(),
  customer_note: z.string().max(500).optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const supabase = await createServiceClient()
  const { data, error: dbErr } = await supabase
    .from('verification_checks')
    .select('*')
    .eq('user_id', id)
    .order('created_at')

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { profile: admin, error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = checkSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })

  const supabase = await createServiceClient()

  // Upsert by (user_id, key)
  const { data, error: dbErr } = await supabase
    .from('verification_checks')
    .upsert({
      user_id: id,
      key: parsed.data.key,
      label: parsed.data.label,
      status: parsed.data.status,
      customer_visible: parsed.data.customer_visible,
      admin_note: parsed.data.admin_note ?? null,
      customer_note: parsed.data.customer_note ?? null,
      updated_by: admin!.id,
    }, { onConflict: 'user_id,key' })
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  await logAudit({
    adminId: admin!.id,
    action: 'update_verification_check',
    targetTable: 'verification_checks',
    targetId: data.id,
    newValue: parsed.data as Record<string, unknown>,
  })

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { profile: admin, error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const { key } = await req.json().catch(() => ({}))
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

  const supabase = await createServiceClient()
  await supabase.from('verification_checks').delete().eq('user_id', id).eq('key', key)

  await logAudit({ adminId: admin!.id, action: 'delete_verification_check', targetTable: 'verification_checks', targetId: `${id}/${key}` })
  return NextResponse.json({ ok: true })
}
