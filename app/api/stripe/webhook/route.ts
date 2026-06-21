import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

async function upsertSubscription(sub: Stripe.Subscription, supabase: Awaited<ReturnType<typeof createServiceClient>>) {
  const userId = sub.metadata?.user_id
  if (!userId) return

  const item = sub.items.data[0]
  const billingPeriod = item?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly'

  // Stripe v22 uses period object
  const period = (sub as unknown as { current_period?: { start: number; end: number } }).current_period
  const legacySub = sub as unknown as { current_period_start?: number; current_period_end?: number }

  const periodStart = period?.start ?? legacySub.current_period_start
  const periodEnd = period?.end ?? legacySub.current_period_end

  await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_subscription_id: sub.id,
    stripe_customer_id: sub.customer as string,
    stripe_price_id: item?.price?.id,
    status: sub.status as string,
    billing_period: billingPeriod,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
    canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_subscription_id' })

  // Mirror active/inactive state onto profiles so the app can gate features
  const isActive = sub.status === 'active' || sub.status === 'trialing'
  await supabase.from('profiles').update({ is_active: isActive }).eq('id', userId)
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Log the event — ignore duplicates
  await supabase.from('payment_events').insert({
    stripe_event_id: event.id,
    type: event.type,
    raw: event as unknown as Record<string, unknown>,
  }).then(() => {}) // swallow duplicate key errors

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'subscription' && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string)
        await upsertSubscription(sub, supabase)

        const userId = session.metadata?.user_id
        if (userId && session.customer) {
          await supabase.from('profiles').update({ stripe_customer_id: session.customer as string }).eq('id', userId)
          await supabase.from('payment_events').update({ user_id: userId }).eq('stripe_event_id', event.id)
        }
      } else if (session.mode === 'payment' && session.metadata?.type === 'deposit') {
        const userId = session.metadata?.user_id
        if (userId) {
          const { error: updateErr } = await supabase.from('payment_events').update({
            user_id: userId,
            amount_cents: session.amount_total ?? 0,
            currency: session.currency ?? 'gbp',
            status: 'pending_review',
          }).eq('stripe_event_id', event.id)
          if (updateErr) {
            console.error('[DEPOSIT WEBHOOK] Failed to mark deposit pending_review', updateErr, event.id)
          }
        }
      }
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      await upsertSubscription(sub, supabase)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase.from('subscriptions').update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('stripe_subscription_id', sub.id)
      const deletedUserId = sub.metadata?.user_id
      if (deletedUserId) {
        await supabase.from('profiles').update({ is_active: false }).eq('id', deletedUserId)
      }
      break
    }

    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed': {
      const invoice = event.data.object as unknown as { subscription?: string }
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription)
        if (event.type === 'invoice.payment_succeeded') {
          await upsertSubscription(sub, supabase)
        } else {
          await supabase.from('subscriptions').update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          }).eq('stripe_subscription_id', invoice.subscription)
        }
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
