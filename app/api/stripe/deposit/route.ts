import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { requireAuth } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  let body: unknown
  try { body = await req.json() } catch { body = null }

  // Accept amount_gbp (new) or amount_usd (legacy field name — treated as GBP)
  const raw = (body as Record<string, unknown>)?.amount_gbp ?? (body as Record<string, unknown>)?.amount_usd
  const amountGbp = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''))
  if (!Number.isFinite(amountGbp) || amountGbp < 10 || amountGbp > 10000) {
    return NextResponse.json({ error: 'Amount must be between £10 and £10,000' }, { status: 400 })
  }

  const amountCents = Math.round(amountGbp * 100)
  const supabase = await createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user!.id)
    .single()

  let customerId: string | null = profile?.stripe_customer_id ?? null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? (user as { email?: string }).email ?? undefined,
      metadata: { supabase_user_id: user!.id },
    })
    customerId = customer.id
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user!.id)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://etheon.site'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'gbp',
        unit_amount: amountCents,
        product_data: {
          name: 'Etheon Funds Deposit',
          description: 'Funds will be reviewed and credited to your Etheon balance after admin confirmation.',
        },
      },
      quantity: 1,
    }],
    success_url: `${appUrl}/deposit/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/deposit/cancel`,
    metadata: {
      user_id: user!.id,
      type: 'deposit',
      currency: 'gbp',
      amount_gbp: String(amountGbp),
    },
  })

  return NextResponse.json({ url: session.url })
}
