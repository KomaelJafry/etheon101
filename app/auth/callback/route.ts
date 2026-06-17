import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Ensure a profile row exists for OAuth users (Google login creates the auth user
      // but not necessarily the profiles row — upsert safely with defaults).
      try {
        const service = await createServiceClient();
        const { data: existing } = await service
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!existing) {
          const fullName =
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            data.user.email?.split('@')[0] ||
            'Etheon User';

          await service.from('profiles').insert({
            id: data.user.id,
            full_name: fullName,
            email: data.user.email,
            role: 'customer',
            eth_balance: 0,
            hashrate_th: 0,
            hashrate_capacity_th: 500,
            mining_status: 'paused',
            vip_tier: 0,
            is_active: false,
          });
        }
      } catch {
        // Profile creation failure should not block login — the app handles missing profiles gracefully
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
