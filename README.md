# TrackZap

Ferramenta estilo Tintim: rastreia leads que chegam via **link** ou via **campanha nativa
"Clique para WhatsApp"** até a conversa no WhatsApp, e envia os eventos de **Contato**, **Lead**
e **Venda** para o **Meta Conversions API**, com atribuição preservada de ponta a ponta.
Só monitora — nunca envia mensagem.

Multi-tenant: uma conta (login único) pode gerenciar vários **workspaces**, cada um
representando um número de WhatsApp/cliente com suas próprias credenciais.

## Como funciona

Cada workspace conecta o número via **WhatsApp Cloud API + Coexistence** — o número continua
funcionando normalmente no app do celular, e a Cloud API só observa as mensagens via webhook.
Duas origens de lead, resolvidas na primeira mensagem de cada conversa:

1. **Anúncio nativo "Clique para WhatsApp"** — configurado direto no Meta Ads Manager, sem link
   nosso no meio. Quando o lead manda a mensagem, ela chega no webhook com
   `referral.ctwa_clid`, o identificador oficial de atribuição da Meta. Cadastrar a origem em
   `Origens` (com o Ad ID, opcional) só serve para rotular o relatório — a atribuição em si
   funciona mesmo sem cadastro.
2. **Link rastreador** (`/r/<slug>`) — para bio, site, outros canais. O clique é gravado com
   UTM/fbclid/`_fbp`/`_fbc`, e o visitante é redirecionado ao WhatsApp com um código curto
   (`zap-xxxxxxxx`) embutido na mensagem pré-preenchida, casado no webhook se o lead não editar a
   mensagem.

Se nenhum dos dois casos se aplica, a conversa ainda é registrada, só cai como "origem não
identificada". Um evento `Contact` é disparado automaticamente ao Meta CAPI na primeira mensagem
de cada conversa; `Lead`/`Purchase` (com valor) são marcados manualmente em `Conversas`,
reaproveitando `ctwa_clid` ou `fbc`/`fbp` daquela conversa.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Auth via magic link + RLS)
- Meta Conversions API (`graph.facebook.com`) para envio server-to-server dos eventos
- WhatsApp Cloud API (webhook) — leitura apenas, nunca envia mensagem

## Setup

1. Copie `.env.example` para `.env.local` e preencha as variáveis do Supabase.
2. Aplique a migration em `supabase/migrations/0001_init.sql` no seu projeto Supabase (via CLI
   `supabase db push`, painel SQL, ou MCP `apply_migration`).
3. `npm install && npm run dev`.
4. Faça login (magic link). No primeiro acesso você cria um workspace (`/dashboard/new`).
5. Em **Configurações** do workspace, registre `Pixel ID`/`Access Token` do Meta Conversions API
   e `Phone Number ID`/`WABA ID` do WhatsApp Cloud API — depois de migrar o número (com
   Coexistence ativado no Meta Business Manager).
6. No Meta App (produto WhatsApp > Configuração > Webhook), registre a URL
   `https://SEU-DOMINIO/api/webhook/whatsapp` com o verify token definido em
   `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (compartilhado entre todos os workspaces desta instalação), e
   assine o campo `messages`.
7. Em **Origens**, crie um link rastreador e/ou cadastre suas campanhas nativas.

## Estrutura

```
app/
  page.tsx                          landing pública
  login/                            login por magic link (Supabase Auth)
  dashboard/
    page.tsx                        redireciona pro primeiro workspace (ou /new)
    new/                            criação de workspace
    [workspaceId]/                  área logada de um workspace: overview, origens,
                                     conversas, configurações
  api/r/[slug]/route.ts             redirecionamento público que grava o clique
  api/webhook/whatsapp/route.ts     webhook do WhatsApp Cloud API (verify + inbound,
                                     resolve ctwa_clid ou código de link)
lib/
  tracking.ts                       código de rastreio + link wa.me
  meta/capi.ts                      envio de eventos ao Meta Conversions API
  supabase/                         clientes Supabase (browser, server, service role)
  workspace/get-workspace.ts        carrega e valida o workspace atual (RLS-scoped)
supabase/migrations/0001_init.sql   schema (workspaces, sources, clicks, contacts,
                                     conversations, events) com RLS por owner_id
```

## Segurança

- Todas as tabelas têm RLS habilitada e são filtradas por `workspace.owner_id = auth.uid()`.
- Números de telefone são enviados ao Meta sempre com hash SHA-256 (`user_data.ph`), como exige a
  Conversions API — nunca em texto plano.
- As rotas públicas (`/api/r/[slug]` e o webhook) usam a service role key do Supabase pois não há
  sessão de usuário; nenhuma outra rota deve usar esse cliente.
