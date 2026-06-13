# Etheon — Deployment Guide

## Project Overview

| Layer | Technology |
|-------|-----------|
| Frontend + API | Next.js 16 (App Router) |
| Database + Auth | Supabase |
| Payments | Stripe |
| Hosting | Hostinger VPS (Node.js) |

---

## Step 1 — Supabase Setup

1. Go to [supabase.com](https://supabase.com) → your project
2. Go to **SQL Editor**
3. Run these files **in order**:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_functions.sql`
4. Go to **Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)
5. Go to **Authentication → Providers** → ensure Email is enabled
6. Go to **Authentication → URL Configuration**:
   - Set Site URL to your production domain

### Create your first admin account

After deploying, run this in the Supabase SQL Editor (replace values):

```sql
-- First create the user via Supabase Auth dashboard or API
-- Then run this to make them admin:
UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
```

---

## Step 2 — Stripe Setup

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Create Products:**
   - Go to Products → Add product
   - Name: "Etheon Platform Access"
   - Add two prices:
     - Monthly: e.g. $49.00/month → copy Price ID → `STRIPE_MONTHLY_PRICE_ID`
     - Annual: e.g. $399.00/year → copy Price ID → `STRIPE_ANNUAL_PRICE_ID`
3. **Get API Keys** → Developers → API Keys:
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`
4. **Setup Webhook:**
   - Developers → Webhooks → Add endpoint
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy Signing secret → `STRIPE_WEBHOOK_SECRET`
5. **Enable Customer Portal:**
   - Settings → Billing → Customer portal → Activate

---

## Step 3 — Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (secret!) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API Keys |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API Keys (secret!) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → endpoint |
| `STRIPE_MONTHLY_PRICE_ID` | Stripe → Products → your price |
| `STRIPE_ANNUAL_PRICE_ID` | Stripe → Products → your price |
| `NEXT_PUBLIC_APP_URL` | Your production domain |

---

## Step 4 — Local Development

```bash
npm install
npm run dev
# App runs at http://localhost:3000
```

For Stripe webhooks locally, install [Stripe CLI](https://stripe.com/docs/stripe-cli):
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Copy the webhook signing secret it shows → paste into `STRIPE_WEBHOOK_SECRET` for local dev.

---

## Step 5 — Deploy to Hostinger VPS

### Option A: Node.js server (recommended)

```bash
# On your VPS:
npm install
npm run build
npm start   # runs on port 3000
```

Use **Nginx** as a reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Set your environment variables on the VPS. With PM2:
```bash
npm install -g pm2
pm2 start npm --name etheon -- start
pm2 save
```

### Option B: Hostinger Node.js Hosting

1. Upload project files (exclude `node_modules`)
2. Set environment variables in Hostinger control panel
3. Set the start command to: `npm run build && npm start`

---

## API Reference

### Public
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new customer |

### Authenticated (customer)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/user/profile` | Get own profile |
| PATCH | `/api/user/profile` | Update name / wallet address |
| GET | `/api/user/dashboard` | Full dashboard data |
| GET | `/api/user/transactions` | Transaction history (filterable) |
| GET | `/api/user/messages` | Customer messages from admin |
| PATCH | `/api/user/messages` | Mark message as read |
| GET | `/api/ui/page?slug=dashboard` | Dynamic UI config for a page |
| POST | `/api/stripe/checkout` | Start Stripe checkout |
| POST | `/api/stripe/portal` | Open Stripe billing portal |

### Admin only (`/api/admin/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List all customers (searchable) |
| GET | `/api/admin/users/:id` | Full customer detail |
| PATCH | `/api/admin/users/:id` | Update balance, hashrate, status, tier |
| POST | `/api/admin/transactions` | Add transaction for a user |
| POST | `/api/admin/messages` | Send message to user |
| DELETE | `/api/admin/messages` | Hide a message |
| POST | `/api/admin/prompts` | Create verification prompt |
| PATCH | `/api/admin/prompts` | Enable/disable a prompt |
| GET | `/api/admin/content` | Get all editable UI content |
| PUT | `/api/admin/content` | Update a UI content element |
| GET | `/api/admin/audit-logs` | View admin action history |

### Stripe (server-to-server)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/stripe/webhook` | Stripe webhook receiver |

---

## Connecting Your Frontend (Claude Design)

In your Next.js pages, fetch data like this:

```typescript
// On any page — get dashboard data
const res = await fetch('/api/user/dashboard')
const data = await res.json()
// data.profile.eth_balance, data.profile.hashrate_th, etc.

// Get UI content for a page
const ui = await fetch('/api/ui/page?slug=dashboard')
const { content, links, modals, visibility } = await ui.json()
// Replace hardcoded text with content['hero_subtitle'] etc.

// Admin: update a user's ETH balance
await fetch('/api/admin/users/USER_ID', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ eth_balance: 1.5 })
})
```

---

## Admin Panel Access

Sign in with your admin email at `/login`.
The `/admin` route is protected by middleware — only users with `role = 'admin'` in the profiles table can access it.

---

## 100-User Limit

The limit is stored in `app_settings` table:
```sql
-- Change the limit (run in Supabase SQL Editor):
UPDATE app_settings SET value = '150' WHERE key = 'max_customers';

-- Temporarily close registration:
UPDATE app_settings SET value = 'false' WHERE key = 'registration_open';
```

Admin accounts never count toward this limit.

---

## Security Checklist

- [x] All sensitive tables have RLS enabled
- [x] Customers can only read their own records
- [x] Admin writes require `role = 'admin'` check
- [x] Stripe webhook validates signature before processing
- [x] Service role key never exposed to frontend
- [x] All admin actions logged in `audit_logs`
- [x] ETH balance changes use atomic DB function
- [x] Middleware blocks `/admin` for non-admins
- [x] Input validated with Zod on every API route
- [x] Registration limit enforced server-side
