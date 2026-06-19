import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { user, profile, error } = await requireAdmin()
  if (error) return error

  const supabase = await createServiceClient()

  // Env var presence — never expose values
  const env: Record<string, boolean> = {
    NEXT_PUBLIC_SUPABASE_URL:           !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY:          !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY:                  !!process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_STARTER_PRICE_ID:            !!process.env.STRIPE_STARTER_PRICE_ID,
    STRIPE_GROWTH_PRICE_ID:             !!process.env.STRIPE_GROWTH_PRICE_ID,
    STRIPE_ANNUAL_PRICE_ID:             !!process.env.STRIPE_ANNUAL_PRICE_ID,
    STRIPE_MONTHLY_PRICE_ID:            !!process.env.STRIPE_MONTHLY_PRICE_ID,
    STRIPE_WEBHOOK_SECRET:              !!process.env.STRIPE_WEBHOOK_SECRET,
  }

  // Table existence + row counts
  const TABLES = ['profiles','transactions','customer_messages','audit_logs','ui_content','admin_notes','verification_checks'] as const
  const tables: Record<string, boolean> = {}
  const counts: Record<string, number | null> = {}
  for (const t of TABLES) {
    const { count, error: e } = await supabase.from(t as never).select('*', { count: 'exact', head: true })
    tables[t] = !e
    counts[t] = e ? null : (count ?? 0)
  }

  return NextResponse.json({
    env,
    tables,
    counts,
    checks: {
      ui_content_seeded:       (counts['ui_content'] ?? 0) > 0,
      migration_004_applied:   tables['admin_notes'] && tables['verification_checks'],
      stripe_webhook_env_set:  env.STRIPE_WEBHOOK_SECRET,
      google_auth_status:      'intentionally_skipped',
    },
    current_user: {
      id:    user!.id,
      email: user!.email,
      role:  profile!.role,
    },
  })
}
