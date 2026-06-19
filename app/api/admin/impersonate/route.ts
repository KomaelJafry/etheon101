import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin()
  if (error) return error

  const body = await req.json().catch(() => null)
  if (!body?.target_user_id) {
    return NextResponse.json({ error: 'target_user_id required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { data: target, error: tErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', body.target_user_id)
    .single()

  if (tErr || !target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  await logAudit({
    adminId:     user!.id,
    action:      'impersonation_started',
    targetTable: 'profiles',
    targetId:    target.id,
    oldValue:    {},
    newValue:    { viewing_as: target.email, target_name: target.full_name },
  })

  return NextResponse.json({
    ok:            true,
    target_user_id: target.id,
    target_email:   target.email,
    target_name:    target.full_name,
    token:          Buffer.from(JSON.stringify({ id: target.id, ts: Date.now() })).toString('base64'),
  })
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAdmin()
  if (error) return error

  const body = await req.json().catch(() => null)

  await logAudit({
    adminId:     user!.id,
    action:      'impersonation_ended',
    targetTable: 'profiles',
    targetId:    body?.target_user_id ?? 'unknown',
    oldValue:    {},
    newValue:    {},
  })

  return NextResponse.json({ ok: true })
}
