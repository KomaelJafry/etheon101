import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const createSchema = z.object({
  user_id: z.string().uuid(),
  type: z.enum(['verification', 'document_request', 'warning', 'info', 'approval', 'rejection']),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  cta_label: z.string().optional(),
  cta_url: z.string().url().optional(),
  is_dismissible: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  const { profile, error } = await requireAdmin()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })

  const supabase = await createServiceClient()
  const { data, error: dbErr } = await supabase
    .from('verification_prompts')
    .insert({ ...parsed.data, created_by: profile!.id })
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  await logAudit({
    adminId: profile!.id,
    action: 'create_verification_prompt',
    targetTable: 'verification_prompts',
    targetId: data.id,
    newValue: parsed.data as Record<string, unknown>,
  })

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { profile, error } = await requireAdmin()
  if (error) return error

  const { id, is_active } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = await createServiceClient()
  await supabase.from('verification_prompts').update({ is_active }).eq('id', id)
  await logAudit({ adminId: profile!.id, action: 'toggle_prompt', targetTable: 'verification_prompts', targetId: id, newValue: { is_active } })

  return NextResponse.json({ ok: true })
}
