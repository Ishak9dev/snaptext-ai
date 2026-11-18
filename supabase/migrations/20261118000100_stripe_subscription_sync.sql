-- Extend the existing subscription model without replacing customer data.
alter table public.subscriptions
  add column if not exists billing_interval text,
  add column if not exists current_period_start timestamptz,
  add column if not exists canceled_at timestamptz;

create unique index if not exists subscriptions_user_id_uidx
  on public.subscriptions (user_id);
create unique index if not exists subscriptions_stripe_subscription_id_uidx
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;
create unique index if not exists subscriptions_stripe_customer_id_uidx
  on public.subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  created_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
drop policy if exists "Users can view own subscription" on public.subscriptions;
create policy "Users can view own subscription"
  on public.subscriptions for select to authenticated
  using (auth.uid() = user_id);
revoke insert, update, delete on public.subscriptions from anon, authenticated;
revoke all on public.stripe_webhook_events from anon, authenticated;
