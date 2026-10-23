import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { extractTrackingCode } from "@/lib/tracking";
import { sendMetaEvent } from "@/lib/meta/capi";

export const runtime = "nodejs";

// --- GET: WhatsApp Cloud API webhook verification handshake ---------------
// Registered once per client's Meta App (WhatsApp > Configuration > Webhook).
// The verify token is a single shared secret for this deployment, not
// per-workspace — it just proves this endpoint is the intended callback.
// docs: https://developers.facebook.com/docs/graph-api/webhooks/getting-started
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

type WhatsAppReferral = {
  source_id?: string;
  source_url?: string;
  source_type?: string;
  headline?: string;
  ctwa_clid?: string;
};

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          from?: string;
          type?: string;
          text?: { body?: string };
          referral?: WhatsAppReferral;
        }>;
      };
    }>;
  }>;
};

// --- Signature check -------------------------------------------------------
// Meta signs every POST with HMAC-SHA256 of the raw body using the App Secret
// (header `X-Hub-Signature-256: sha256=<hex>`). Without this check anyone who
// knows the URL could forge conversations and fire fake CAPI events.
// WHATSAPP_APP_SECRET accepts a comma-separated list, one per client Meta App.
// docs: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#validate-payloads
function hasValidSignature(rawBody: string, header: string | null): boolean {
  const secrets = (process.env.WHATSAPP_APP_SECRET ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!secrets.length || !header?.startsWith("sha256=")) return false;
  const received = Buffer.from(header.slice("sha256=".length), "hex");
  return secrets.some((secret) => {
    const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

// --- POST: inbound WhatsApp events -----------------------------------------
// Every inbound message a customer sends lands here. Attribution is resolved
// in priority order: `referral.ctwa_clid` (native Click-to-WhatsApp ad, sent
// automatically by Meta — the strongest signal) > a tracking code embedded
// in the message body by our own /r/<slug> redirect > unidentified.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!hasValidSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    if (!process.env.WHATSAPP_APP_SECRET) {
      console.error("WHATSAPP_APP_SECRET ausente: webhook recusando todos os eventos.");
    }
    return new NextResponse("Forbidden", { status: 403 });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }
  const supabase = createSupabaseServiceClient();

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId || !value?.messages?.length) continue;

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("*")
        .eq("whatsapp_phone_number_id", phoneNumberId)
        .maybeSingle();
      if (!workspace) continue; // no workspace in TrackZap owns this WhatsApp number

      for (const message of value.messages) {
        const waId = message.from;
        if (!waId) continue;
        const body = message.text?.body ?? "";
        const referral = message.referral;
        const contactName = value.contacts?.find((c) => c.wa_id === waId)?.profile?.name ?? null;

        const { data: contact } = await supabase
          .from("contacts")
          .upsert(
            { workspace_id: workspace.id, wa_id: waId, name: contactName },
            { onConflict: "workspace_id,wa_id" }
          )
          .select()
          .single();
        if (!contact) continue;

        const { data: existingConversation } = await supabase
          .from("conversations")
          .select("*")
          .eq("contact_id", contact.id)
          .order("created_at", { ascending: false })
          .maybeSingle();

        if (existingConversation) continue; // only the first message resolves attribution

        let sourceId: string | null = null;
        let clickId: string | null = null;
        let clickFbc: string | null = null;
        let clickFbp: string | null = null;
        const ctwaClid = referral?.ctwa_clid ?? null;

        if (ctwaClid) {
          // Native "Click to WhatsApp" ad — try to label it with a registered
          // source by ad id, but the ctwa_clid itself is what matters for CAPI.
          if (referral?.source_id) {
            const { data: nativeSource } = await supabase
              .from("sources")
              .select("id")
              .eq("workspace_id", workspace.id)
              .eq("type", "native")
              .eq("meta_ad_id", referral.source_id)
              .maybeSingle();
            sourceId = nativeSource?.id ?? null;
          }
        } else {
          const code = extractTrackingCode(body);
          if (code) {
            const { data: click } = await supabase
              .from("clicks")
              .select("*")
              .eq("code", code)
              .maybeSingle();
            if (click) {
              sourceId = click.source_id;
              clickId = click.id;
              clickFbc = click.fbc;
              clickFbp = click.fbp;
              await supabase
                .from("clicks")
                .update({ matched_at: new Date().toISOString() })
                .eq("id", click.id);
            }
          }
        }

        const { data: conversation } = await supabase
          .from("conversations")
          .insert({
            workspace_id: workspace.id,
            contact_id: contact.id,
            source_id: sourceId,
            click_id: clickId,
            ctwa_clid: ctwaClid,
            first_message: body,
            status: "new",
          })
          .select()
          .single();

        if (conversation && workspace.meta_pixel_id && workspace.meta_access_token) {
          const eventId = randomUUID();
          const result = await sendMetaEvent(
            {
              pixelId: workspace.meta_pixel_id,
              accessToken: workspace.meta_access_token,
              testEventCode: workspace.meta_test_event_code,
            },
            {
              eventName: "Contact",
              eventId,
              phone: waId,
              ctwaClickId: ctwaClid,
              clickId: clickFbc,
              browserId: clickFbp,
            }
          );

          await supabase.from("events").insert({
            conversation_id: conversation.id,
            event_name: "Contact",
            meta_event_id: eventId,
            meta_sent: result.ok,
            meta_response: result.body as never,
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
