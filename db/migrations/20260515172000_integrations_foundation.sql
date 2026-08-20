create extension if not exists pgcrypto;

create table if not exists audit_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  linkedin_url text not null,
  goal text,
  status text not null default 'processing',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  created_at timestamptz not null default now()
);

create table if not exists profile_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  audit_lead_id uuid references audit_leads(id) on delete set null,
  linkedin_url text not null,
  score integer not null,
  is_empty_profile boolean not null default false,
  summary text not null,
  headline_suggestion text not null,
  about_suggestion text not null,
  photo_banner_checklist text[] not null default '{}',
  keyword_gaps text[] not null default '{}',
  content_plan text[] not null default '{}',
  risk_flags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  razorpay_subscription_id text unique,
  razorpay_plan_id text,
  tier text not null default 'free',
  billing_cycle text not null default 'monthly',
  currency text not null default 'USD',
  status text not null default 'trialing',
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subscriptions add column if not exists billing_cycle text not null default 'monthly';
alter table subscriptions add column if not exists currency text not null default 'USD';
alter table subscriptions add column if not exists razorpay_subscription_id text;
alter table subscriptions add column if not exists razorpay_plan_id text;
create unique index if not exists subscriptions_razorpay_subscription_id_key
  on subscriptions (razorpay_subscription_id)
  where razorpay_subscription_id is not null;

