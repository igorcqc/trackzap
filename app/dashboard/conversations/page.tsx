import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ConversionForm } from "./conversion-form";

const STATUS_LABEL: Record<string, string> = {
  new: "Novo",
  contacted: "Em conversa",
  qualified: "Lead qualificado",
  won: "Venda",
  lost: "Perdido",
};

export default async function ConversationsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: conversations } = await supabase
    .from("conversations")
    .select("*, contacts(*), links(name), events(*)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Conversas</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Contatos que chegaram pelo WhatsApp, com a origem (link/anúncio) já vinculada.
        </p>
      </div>

      <div className="space-y-3">
        {conversations?.map((conv) => (
          <div key={conv.id} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-neutral-800">
                  {conv.contacts?.name || `+${conv.contacts?.wa_id}`}
                </p>
                <p className="text-xs text-neutral-400">+{conv.contacts?.wa_id}</p>
                {conv.first_message && (
                  <p className="mt-2 max-w-lg text-sm text-neutral-600">“{conv.first_message}”</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">
                    {conv.links?.name ?? "Sem link de origem"}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">
                    {STATUS_LABEL[conv.status] ?? conv.status}
                  </span>
                  {conv.events?.map((e: { id: string; meta_sent: boolean; event_name: string }) => (
                    <span
                      key={e.id}
                      className={`rounded-full px-2 py-0.5 ${
                        e.meta_sent ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {e.event_name} → Meta {e.meta_sent ? "✓" : "falhou"}
                    </span>
                  ))}
                </div>
              </div>
              <ConversionForm conversationId={conv.id} />
            </div>
          </div>
        ))}
        {!conversations?.length && (
          <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-neutral-400">
            Nenhuma conversa ainda. Compartilhe um link de rastreamento para começar.
          </div>
        )}
      </div>
    </div>
  );
}
