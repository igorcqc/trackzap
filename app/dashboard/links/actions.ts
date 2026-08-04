"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function randomSlug(): string {
  return randomBytes(4).toString("hex");
}

export async function createLink(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const destinationPhone = String(formData.get("destination_phone") ?? "").replace(/\D/g, "");
  const prefilledMessage = String(formData.get("prefilled_message") ?? "Olá! Vim pelo anúncio.");

  if (!name || !destinationPhone) return;

  await supabase.from("links").insert({
    user_id: user.id,
    slug: randomSlug(),
    name,
    destination_phone: destinationPhone,
    prefilled_message: prefilledMessage,
  });

  revalidatePath("/dashboard/links");
}

export async function toggleLink(linkId: string, isActive: boolean) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("links").update({ is_active: isActive }).eq("id", linkId);
  revalidatePath("/dashboard/links");
}
