import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Loads the current user's workspaces plus the one selected by the URL
 * segment. RLS already scopes `workspaces` to `owner_id = auth.uid()`, so a
 * workspace id belonging to someone else simply won't be found here.
 */
export async function requireWorkspace(workspaceId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: workspace }, { data: workspaces }] = await Promise.all([
    supabase.from("workspaces").select("*").eq("id", workspaceId).maybeSingle(),
    supabase.from("workspaces").select("*").order("created_at", { ascending: true }),
  ]);

  if (!workspace) notFound();

  return { supabase, user, workspace, workspaces: workspaces ?? [] };
}
