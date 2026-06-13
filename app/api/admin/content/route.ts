import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const supabase = await createServiceClient()
  const { data } = await supabase.from('ui_content').select('*').order('page').order('element_key')
  return NextResponse.json({ content: data ?? [] })
}

const updateSchema = z.object({
  page: z.string().min(1),
  element_key: z.string().min(1),
  value: z.string().min(1),
})

export async function PUT(req: NextRequest) {
  const { profile, error } = await requireAdmin()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const supabase = await createServiceClient()
  const { data: existing } = await supabase.from('ui_content').select('value').eq('page', parsed.data.page).eq('element_key', parsed.data.element_key).single()

  const { data, error: dbErr } = await supabase
    .from('ui_content')
    .upsert({ ...parsed.data, updated_by: profile!.id, updated_at: new Date().toISOString() }, { onConflict: 'page,element_key' })
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  await logAudit({
    adminId: profile!.id,
    action: 'update_ui_content',
    targetTable: 'ui_content',
    targetId: `${parsed.data.page}:${parsed.data.element_key}`,
    oldValue: existing ? { value: existing.value } : undefined,
    newValue: { value: parsed.data.value },
  })

  return NextResponse.json(data)
}
