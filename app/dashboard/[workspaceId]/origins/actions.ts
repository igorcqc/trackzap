"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function randomSlug(): string {
  return randomBytes(4).toString("hex");
}

export async function createLinkSource(workspaceId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const destinationPhone = String(formData.get("destination_phone") ?? "").replace(/\D/g, "");
  const prefilledMessage = String(formData.get("prefilled_message") ?? "Olá! Vim pelo anúncio.");
  if (!name || !destinationPhone) return;

  await supabase.from("sources").insert({
    workspace_id: workspaceId,
    type: "link",
    name,
    slug: randomSlug(),
    destination_phone: destinationPhone,
    prefilled_message: prefilledMessage,
  });

  revalidatePath(`/dashboard/${workspaceId}/origins`);
}

export async function createNativeSource(workspaceId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const metaAdId = String(formData.get("meta_ad_id") ?? "").trim() || null;
  if (!name) return;

  await supabase.from("sources").insert({
    workspace_id: workspaceId,
    type: "native",
    name,
    meta_ad_id: metaAdId,
  });

  revalidatePath(`/dashboard/${workspaceId}/origins`);
}

export async function toggleSource(workspaceId: string, sourceId: string, isActive: boolean) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("sources").update({ is_active: isActive }).eq("id", sourceId);
  revalidatePath(`/dashboard/${workspaceId}/origins`);
}
