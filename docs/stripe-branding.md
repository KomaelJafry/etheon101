# Stripe Dashboard Branding — Etheon

Configure Stripe's hosted surfaces (Checkout, Customer Portal, invoices, emails) to match the Etheon brand.

## Brand assets

| Asset | File | Notes |
|---|---|---|
| Icon | `public/brand/etheon-icon.svg` | Crystal diamond — purple/blue gradient |
| Logo (horizontal) | `public/brand/etheon-logo.svg` | Crystal + "Etheon" wordmark |

Upload to **Dashboard → Settings → Branding** (or Stripe CLI `stripe branding upload`).

## Color tokens

| Role | Hex |
|---|---|
| Primary / brand accent | `#9B7BFF` |
| Primary hover | `#8A6BFF` |
| Secondary accent | `#6E8BFF` |
| Background (dark) | `#0B0A14` |
| Surface | `#151325` |
| Border | `#25213F` |
| Text primary | `#F5F4FF` |
| Text secondary | `#B6B3D9` |
| Success | `#27D980` |
| Warning | `#F5B642` |
| Error | `#FF5F7A` |

## Deposit currency

All card deposits are charged in **GBP (£)**. The Stripe Checkout session `currency` is `"gbp"`. If your Stripe account is not set up for GBP payouts, enable GBP in **Dashboard → Settings → Bank accounts and scheduling**.

## Stripe Dashboard settings

### Settings → Branding

| Field | Value |
|---|---|
| Logo | Upload `public/brand/etheon-logo.svg` |
| Icon | Upload `public/brand/etheon-icon.svg` |
| Brand color | `#9B7BFF` |
| Accent color | `#6E8BFF` |

### Checkout appearance (if using Stripe Elements / hosted Checkout)

```js
appearance: {
  theme: 'night',
  variables: {
    colorPrimary: '#9B7BFF',
    colorBackground: '#0B0A14',
    colorText: '#F5F4FF',
    colorDanger: '#FF5F7A',
    fontFamily: 'Space Grotesk, sans-serif',
    borderRadius: '10px',
  },
}
```

### Customer Portal

Enable at **Dashboard → Settings → Customer Portal**.

Recommended settings:
- Allow customers to cancel subscriptions
- Allow customers to update billing information
- Branding: same logo/icon as above

### Emails (receipts, invoices)

- Set sender name: **Etheon**
- Set reply-to: your support address
- Header logo: the horizontal logo SVG

## Typography

Primary font: **Space Grotesk** (weights 500, 600, 700)
Fallback: system-ui, sans-serif

## Do not use

- Old triangle logo (removed)
- Purple `#7C5CFF` or `#8b5cf6` — replaced by `#9B7BFF`
- Green `#10b981` / `#00C853` — replaced by `#27D980`
