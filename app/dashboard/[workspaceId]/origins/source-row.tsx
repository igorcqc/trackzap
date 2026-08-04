"use client";

import { useState, useTransition } from "react";
import { toggleSource } from "./actions";

type Source = {
  id: string;
  name: string;
  type: "link" | "native";
  slug: string | null;
  destination_phone: string | null;
  meta_ad_id: string | null;
  is_active: boolean;
};

export function SourceRow({ workspaceId, source }: { workspaceId: string; source: Source }) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const trackingUrl =
    source.type === "link"
      ? typeof window === "undefined"
        ? `/r/${source.slug}`
        : `${window.location.origin}/r/${source.slug}`
      : null;

  return (
    <tr>
      <td className="px-4 py-3 font-medium text-neutral-800">{source.name}</td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            source.type === "native" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
          }`}
        >
          {source.type === "native" ? "Anúncio nativo" : "Link"}
        </span>
      </td>
      <td className="px-4 py-3 text-neutral-500">
        {source.type === "link" ? (
          <button
            onClick={() => {
              if (trackingUrl) navigator.clipboard.writeText(trackingUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs text-neutral-700 hover:bg-neutral-200"
          >
            {copied ? "Copiado!" : `/r/${source.slug}`}
          </button>
        ) : source.meta_ad_id ? (
          <span className="font-mono text-xs">ad_id: {source.meta_ad_id}</span>
        ) : (
          <span className="text-xs text-neutral-400">casado automaticamente via ctwa_clid</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            source.is_active ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
          }`}
        >
          {source.is_active ? "Ativo" : "Pausado"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          disabled={isPending}
          onClick={() => startTransition(() => toggleSource(workspaceId, source.id, !source.is_active))}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-800"
        >
          {source.is_active ? "Pausar" : "Ativar"}
        </button>
      </td>
    </tr>
  );
}
