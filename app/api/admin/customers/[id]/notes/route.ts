import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const noteSchema = z.object({ note: z.string().min(1).max(2000) })

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const supabase = await createServiceClient()
  const { data, error: dbErr } = await supabase
    .from('admin_notes')
    .select('id, note, created_by, created_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { profile: admin, error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = noteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Note text is required' }, { status: 400 })

  const supabase = await createServiceClient()
  const { data, error: dbErr } = await supabase
    .from('admin_notes')
    .insert({ user_id: id, note: parsed.data.note, created_by: admin!.id })
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  await logAudit({
    adminId: admin!.id,
    action: 'create_admin_note',
    targetTable: 'admin_notes',
    targetId: data.id,
    newValue: { user_id: id, note: parsed.data.note },
  })

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { profile: admin, error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const { note_id } = await req.json().catch(() => ({}))
  if (!note_id) return NextResponse.json({ error: 'note_id required' }, { status: 400 })

  const supabase = await createServiceClient()
  await supabase.from('admin_notes').delete().eq('id', note_id).eq('user_id', id)

  await logAudit({ adminId: admin!.id, action: 'delete_admin_note', targetTable: 'admin_notes', targetId: note_id })
  return NextResponse.json({ ok: true })
}
