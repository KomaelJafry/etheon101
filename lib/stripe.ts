import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
  typescript: true,
})

// Plan → Stripe Price ID mapping (server-side only)
// Growth falls back to STRIPE_MONTHLY_PRICE_ID for backward compatibility
// until a dedicated £60/month price is created in Stripe.
export const PLAN_PRICES: Record<'starter' | 'growth' | 'annual', string> = {
  starter: process.env.STRIPE_STARTER_PRICE_ID ?? '',
  growth:  process.env.STRIPE_GROWTH_PRICE_ID  ?? process.env.STRIPE_MONTHLY_PRICE_ID ?? '',
  annual:  process.env.STRIPE_ANNUAL_PRICE_ID  ?? '',
}

// Legacy export kept for any code not yet migrated to plan-based checkout.
export const PRICES = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID ?? '',
  annual:  process.env.STRIPE_ANNUAL_PRICE_ID  ?? '',
}
