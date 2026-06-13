import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'

// Returns all UI config for a given page slug, personalized for the current user
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const slug = new URL(req.url).searchParams.get('slug') ?? 'dashboard'
  const supabase = await createClient()

  const [contentRes, linksRes, modalsRes, visibilityRes] = await Promise.all([
    // Page content + global content
    supabase.from('ui_content')
      .select('element_key, value')
      .in('page', [slug, 'global']),

    // User-specific + global hyperlinks
    supabase.from('hyperlinks')
      .select('id, label, url, icon, section, sort_order')
      .or(`user_id.is.null,user_id.eq.${user!.id}`)
      .eq('is_active', true)
      .order('sort_order'),

    // Unseen modals for this user
    supabase.from('modals')
      .select('id, title, body, cta_label, cta_url, show_once')
      .or(`user_id.is.null,user_id.eq.${user!.id}`)
      .eq('is_active', true)
      .not('id', 'in', `(select modal_id from modal_dismissals where user_id = '${user!.id}')`),

    // Section visibility overrides for this user on this page
    supabase.from('section_visibility')
      .select('section_key, is_visible')
      .eq('user_id', user!.id)
      .eq('page', slug),
  ])

  // Build content map
  const content = Object.fromEntries(
    (contentRes.data ?? []).map(c => [c.element_key, c.value])
  )
  const visibility = Object.fromEntries(
    (visibilityRes.data ?? []).map(v => [v.section_key, v.is_visible])
  )

  return NextResponse.json({
    content,
    links: linksRes.data ?? [],
    modals: modalsRes.data ?? [],
    visibility,
  })
}
