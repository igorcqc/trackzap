"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createWorkspace(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({ owner_id: user.id, name })
    .select("id")
    .single();

  if (error || !workspace) return;
  redirect(`/dashboard/${workspace.id}/settings`);
}
