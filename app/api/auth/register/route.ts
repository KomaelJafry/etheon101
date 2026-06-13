import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1).max(100),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Check registration status and customer count before attempting signup
  const { data: settings } = await supabase.from('app_settings').select('key, value').in('key', ['registration_open', 'max_customers'])
  const settingsMap = Object.fromEntries(settings?.map(s => [s.key, s.value]) ?? [])

  if (settingsMap.registration_open !== 'true') {
    return NextResponse.json({ error: 'Registration is currently closed.' }, { status: 403 })
  }

  const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer')
  const max = parseInt(settingsMap.max_customers ?? '100')

  if ((count ?? 0) >= max) {
    return NextResponse.json({ error: 'Registration is currently full. Please contact support.' }, { status: 403 })
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ user_id: data.user.id }, { status: 201 })
}
