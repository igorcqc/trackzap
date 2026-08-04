"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendMetaEvent } from "@/lib/meta/capi";

export async function updateStatus(workspaceId: string, conversationId: string, status: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("conversations").update({ status }).eq("id", conversationId);
  revalidatePath(`/dashboard/${workspaceId}/conversations`);
}

/**
 * Marks a conversation as converted and fires the corresponding event
 * (Lead or Purchase) to the Meta Conversions API, carrying forward
 * whichever attribution the conversation resolved to: ctwa_clid (native ad),
 * fbc/fbp (tracked link), or just the hashed phone as a last resort.
 */
export async function markConversion(workspaceId: string, formData: FormData) {
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

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .maybeSingle();

  const newStatus = eventName === "Purchase" ? "won" : "qualified";
  await supabase.from("conversations").update({ status: newStatus }).eq("id", conversationId);

  if (workspace?.meta_pixel_id && workspace?.meta_access_token) {
    const eventId = randomUUID();
    const click = conversation.clicks as unknown as { fbc: string | null; fbp: string | null } | null;

    const result = await sendMetaEvent(
      {
        pixelId: workspace.meta_pixel_id,
        accessToken: workspace.meta_access_token,
        testEventCode: workspace.meta_test_event_code,
      },
      {
        eventName,
        eventId,
        phone: conversation.contacts?.wa_id ?? null,
        ctwaClickId: conversation.ctwa_clid,
        clickId: click?.fbc ?? null,
        browserId: click?.fbp ?? null,
        value,
        currency: value ? workspace.default_currency : null,
      }
    );

    await supabase.from("events").insert({
      conversation_id: conversationId,
      event_name: eventName,
      value,
      currency: value ? workspace.default_currency : null,
      meta_event_id: eventId,
      meta_sent: result.ok,
      meta_response: result.body as never,
    });
  }

  revalidatePath(`/dashboard/${workspaceId}/conversations`);
}
