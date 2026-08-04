-- TrackZap: WhatsApp click/message tracking -> Meta Conversions API
-- Core schema. Multi-tenant by user_id (each Supabase auth user = one account).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- settings: one row per user, holds Meta CAPI credentials + WhatsApp config
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  meta_pixel_id text,
  meta_access_token text,
  meta_test_event_code text,
  whatsapp_phone_number_id text,        -- WhatsApp Cloud API phone_number_id (for webhook matching)
  whatsapp_verify_token text,           -- token used to verify the webhook challenge
  whatsapp_display_number text,         -- the wa.me number used in tracking links, e.g. 5511999999999
  default_currency text not null default 'BRL',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- links: tracking links (ads, bio, site button) that redirect to WhatsApp
-- ---------------------------------------------------------------------------
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  name text not null,
  destination_phone text not null,      -- number the visitor is redirected to (E.164, no +)
  prefilled_message text not null default 'Olá! Vim pelo anúncio.',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists links_user_id_idx on public.links(user_id);

-- ---------------------------------------------------------------------------
-- clicks: one row per visitor click on a tracking link, before they message
-- ---------------------------------------------------------------------------
create table if not exists public.clicks (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.links(id) on delete cascade,
  code text not null unique,            -- short code embedded in the prefilled wa.me message
  fbclid text,
  fbp text,
  fbc text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  landing_url text,
  ip text,
  user_agent text,
  matched_at timestamptz,               -- set when a matching WhatsApp message arrives
  created_at timestamptz not null default now()
);
create index if not exists clicks_link_id_idx on public.clicks(link_id);
create index if not exists clicks_code_idx on public.clicks(code);

-- ---------------------------------------------------------------------------
-- contacts: whatsapp end-users, deduplicated by phone number per account
-- ---------------------------------------------------------------------------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wa_id text not null,                  -- WhatsApp id / phone number (E.164, no +)
  name text,
  created_at timestamptz not null default now(),
  unique (user_id, wa_id)
);

-- ---------------------------------------------------------------------------
-- conversations: one per contact thread; links a contact back to a click
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  link_id uuid references public.links(id) on delete set null,
  click_id uuid references public.clicks(id) on delete set null,
  status text not null default 'new' check (status in ('new','contacted','qualified','won','lost')),
  first_message text,
  created_at timestamptz not null default now()
);
create index if not exists conversations_user_id_idx on public.conversations(user_id);
create index if not exists conversations_contact_id_idx on public.conversations(contact_id);

-- ---------------------------------------------------------------------------
-- events: every event dispatched (or attempted) to the Meta Conversions API
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  event_name text not null,             -- Contact, Lead, Purchase, or a custom name
  value numeric,
  currency text,
  meta_event_id text not null,          -- used for dedup between Pixel (browser) and CAPI
  meta_sent boolean not null default false,
  meta_response jsonb,
  created_at timestamptz not null default now()
);
create index if not exists events_conversation_id_idx on public.events(conversation_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: every table is scoped to the owning user
-- ---------------------------------------------------------------------------
alter table public.settings enable row level security;
alter table public.links enable row level security;
alter table public.clicks enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.events enable row level security;

create policy "settings_owner" on public.settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "links_owner" on public.links
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "clicks_owner" on public.clicks
  for all using (link_id in (select id from public.links where user_id = auth.uid()));

create policy "contacts_owner" on public.contacts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "conversations_owner" on public.conversations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "events_owner" on public.events
  for all using (conversation_id in (select id from public.conversations where user_id = auth.uid()));

-- Note: the redirect route (/api/r/[slug]) and the WhatsApp webhook
-- (/api/webhook/whatsapp) run with the Supabase service role key, which
-- bypasses RLS, since anonymous visitors and Meta's webhook have no
-- Supabase session.
