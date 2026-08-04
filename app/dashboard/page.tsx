import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Entry point after login: send the user straight into their first
// workspace, or into the creation flow if they don't have one yet.
export default async function DashboardIndex() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  redirect(workspace ? `/dashboard/${workspace.id}` : "/dashboard/new");
}
