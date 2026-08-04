# TrackZap

Ferramenta estilo Tintim: rastreia cliques que vêm de anúncios (Meta/Google/etc) até a
conversa no WhatsApp, e envia os eventos de **Contato**, **Lead** e **Venda** para o
**Meta Conversions API**, com atribuição (`fbclid`/`fbc`/`fbp`) preservada de ponta a ponta.

## Como funciona

1. Você cria um **link de rastreamento** (`/dashboard/links`) para cada anúncio/canal,
   apontando para o seu número de WhatsApp.
2. O visitante clica no anúncio → cai em `/r/<slug>` → o clique é gravado (UTMs, `fbclid`,
   cookies `_fbp`/`_fbc`) → ele é redirecionado para o WhatsApp com uma mensagem
   pré-preenchida contendo um código curto de rastreio (`zap-xxxxxxxx`).
3. Se ele enviar a mensagem sem editar, o **webhook do WhatsApp Cloud API**
   (`/api/webhook/whatsapp`) recebe a mensagem, extrai o código, encontra o clique
   correspondente e cria a conversa já vinculada ao anúncio de origem. Um evento
   `Contact` é disparado automaticamente para o Meta CAPI.
4. Você acompanha as conversas em `/dashboard/conversations` e marca manualmente quando
   viram **Lead** ou **Purchase** (com valor) — isso dispara o evento correspondente para
   o Meta, com a mesma atribuição do clique original.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Auth via magic link + RLS)
- Meta Conversions API (`graph.facebook.com`) para envio server-to-server dos eventos
- WhatsApp Cloud API (webhook) para capturar as mensagens recebidas

## Setup

1. Copie `.env.example` para `.env.local` e preencha as variáveis do Supabase.
2. Aplique a migration em `supabase/migrations/0001_init.sql` no seu projeto Supabase
   (via CLI `supabase db push`, painel SQL, ou MCP `apply_migration`).
3. `npm install && npm run dev`.
4. Faça login (magic link) e vá em **Configurações** para:
   - registrar o `Pixel ID` e o `Access Token` do Meta Conversions API;
   - registrar o `Phone Number ID` do WhatsApp Cloud API.
5. No Meta App (produto WhatsApp > Configuração > Webhook), registre a URL
   `https://SEU-DOMINIO/api/webhook/whatsapp` com o verify token definido em
   `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, e assine o campo `messages`.
6. Crie um link em **Links** e use-o no seu anúncio/bio.

## Estrutura

```
app/
  page.tsx                        landing pública
  login/                          login por magic link (Supabase Auth)
  dashboard/                      área logada (visão geral, links, conversas, config)
  api/r/[slug]/route.ts           redirecionamento público que grava o clique
  api/webhook/whatsapp/route.ts   webhook do WhatsApp Cloud API (verify + inbound)
lib/
  tracking.ts                     código de rastreio + link wa.me
  meta/capi.ts                    envio de eventos ao Meta Conversions API
  supabase/                       clientes Supabase (browser, server, service role)
supabase/migrations/0001_init.sql schema (links, clicks, contacts, conversations, events)
```

## Segurança

- Todas as tabelas têm RLS habilitada e são filtradas por `user_id` (cada conta só vê os
  próprios dados).
- Números de telefone são enviados ao Meta sempre com hash SHA-256 (`user_data.ph`), como
  exige a Conversions API — nunca em texto plano.
- As rotas públicas (`/api/r/[slug]` e o webhook) usam a service role key do Supabase pois
  não há sessão de usuário; nenhuma outra rota deve usar esse cliente.
