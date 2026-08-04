"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendMetaEvent } from "@/lib/meta/capi";

export async function updateStatus(conversationId: string, status: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("conversations").update({ status }).eq("id", conversationId);
  revalidatePath("/dashboard/conversations");
}

/**
 * Marks a conversation as converted and fires the corresponding event
 * (Lead or Purchase) to the Meta Conversions API, carrying forward the
 * fbc/fbp attribution captured at the original click if one was matched.
 */
export async function markConversion(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const conversationId = String(formData.get("conversation_id"));
  const eventName = String(formData.get("event_name") ?? "Lead");
  const rawValue = String(formData.get("value") ?? "").trim();
  const value = rawValue ? Number(rawValue) : null;

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, contacts(*), clicks:click_id(*)")
    .eq("id", conversationId)
    .single();
  if (!conversation) return;

  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const newStatus = eventName === "Purchase" ? "won" : "qualified";
  await supabase.from("conversations").update({ status: newStatus }).eq("id", conversationId);

  if (settings?.meta_pixel_id && settings?.meta_access_token) {
    const eventId = randomUUID();
    const click = conversation.clicks as unknown as {
      fbc: string | null;
      fbclid: string | null;
      fbp: string | null;
    } | null;

    const result = await sendMetaEvent(
      {
        pixelId: settings.meta_pixel_id,
        accessToken: settings.meta_access_token,
        testEventCode: settings.meta_test_event_code,
      },
      {
        eventName,
        eventId,
        phone: conversation.contacts?.wa_id ?? null,
        clickId: click?.fbc ?? (click?.fbclid ? `fb.1.${Date.now()}.${click.fbclid}` : null),
        browserId: click?.fbp ?? null,
        value,
        currency: value ? settings.default_currency : null,
      }
    );

    await supabase.from("events").insert({
      conversation_id: conversationId,
      event_name: eventName,
      value,
      currency: value ? settings.default_currency : null,
      meta_event_id: eventId,
      meta_sent: result.ok,
      meta_response: result.body as never,
    });
  }

  revalidatePath("/dashboard/conversations");
}
