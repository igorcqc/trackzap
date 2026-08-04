-- TrackZap: WhatsApp click/message tracking -> Meta Conversions API
-- Multi-tenant (agency) schema: one owner account can hold many workspaces,
-- each workspace being one WhatsApp number (Cloud API + Coexistence) with
-- its own Meta CAPI credentials.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- workspaces: one per client/number. Owned by a single Supabase auth user
-- (MVP has no per-workspace team invites — the owner switches between them).
-- ---------------------------------------------------------------------------
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,

  -- Meta Conversions API credentials (1 Pixel per workspace)
  meta_pixel_id text,
  meta_access_token text,
  meta_test_event_code text,
  default_currency text not null default 'BRL',

  -- WhatsApp Cloud API credentials (Coexistence-enabled number)
  whatsapp_phone_number_id text unique,
  whatsapp_waba_id text,
  whatsapp_display_number text,

  created_at timestamptz not null default now()
);
create index if not exists workspaces_owner_id_idx on public.workspaces(owner_id);

-- ---------------------------------------------------------------------------
-- sources: a trackable origin for WhatsApp leads. Two kinds:
--   'link'   — a /r/<slug> redirect link (bio, site, non-native ads). Carries
--              UTM/fbclid attribution captured at click time.
--   'native' — a Click-to-WhatsApp ad configured directly in Ads Manager.
--              No click happens on our side; attribution arrives inside the
--              inbound WhatsApp message as `referral.ctwa_clid`. Registering
--              it here (optionally with the Meta ad id) only labels it for
--              reporting — matching still works via ctwa_clid even unlabeled.
-- ---------------------------------------------------------------------------
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type text not null check (type in ('link', 'native')),
  name text not null,
  is_active boolean not null default true,

  -- 'link' sources
  slug text unique,
  destination_phone text,
  prefilled_message text,

  -- 'native' sources
  meta_ad_id text,

  created_at timestamptz not null default now()
);
create index if not exists sources_workspace_id_idx on public.sources(workspace_id);
create index if not exists sources_meta_ad_id_idx on public.sources(meta_ad_id) where meta_ad_id is not null;

-- ---------------------------------------------------------------------------
-- clicks: one row per visitor click on a 'link' source, before they message.
-- ---------------------------------------------------------------------------
create table if not exists public.clicks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
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
create index if not exists clicks_source_id_idx on public.clicks(source_id);
create index if not exists clicks_code_idx on public.clicks(code);

-- ---------------------------------------------------------------------------
-- contacts: whatsapp end-users, deduplicated by phone number per workspace
-- ---------------------------------------------------------------------------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  wa_id text not null,                  -- WhatsApp id / phone number (E.164, no +)
  name text,
  created_at timestamptz not null default now(),
  unique (workspace_id, wa_id)
);

-- ---------------------------------------------------------------------------
-- conversations: one per contact thread; carries whichever attribution the
-- first inbound message resolved to.
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  source_id uuid references public.sources(id) on delete set null,
  click_id uuid references public.clicks(id) on delete set null,
  ctwa_clid text,                       -- present when the lead came from a native CTWA ad
  status text not null default 'new' check (status in ('new','contacted','qualified','won','lost')),
  first_message text,
  created_at timestamptz not null default now()
);
create index if not exists conversations_workspace_id_idx on public.conversations(workspace_id);
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
-- Row Level Security: everything is scoped through workspaces.owner_id
-- ---------------------------------------------------------------------------
alter table public.workspaces enable row level security;
alter table public.sources enable row level security;
alter table public.clicks enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.events enable row level security;

create policy "workspaces_owner" on public.workspaces
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "sources_owner" on public.sources
  for all using (workspace_id in (select id from public.workspaces where owner_id = auth.uid()));

create policy "clicks_owner" on public.clicks
  for all using (source_id in (
    select s.id from public.sources s
    join public.workspaces w on w.id = s.workspace_id
    where w.owner_id = auth.uid()
  ));

create policy "contacts_owner" on public.contacts
  for all using (workspace_id in (select id from public.workspaces where owner_id = auth.uid()));

create policy "conversations_owner" on public.conversations
  for all using (workspace_id in (select id from public.workspaces where owner_id = auth.uid()));

create policy "events_owner" on public.events
  for all using (conversation_id in (
    select c.id from public.conversations c
    join public.workspaces w on w.id = c.workspace_id
    where w.owner_id = auth.uid()
  ));

-- Note: the redirect route (/api/r/[slug]) and the WhatsApp webhook
-- (/api/webhook/whatsapp) run with the Supabase service role key, which
-- bypasses RLS, since anonymous visitors and Meta's webhook have no
-- Supabase session.
