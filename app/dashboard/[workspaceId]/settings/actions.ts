"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function saveSettings(workspaceId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("workspaces")
    .update({
      name: String(formData.get("name") ?? "").trim() || undefined,
      meta_pixel_id: String(formData.get("meta_pixel_id") ?? "").trim() || null,
      meta_access_token: String(formData.get("meta_access_token") ?? "").trim() || null,
      meta_test_event_code: String(formData.get("meta_test_event_code") ?? "").trim() || null,
      default_currency: String(formData.get("default_currency") ?? "BRL").trim() || "BRL",
      whatsapp_phone_number_id: String(formData.get("whatsapp_phone_number_id") ?? "").trim() || null,
      whatsapp_waba_id: String(formData.get("whatsapp_waba_id") ?? "").trim() || null,
      whatsapp_display_number: String(formData.get("whatsapp_display_number") ?? "").trim() || null,
    })
    .eq("id", workspaceId);

  revalidatePath(`/dashboard/${workspaceId}/settings`);
}
