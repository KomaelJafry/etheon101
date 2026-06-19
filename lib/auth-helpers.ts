import { createClient } from './supabase/server'
import { NextResponse } from 'next/server'
import { OWNER_ADMIN_EMAIL } from './admin-config'

export { OWNER_ADMIN_EMAIL }

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { user, error: null }
}

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { user: null, profile: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  // Email match is mandatory — no DB misconfiguration can grant admin access
  if ((user.email ?? '').toLowerCase() !== OWNER_ADMIN_EMAIL) {
    return { user: null, profile: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return { user, profile, error: null }
}
