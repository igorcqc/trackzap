import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { extractTrackingCode } from "@/lib/tracking";
import { sendMetaEvent } from "@/lib/meta/capi";

export const runtime = "nodejs";

// --- GET: WhatsApp Cloud API webhook verification handshake ---------------
// Configured once in Meta App > WhatsApp > Configuration > Webhook.
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

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{ from?: string; type?: string; text?: { body?: string } }>;
      };
    }>;
  }>;
};

// --- POST: inbound WhatsApp events -----------------------------------------
// Every inbound message a customer sends lands here. We look for the
// tracking code embedded in the first message of the thread, tie it back
// to the click that generated it, and fire a "Contact" event to Meta CAPI.
export async function POST(request: NextRequest) {
  const payload = (await request.json()) as WhatsAppWebhookPayload;
  const supabase = createSupabaseServiceClient();

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId || !value?.messages?.length) continue;

      const { data: settings } = await supabase
        .from("settings")
        .select("*")
        .eq("whatsapp_phone_number_id", phoneNumberId)
        .maybeSingle();
      if (!settings) continue; // no account in TrackZap owns this WhatsApp number

      for (const message of value.messages) {
        const waId = message.from;
        if (!waId) continue;
        const body = message.text?.body ?? "";
        const contactName = value.contacts?.find((c) => c.wa_id === waId)?.profile?.name ?? null;

        // Upsert contact
        const { data: contact } = await supabase
          .from("contacts")
          .upsert(
            { user_id: settings.user_id, wa_id: waId, name: contactName },
            { onConflict: "user_id,wa_id" }
          )
          .select()
          .single();
        if (!contact) continue;

        // Reuse an existing conversation for this contact, or start one
        const { data: existingConversation } = await supabase
          .from("conversations")
          .select("*")
          .eq("contact_id", contact.id)
          .order("created_at", { ascending: false })
          .maybeSingle();

        let conversation = existingConversation;
        let click: { id: string; link_id: string; fbclid: string | null; fbc: string | null; fbp: string | null } | null = null;

        if (!conversation) {
          const code = extractTrackingCode(body);
          if (code) {
            const { data: matchedClick } = await supabase
              .from("clicks")
              .select("*")
              .eq("code", code)
              .maybeSingle();
            if (matchedClick) {
              click = matchedClick;
              await supabase
                .from("clicks")
                .update({ matched_at: new Date().toISOString() })
                .eq("id", matchedClick.id);
            }
          }

          const { data: newConversation } = await supabase
            .from("conversations")
            .insert({
              user_id: settings.user_id,
              contact_id: contact.id,
              link_id: click?.link_id ?? null,
              click_id: click?.id ?? null,
              first_message: body,
              status: "new",
            })
            .select()
            .single();
          conversation = newConversation;

          // First-touch event for a brand-new conversation only.
          if (conversation && settings.meta_pixel_id && settings.meta_access_token) {
            const eventId = randomUUID();
            const result = await sendMetaEvent(
              {
                pixelId: settings.meta_pixel_id,
                accessToken: settings.meta_access_token,
                testEventCode: settings.meta_test_event_code,
              },
              {
                eventName: "Contact",
                eventId,
                phone: waId,
                clickId: click?.fbc ?? (click?.fbclid ? `fb.1.${Date.now()}.${click.fbclid}` : null),
                browserId: click?.fbp ?? null,
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
  }

  return NextResponse.json({ received: true });
}
