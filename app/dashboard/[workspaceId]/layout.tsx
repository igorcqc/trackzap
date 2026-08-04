import Link from "next/link";
import { requireWorkspace } from "@/lib/workspace/get-workspace";
import { SignOutButton } from "./sign-out-button";
import { WorkspaceSwitcher } from "./workspace-switcher";

const NAV = [
  { segment: "", label: "Visão geral" },
  { segment: "origins", label: "Origens" },
  { segment: "conversations", label: "Conversas" },
  { segment: "settings", label: "Configurações" },
];

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const { user, workspace, workspaces } = await requireWorkspace(workspaceId);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-8">
            <span className="text-lg font-semibold text-neutral-900">TrackZap</span>
            <WorkspaceSwitcher workspaces={workspaces} currentId={workspace.id} />
            <nav className="flex gap-5 text-sm text-neutral-500">
              {NAV.map((item) => (
                <Link
                  key={item.segment}
                  href={`/dashboard/${workspace.id}${item.segment ? `/${item.segment}` : ""}`}
                  className="hover:text-neutral-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-neutral-500">
            <span>{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
