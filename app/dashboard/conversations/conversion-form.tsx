"use client";

import { useState } from "react";
import { markConversion } from "./actions";

export function ConversionForm({ conversationId }: { conversationId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
      >
        Marcar conversão
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await markConversion(formData);
        setOpen(false);
      }}
      className="flex shrink-0 flex-wrap items-center gap-2"
    >
      <input type="hidden" name="conversation_id" value={conversationId} />
      <select name="event_name" className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs">
        <option value="Lead">Lead</option>
        <option value="Purchase">Purchase (venda)</option>
      </select>
      <input
        name="value"
        placeholder="Valor (opcional)"
        className="w-28 rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
      />
      <button
        type="submit"
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
      >
        Enviar ao Meta
      </button>
    </form>
  );
}
