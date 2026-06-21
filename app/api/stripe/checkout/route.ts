import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
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

function isCustomerMissing(err: unknown): boolean {
  if (err instanceof Stripe.errors.StripeInvalidRequestError) {
    return err.code === 'resource_missing' && (err.param === 'customer' || (err.message ?? '').toLowerCase().includes('no such customer'))
  }
  return false
}

async function getOrCreateCustomer(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createServiceClient>>,
  userId: string,
  email: string | undefined,
  savedId: string | null | undefined,
): Promise<{ customerId: string; newCustomerCreated: boolean }> {
  // If we have a saved ID, verify it exists in the current Stripe mode
  if (savedId) {
    try {
      await stripe.customers.retrieve(savedId)
      console.log('[checkout] customer_mode=existing', { user_id: userId, saved_customer_id: savedId, new_customer_created: false })
      return { customerId: savedId, newCustomerCreated: false }
    } catch (err) {
      if (!isCustomerMissing(err)) throw err
      // Customer exists in a different mode — fall through to create a new one
      console.warn('[checkout] saved customer missing in current mode — creating new', { user_id: userId, saved_customer_id: savedId })
    }
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  })
  await supabase.from('profiles').update({ stripe_customer_id: customer.id }).eq('id', userId)
  console.log('[checkout] customer_mode=new', { user_id: userId, saved_customer_id: savedId ?? null, new_customer_created: true, new_id: customer.id })
  return { customerId: customer.id, newCustomerCreated: true }
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

  let customerId: string
  try {
    const result = await getOrCreateCustomer(
      supabase,
      user!.id,
      profile?.email ?? user!.email,
      profile?.stripe_customer_id,
    )
    customerId = result.customerId
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[checkout] customer resolution failed:', msg)
    return NextResponse.json({ error: `Stripe error: ${msg}` }, { status: 502 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  try {
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[checkout] stripe.checkout.sessions.create failed:', msg, { priceId, plan })
    return NextResponse.json({ error: `Stripe error: ${msg}` }, { status: 502 })
  }
}
