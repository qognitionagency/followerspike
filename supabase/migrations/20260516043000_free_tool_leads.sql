create table if not exists free_tool_leads (
  id uuid primary key default gen_random_uuid(),
  email text,
  tool_slug text not null,
  input_summary jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  created_at timestamptz not null default now()
);

create index if not exists free_tool_leads_tool_slug_created_at_idx
  on free_tool_leads (tool_slug, created_at desc);

create index if not exists free_tool_leads_email_idx
  on free_tool_leads (email)
  where email is not null;
