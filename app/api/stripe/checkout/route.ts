import { NextRequest, NextResponse } from 'next/server'
import { stripe, PLAN_PRICES } from '@/lib/stripe'
import { requireAuth } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Accept new plan-based payload; also accept legacy billing_period for compat.
const schema = z.union([
  z.object({ plan: z.enum(['starter', 'growth', 'annual']) }),
  z.object({ billing_period: z.enum(['monthly', 'annual']) }),
])

function resolvePlan(body: z.infer<typeof schema>): 'starter' | 'growth' | 'annual' {
  if ('plan' in body) return body.plan
  return body.billing_period === 'annual' ? 'annual' : 'growth'
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request. Expected { plan: "starter"|"growth"|"annual" }' }, { status: 400 })
  }

  const plan = resolvePlan(parsed.data)
  const priceId = PLAN_PRICES[plan]

  console.log('[checkout]', {
    plan,
    hasStarterPrice: !!PLAN_PRICES.starter,
    hasGrowthPrice:  !!PLAN_PRICES.growth,
    hasAnnualPrice:  !!PLAN_PRICES.annual,
  })

  if (!priceId) {
    const label = plan.charAt(0).toUpperCase() + plan.slice(1)
    return NextResponse.json(
      { error: `${label} plan is not configured. Please contact support.` },
      { status: 503 }
    )
  }

  const supabase = await createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user!.id)
    .single()

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/account/status?subscription=success`,
    cancel_url: `${appUrl}/mining?subscription=cancelled`,
    metadata: { user_id: user!.id, plan },
    subscription_data: { metadata: { user_id: user!.id, plan } },
  })

  return NextResponse.json({ url: session.url })
}
