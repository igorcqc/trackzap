"use client";

import { useState, useTransition } from "react";
import { toggleLink } from "./actions";

type Link = {
  id: string;
  name: string;
  slug: string;
  destination_phone: string;
  is_active: boolean;
};

export function LinkRow({ link }: { link: Link }) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const trackingUrl =
    typeof window === "undefined"
      ? `/r/${link.slug}`
      : `${window.location.origin}/r/${link.slug}`;

  return (
    <tr>
      <td className="px-4 py-3 font-medium text-neutral-800">{link.name}</td>
      <td className="px-4 py-3">
        <button
          onClick={() => {
            navigator.clipboard.writeText(trackingUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs text-neutral-700 hover:bg-neutral-200"
        >
          {copied ? "Copiado!" : `/r/${link.slug}`}
        </button>
      </td>
      <td className="px-4 py-3 text-neutral-500">+{link.destination_phone}</td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            link.is_active ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
          }`}
        >
          {link.is_active ? "Ativo" : "Pausado"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          disabled={isPending}
          onClick={() => startTransition(() => toggleLink(link.id, !link.is_active))}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-800"
        >
          {link.is_active ? "Pausar" : "Ativar"}
        </button>
      </td>
    </tr>
  );
}
