import { NextRequest, NextResponse } from 'next/server'
import { stripe, PRICES } from '@/lib/stripe'
import { requireAuth } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  billing_period: z.enum(['monthly', 'annual']),
})

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid billing_period' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data: profile } = await supabase.from('profiles').select('stripe_customer_id, email').eq('id', user!.id).single()

  // Get or create Stripe customer
  let customerId = profile?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user!.email,
      metadata: { supabase_user_id: user!.id },
    })
    customerId = customer.id
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user!.id)
  }

  const priceId = parsed.data.billing_period === 'annual' ? PRICES.annual : PRICES.monthly
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/account/status?subscription=success`,
    cancel_url: `${appUrl}/mining?subscription=cancelled`,
    metadata: { user_id: user!.id, billing_period: parsed.data.billing_period },
    subscription_data: { metadata: { user_id: user!.id } },
  })

  return NextResponse.json({ url: session.url })
}
