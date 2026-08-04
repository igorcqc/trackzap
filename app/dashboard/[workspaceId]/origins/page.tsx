import { requireWorkspace } from "@/lib/workspace/get-workspace";
import { createLinkSource, createNativeSource } from "./actions";
import { SourceRow } from "./source-row";

export default async function OriginsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const { supabase } = await requireWorkspace(workspaceId);
  const { data: sources } = await supabase
    .from("sources")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const createLinkSourceBound = createLinkSource.bind(null, workspaceId);
  const createNativeSourceBound = createNativeSource.bind(null, workspaceId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Origens</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Duas formas de rastrear: um link redirecionador (bio, site, outros canais) ou o cadastro de
          uma campanha nativa &ldquo;Clique para WhatsApp&rdquo; (a atribuição chega sozinha via{" "}
          <code>ctwa_clid</code>).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <form
          action={createLinkSourceBound}
          className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5"
        >
          <h2 className="text-sm font-semibold text-neutral-800">Novo link rastreador</h2>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700">Nome</label>
            <input
              name="name"
              required
              placeholder="Instagram Ads - Verão 2026"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700">Número de WhatsApp de destino</label>
            <input
              name="destination_phone"
              required
              placeholder="5511999999999"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700">Mensagem pré-preenchida</label>
            <input
              name="prefilled_message"
              defaultValue="Olá! Vim pelo anúncio."
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <p className="text-xs text-neutral-400">Um código curto é adicionado ao final para rastreio.</p>
          </div>
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Criar link
          </button>
        </form>

        <form
          action={createNativeSourceBound}
          className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5"
        >
          <h2 className="text-sm font-semibold text-neutral-800">Nova campanha nativa (CTWA)</h2>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700">Nome</label>
            <input
              name="name"
              required
              placeholder="CTWA - Skincare Setembro"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700">Ad ID do Meta (opcional)</label>
            <input
              name="meta_ad_id"
              placeholder="120211..."
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <p className="text-xs text-neutral-400">
              Se preenchido, rotula automaticamente as conversas vindas desse anúncio. Sem isso, elas
              ainda são rastreadas via <code>ctwa_clid</code>, só não ficam agrupadas com nome.
            </p>
          </div>
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Cadastrar campanha
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Detalhe</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {sources?.map((source) => (
              <SourceRow key={source.id} workspaceId={workspaceId} source={source} />
            ))}
            {!sources?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  Nenhuma origem criada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
