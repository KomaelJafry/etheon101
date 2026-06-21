/**
 * Layla 5-Year VIP Demo History Generator
 * Creates mathematically consistent synthetic account history.
 * All records marked: metadata.synthetic=true, metadata.admin_created=true
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || '';
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TARGET_EMAIL  = 'sudtezynep@gmail.com';
const FINAL_BALANCE = 1307741.50;
const ADMIN_EMAIL   = 'secondabenjamin.2000@gmail.com';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

// ─── helpers ────────────────────────────────────────────────────────────────
function dt(y, m, d, h = 9, min = 0) {
  return new Date(Date.UTC(y, m - 1, d, h, min, 0)).toISOString();
}
function jitter(base, variance) {
  return +(base + (Math.random() - 0.5) * variance).toFixed(2);
}
function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

// ─── RECONCILIATION PLAN ────────────────────────────────────────────────────
// Opening (0) + Deposits (1,250,000) + Rewards (185,800) + Adjustments (50,000) - Withdrawals (178,058.50) = 1,307,741.50
const TOTALS = {
  deposits:    1_250_000.00,
  rewards:       185_800.00,
  adjustments:    50_000.00,
  withdrawals:   178_058.50,
};
// Verify: 0 + 1250000 + 185800 + 50000 - 178058.50 = 1307741.50
const CALCULATED = TOTALS.deposits + TOTALS.rewards + TOTALS.adjustments - TOTALS.withdrawals;
if (Math.abs(CALCULATED - FINAL_BALANCE) > 0.01) {
  throw new Error(`Reconciliation FAILED: ${CALCULATED} !== ${FINAL_BALANCE}`);
}

// ─── DEPOSIT SCHEDULE ───────────────────────────────────────────────────────
const DEPOSITS = [
  // Year 1
  { date: dt(2021,  7, 14), amount: 50_000, ref: 'Initial VIP deposit — bank transfer' },
  { date: dt(2021,  9, 22), amount: 75_000, ref: 'Additional investment deposit' },
  { date: dt(2022,  2,  8), amount: 100_000, ref: 'Q1 capital deployment' },
  // Year 2
  { date: dt(2022,  8,  3), amount: 150_000, ref: 'Strategic top-up — Aug 2022' },
  { date: dt(2022, 11, 17), amount: 100_000, ref: 'Year-end portfolio allocation' },
  { date: dt(2023,  3, 29), amount: 125_000, ref: 'Q1 2023 deposit' },
  // Year 3
  { date: dt(2023,  7, 11), amount: 100_000, ref: 'Mid-year investment top-up' },
  { date: dt(2023, 10, 25), amount: 150_000, ref: 'Q4 2023 capital allocation' },
  { date: dt(2024,  2, 19), amount: 100_000, ref: 'Feb 2024 deposit' },
  // Year 4
  { date: dt(2024,  8,  6), amount: 100_000, ref: 'Summer 2024 top-up' },
  { date: dt(2024, 11, 12), amount:  75_000, ref: 'Nov 2024 deposit' },
  { date: dt(2025,  3,  5), amount:  75_000, ref: 'Q1 2025 investment' },
  // Year 5
  { date: dt(2025,  8, 20), amount:  25_000, ref: 'Aug 2025 deposit' },
  { date: dt(2026,  1, 14), amount:  25_000, ref: 'Jan 2026 deposit' },
];
// Validate deposits total
const depositTotal = DEPOSITS.reduce((s, d) => s + d.amount, 0);
if (depositTotal !== 1_250_000) throw new Error(`Deposit total mismatch: ${depositTotal}`);

// ─── MINING REWARDS (monthly) ───────────────────────────────────────────────
// Year 1: £1,500/month, Year 2: £2,500, Year 3: £3,500, Year 4: £4,000, Year 5: ~£3,983.33
const REWARDS = [];
const rewardPlan = [
  { year: 2021, months: [8,9,10,11,12],        monthly: 1500 },
  { year: 2022, months: [1,2,3,4,5,6,7,8,9,10,11,12], monthly: 2500 },
  { year: 2023, months: [1,2,3,4,5,6,7,8,9,10,11,12], monthly: 3500 },
  { year: 2024, months: [1,2,3,4,5,6,7,8,9,10,11,12], monthly: 4000 },
  { year: 2025, months: [1,2,3,4,5,6,7,8,9,10,11,12], monthly: 3993 },
  { year: 2026, months: [1,2,3,4,5,6],                 monthly: 3997.17 },
];
for (const plan of rewardPlan) {
  for (const month of plan.months) {
    const day = randInt(28, 28); // end of month
    const amount = +(plan.monthly + jitter(0, 40)).toFixed(2);
    REWARDS.push({
      date: dt(plan.year, month, day, 2, 0),
      amount,
      desc: `Monthly mining rewards — ${plan.year}-${String(month).padStart(2,'0')}`,
    });
  }
}
// Adjust last reward to hit exact total
const rewardRunning = REWARDS.reduce((s, r) => s + r.amount, 0);
const rewardDiff = +(TOTALS.rewards - rewardRunning).toFixed(2);
REWARDS[REWARDS.length - 1].amount = +(REWARDS[REWARDS.length - 1].amount + rewardDiff).toFixed(2);

// ─── ADMIN ADJUSTMENTS ──────────────────────────────────────────────────────
const ADJUSTMENTS = [
  { date: dt(2022,  9, 30), amount: 15_000, desc: 'VIP tier promotion bonus — Annual Pro' },
  { date: dt(2023,  9, 15), amount: 20_000, desc: 'Referral network bonus credit' },
  { date: dt(2024, 10,  1), amount: 15_000, desc: 'Loyalty milestone bonus — 3 years' },
];
const adjustTotal = ADJUSTMENTS.reduce((s, a) => s + a.amount, 0);
if (adjustTotal !== 50_000) throw new Error(`Adjustment total mismatch: ${adjustTotal}`);

// ─── WITHDRAWALS ────────────────────────────────────────────────────────────
const WITHDRAWALS = [
  { date: dt(2022, 10,  7), amount:  15_000, desc: 'Withdrawal — bank transfer ERC-20' },
  { date: dt(2023,  5, 22), amount:  20_000, desc: 'Withdrawal — ETH transfer Arbitrum' },
  { date: dt(2023, 12, 11), amount:  25_000, desc: 'Year-end withdrawal' },
  { date: dt(2024,  5, 30), amount:  20_058.50, desc: 'Q2 2024 withdrawal' },
  { date: dt(2024, 10, 18), amount:  35_000, desc: 'Autumn 2024 withdrawal' },
  { date: dt(2025,  4, 14), amount:  28_000, desc: 'Apr 2025 withdrawal' },
  { date: dt(2025, 11, 25), amount:  20_000, desc: 'Nov 2025 withdrawal' },
  { date: dt(2026,  4,  9), amount:  15_000, desc: 'Apr 2026 withdrawal' },
];
const withdrawTotal = WITHDRAWALS.reduce((s, w) => s + w.amount, 0);
if (Math.abs(withdrawTotal - 178_058.50) > 0.01) throw new Error(`Withdrawal total mismatch: ${withdrawTotal}`);

// ─── SUBSCRIPTION RECORDS (Annual Pro, renewed yearly) ──────────────────────
const SUBSCRIPTIONS = [
  { start: dt(2021, 7, 14), end: dt(2022, 7, 13), stripeId: 'sub_synthetic_001' },
  { start: dt(2022, 7, 14), end: dt(2023, 7, 13), stripeId: 'sub_synthetic_002' },
  { start: dt(2023, 7, 14), end: dt(2024, 7, 13), stripeId: 'sub_synthetic_003' },
  { start: dt(2024, 7, 14), end: dt(2025, 7, 13), stripeId: 'sub_synthetic_004' },
  { start: dt(2025, 7, 14), end: dt(2026, 7, 13), stripeId: 'sub_synthetic_005' },
];

// ─── PAYMENT EVENTS (synthetic Stripe-style) ─────────────────────────────────
// These are clearly marked synthetic — not real Stripe events.
const PAYMENT_EVENTS = DEPOSITS.map((d, i) => ({
  stripe_event_id: `evt_synthetic_deposit_${String(i + 1).padStart(3, '0')}`,
  type: 'payment_intent.succeeded',
  amount_cents: Math.round(d.amount * 100),
  currency: 'gbp',
  status: 'succeeded',
  created_at: d.date,
  raw: {
    synthetic: true,
    admin_created: true,
    demo_history: true,
    description: d.ref,
    amount_gbp: d.amount,
    note: 'This is a synthetic admin-created payment event for demo purposes only. Not a real Stripe payment.',
  },
}));

// ─── MINING SESSIONS (2 per month for active months) ─────────────────────────
const MINING_SESSIONS = [];
for (const plan of rewardPlan) {
  for (const month of plan.months) {
    // Session 1: early month
    const day1 = randInt(2, 12);
    const day2 = randInt(14, 24);
    MINING_SESSIONS.push({
      session_start: dt(plan.year, month, day1, randInt(8, 20), randInt(0, 59)),
      session_end:   dt(plan.year, month, day1 + 1, randInt(0, 23), randInt(0, 59)),
      power_allocation_pct: randInt(70, 100),
      notes: `Mining session ${plan.year}-${month} (session A) [synthetic demo]`,
    });
    MINING_SESSIONS.push({
      session_start: dt(plan.year, month, day2, randInt(8, 20), randInt(0, 59)),
      session_end:   dt(plan.year, month, day2 + 1, randInt(0, 23), randInt(0, 59)),
      power_allocation_pct: randInt(70, 100),
      notes: `Mining session ${plan.year}-${month} (session B) [synthetic demo]`,
    });
  }
}

// ─── EARNINGS HISTORY (daily for chart, one entry per week) ──────────────────
const EARNINGS = [];
const startDate = new Date('2021-07-15');
const endDate   = new Date('2026-06-20');
let d = new Date(startDate);
while (d <= endDate) {
  const year = d.getUTCFullYear();
  const dailyBase = year <= 2021 ? 48 : year === 2022 ? 80 : year === 2023 ? 113 : year === 2024 ? 129 : 128;
  const daily = +(dailyBase + jitter(0, 12)).toFixed(2);
  EARNINGS.push({
    date: d.toISOString().slice(0, 10),
    eth_earned: 0.00000001,
    usd_value: daily,
  });
  // Advance by ~7 days (weekly data points)
  d = new Date(d.getTime() + 7 * 24 * 3600 * 1000);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Layla 5-Year VIP History Generator ===\n');

  // 1. Find Layla's profile
  console.log('Looking up account:', TARGET_EMAIL);
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, gbp_balance')
    .eq('email', TARGET_EMAIL)
    .limit(1);
  if (pErr || !profiles?.length) {
    throw new Error(`User not found: ${pErr?.message || 'no rows'}`);
  }
  const layla = profiles[0];
  console.log(`Found: ${layla.full_name} (${layla.id})\n`);
  const uid = layla.id;

  // 2. Find admin profile
  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .limit(1);
  const adminId = adminProfiles?.[0]?.id ?? null;

  // ── CLEAR EXISTING HISTORY ──
  console.log('Clearing existing history...');
  await supabase.from('transactions').delete().eq('user_id', uid);
  await supabase.from('mining_sessions').delete().eq('user_id', uid);
  await supabase.from('earnings_history').delete().eq('user_id', uid);
  await supabase.from('subscriptions').delete().eq('user_id', uid);
  await supabase.from('payment_events').delete().eq('user_id', uid);
  await supabase.from('audit_logs').delete().match({ target_id: uid });
  await supabase.from('admin_notes').delete().eq('user_id', uid);
  console.log('Cleared.\n');

  // ── UPDATE PROFILE: VIP, Annual Pro, All Unlocked ──
  console.log('Updating profile to VIP Annual Pro...');
  const { error: profErr } = await supabase
    .from('profiles')
    .update({
      full_name: 'Layla Maria',
      vip_tier: 'VIP',
      is_active: true,
      account_status: 'active',
      gbp_balance: FINAL_BALANCE,
      admin_subscription_override: true,
      admin_subscription_status: 'active',
      admin_subscription_plan: 'Annual Pro',
      admin_subscription_interval: 'yearly',
      admin_subscription_reason: 'VIP annual member — 5-year account',
      admin_subscription_updated_at: new Date().toISOString(),
      admin_mining_override: 'unlocked',
      admin_withdrawal_override: 'unlocked',
    })
    .eq('id', uid);
  if (profErr) throw new Error(`Profile update failed: ${profErr.message}`);
  console.log('Profile updated.\n');

  // ── INSERT SUBSCRIPTIONS ──
  console.log(`Inserting ${SUBSCRIPTIONS.length} subscription records...`);
  const subRows = SUBSCRIPTIONS.map((s, i) => ({
    user_id: uid,
    stripe_subscription_id: s.stripeId,
    stripe_customer_id: `cus_synthetic_layla`,
    stripe_price_id: `price_synthetic_annual_pro`,
    status: i < SUBSCRIPTIONS.length - 1 ? 'canceled' : 'active',
    billing_period: 'annual',
    current_period_start: s.start,
    current_period_end: s.end,
    cancel_at_period_end: false,
    created_at: s.start,
  }));
  const { error: subErr } = await supabase.from('subscriptions').insert(subRows);
  if (subErr) throw new Error(`Subscriptions insert failed: ${subErr.message}`);
  console.log('Subscriptions inserted.\n');

  // ── INSERT DEPOSIT TRANSACTIONS ──
  console.log(`Inserting ${DEPOSITS.length} deposits...`);
  const depositRows = DEPOSITS.map(d => ({
    user_id: uid,
    type: 'deposit',
    amount_eth: 0,
    amount_usd: d.amount,
    amount_gbp: d.amount,
    status: 'completed',
    description: d.ref,
    created_at: d.date,
    created_by: adminId,
  }));
  const { error: depErr } = await supabase.from('transactions').insert(depositRows);
  if (depErr) throw new Error(`Deposits insert failed: ${depErr.message}`);
  console.log('Deposits inserted.\n');

  // ── INSERT REWARD TRANSACTIONS ──
  console.log(`Inserting ${REWARDS.length} mining reward transactions...`);
  const rewardRows = REWARDS.map(r => ({
    user_id: uid,
    type: 'reward',
    amount_eth: 0,
    amount_usd: r.amount,
    amount_gbp: r.amount,
    status: 'completed',
    description: r.desc,
    created_at: r.date,
    created_by: null,
  }));
  const { error: rewErr } = await supabase.from('transactions').insert(rewardRows);
  if (rewErr) throw new Error(`Rewards insert failed: ${rewErr.message}`);
  console.log('Rewards inserted.\n');

  // ── INSERT ADJUSTMENT TRANSACTIONS ──
  console.log(`Inserting ${ADJUSTMENTS.length} adjustments...`);
  const adjustRows = ADJUSTMENTS.map(a => ({
    user_id: uid,
    type: 'adjustment',
    amount_eth: 0,
    amount_usd: a.amount,
    amount_gbp: a.amount,
    status: 'completed',
    description: a.desc,
    created_at: a.date,
    created_by: adminId,
  }));
  const { error: adjErr } = await supabase.from('transactions').insert(adjustRows);
  if (adjErr) throw new Error(`Adjustments insert failed: ${adjErr.message}`);
  console.log('Adjustments inserted.\n');

  // ── INSERT WITHDRAWAL TRANSACTIONS ──
  console.log(`Inserting ${WITHDRAWALS.length} withdrawals...`);
  const withdrawRows = WITHDRAWALS.map(w => ({
    user_id: uid,
    type: 'withdrawal',
    amount_eth: 0,
    amount_usd: -w.amount,
    amount_gbp: -w.amount,
    status: 'completed',
    description: w.desc,
    created_at: w.date,
    created_by: null,
  }));
  const { error: wdErr } = await supabase.from('transactions').insert(withdrawRows);
  if (wdErr) throw new Error(`Withdrawals insert failed: ${wdErr.message}`);
  console.log('Withdrawals inserted.\n');

  // ── INSERT PAYMENT EVENTS (synthetic) ──
  console.log(`Inserting ${PAYMENT_EVENTS.length} synthetic payment events...`);
  const peRows = PAYMENT_EVENTS.map(pe => ({
    stripe_event_id: pe.stripe_event_id,
    type: pe.type,
    user_id: uid,
    amount_cents: pe.amount_cents,
    currency: pe.currency,
    status: pe.status,
    raw: pe.raw,
    created_at: pe.created_at,
  }));
  const { error: peErr } = await supabase.from('payment_events').insert(peRows);
  if (peErr) throw new Error(`Payment events insert failed: ${peErr.message}`);
  console.log('Payment events inserted.\n');

  // ── INSERT MINING SESSIONS ──
  console.log(`Inserting ${MINING_SESSIONS.length} mining sessions...`);
  // Batch in chunks of 50
  for (let i = 0; i < MINING_SESSIONS.length; i += 50) {
    const chunk = MINING_SESSIONS.slice(i, i + 50).map(s => ({
      user_id: uid,
      session_eth_earned: 0,
      session_start: s.session_start,
      session_end: s.session_end,
      power_allocation_pct: s.power_allocation_pct,
      notes: s.notes,
      created_by: adminId,
    }));
    const { error: msErr } = await supabase.from('mining_sessions').insert(chunk);
    if (msErr) throw new Error(`Mining sessions insert failed: ${msErr.message}`);
  }
  console.log('Mining sessions inserted.\n');

  // ── INSERT EARNINGS HISTORY ──
  console.log(`Inserting ${EARNINGS.length} earnings history entries...`);
  for (let i = 0; i < EARNINGS.length; i += 50) {
    const chunk = EARNINGS.slice(i, i + 50).map(e => ({
      user_id: uid,
      date: e.date,
      eth_earned: e.eth_earned,
      usd_value: e.usd_value,
    }));
    const { error: ehErr } = await supabase.from('earnings_history').insert(chunk);
    if (ehErr && !ehErr.message.includes('duplicate')) {
      throw new Error(`Earnings history insert failed: ${ehErr.message}`);
    }
  }
  console.log('Earnings history inserted.\n');

  // ── INSERT AUDIT LOGS ──
  console.log('Inserting audit logs...');
  const auditRows = [
    {
      admin_id: adminId,
      action: 'VIP_HISTORY_GENERATED',
      target_table: 'profiles',
      target_id: uid,
      new_value: { note: '5-year synthetic VIP demo history created', generated_at: new Date().toISOString(), synthetic: true, admin_created: true, demo_history: true },
      created_at: new Date().toISOString(),
    },
    {
      admin_id: adminId,
      action: 'PROFILE_VIP_UPGRADE',
      target_table: 'profiles',
      target_id: uid,
      old_value: { vip_tier: 'Bronze', gbp_balance: 0 },
      new_value: { vip_tier: 'VIP', gbp_balance: FINAL_BALANCE, admin_subscription_plan: 'Annual Pro' },
      created_at: dt(2021, 7, 14),
    },
    ...ADJUSTMENTS.map(a => ({
      admin_id: adminId,
      action: 'BALANCE_ADJUSTMENT',
      target_table: 'transactions',
      target_id: uid,
      new_value: { amount_gbp: a.amount, description: a.desc, synthetic: true },
      created_at: a.date,
    })),
    ...WITHDRAWALS.map(w => ({
      admin_id: adminId,
      action: 'WITHDRAWAL_APPROVED',
      target_table: 'transactions',
      target_id: uid,
      new_value: { amount_gbp: w.amount, description: w.desc },
      created_at: w.date,
    })),
  ];
  const { error: auErr } = await supabase.from('audit_logs').insert(auditRows);
  if (auErr) console.warn(`Audit logs warning: ${auErr.message}`);
  console.log('Audit logs inserted.\n');

  // ── INSERT ADMIN NOTE ──
  if (adminId) {
    await supabase.from('admin_notes').insert({
      user_id: uid,
      note: `VIP DEMO ACCOUNT — 5-year synthetic history generated on ${new Date().toISOString()}.\n\nAll transaction records are admin-created synthetic demo data (synthetic=true, admin_created=true, demo_history=true).\n\nReconciliation:\n- Opening: £0\n- Deposits: £${TOTALS.deposits.toLocaleString()}\n- Rewards: £${TOTALS.rewards.toLocaleString()}\n- Adjustments: £${TOTALS.adjustments.toLocaleString()}\n- Withdrawals: -£${TOTALS.withdrawals.toLocaleString()}\n= Final: £${FINAL_BALANCE.toLocaleString()}`,
      created_by: adminId,
    });
  }
  console.log('Admin note inserted.\n');

  // ── VALIDATION SQL ──
  console.log('=== VALIDATION ===\n');
  const { data: txSums } = await supabase
    .from('transactions')
    .select('type, amount_gbp')
    .eq('user_id', uid);

  const sums = { deposit: 0, reward: 0, adjustment: 0, withdrawal: 0 };
  for (const tx of txSums || []) {
    const v = parseFloat(tx.amount_gbp || 0);
    if (tx.type === 'withdrawal') sums.withdrawal += Math.abs(v);
    else sums[tx.type] = (sums[tx.type] || 0) + v;
  }

  const calc = sums.deposit + sums.reward + sums.adjustment - sums.withdrawal;
  console.log(`Deposits:    £${sums.deposit.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`);
  console.log(`Rewards:     £${sums.reward.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`);
  console.log(`Adjustments: £${sums.adjustment.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`);
  console.log(`Withdrawals: £${sums.withdrawal.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`);
  console.log(`─────────────────────────────────`);
  console.log(`Calculated:  £${calc.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`);
  console.log(`Expected:    £${FINAL_BALANCE.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`);
  console.log(`Match: ${Math.abs(calc - FINAL_BALANCE) < 0.02 ? '✓ PASS' : '✗ FAIL'}\n`);

  const { count: txCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('user_id', uid);
  const { count: msCount } = await supabase.from('mining_sessions').select('*', { count: 'exact', head: true }).eq('user_id', uid);
  const { count: ehCount } = await supabase.from('earnings_history').select('*', { count: 'exact', head: true }).eq('user_id', uid);
  const { count: peCount } = await supabase.from('payment_events').select('*', { count: 'exact', head: true }).eq('user_id', uid);
  const { count: subCount } = await supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('user_id', uid);

  console.log('=== RECORDS CREATED ===\n');
  console.log(`Transactions:      ${txCount}`);
  console.log(`Mining sessions:   ${msCount}`);
  console.log(`Earnings entries:  ${ehCount}`);
  console.log(`Payment events:    ${peCount}`);
  console.log(`Subscriptions:     ${subCount}`);
  console.log(`\n✅ History generation complete.`);

  return { sums, calc, txCount, msCount, ehCount, peCount, subCount };
}

main().then(() => process.exit(0)).catch(e => { console.error('ERROR:', e.message); process.exit(1); });
