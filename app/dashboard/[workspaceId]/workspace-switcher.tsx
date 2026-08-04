"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Workspace = { id: string; name: string; whatsapp_display_number: string | null };

export function WorkspaceSwitcher({
  workspaces,
  currentId,
}: {
  workspaces: Workspace[];
  currentId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const current = workspaces.find((w) => w.id === currentId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm"
      >
        <span className="font-medium text-neutral-800">{current?.name ?? "Workspace"}</span>
        {current?.whatsapp_display_number && (
          <span className="font-mono text-xs text-neutral-400">
            +{current.whatsapp_display_number}
          </span>
        )}
        <span className="text-neutral-400">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-md border border-neutral-200 bg-white p-1 shadow-lg">
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  setOpen(false);
                  router.push(`/dashboard/${w.id}`);
                }}
                className={`flex w-full flex-col items-start rounded px-2 py-1.5 text-left text-sm hover:bg-neutral-100 ${
                  w.id === currentId ? "bg-neutral-50" : ""
                }`}
              >
                <span className="font-medium text-neutral-800">{w.name}</span>
                {w.whatsapp_display_number && (
                  <span className="font-mono text-xs text-neutral-400">
                    +{w.whatsapp_display_number}
                  </span>
                )}
              </button>
            ))}
            <Link
              href="/dashboard/new"
              className="mt-1 block rounded border-t border-neutral-100 px-2 pt-2 text-sm text-neutral-500 hover:bg-neutral-100"
            >
              + Conectar novo número
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
