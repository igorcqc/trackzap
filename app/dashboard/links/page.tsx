import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createLink } from "./actions";
import { LinkRow } from "./link-row";

export default async function LinksPage() {
  const supabase = await createSupabaseServerClient();
  const { data: links } = await supabase
    .from("links")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Links de rastreamento</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Crie um link para cada anúncio ou canal. Todo clique é registrado com UTM/fbclid antes de
          redirecionar para o WhatsApp.
        </p>
      </div>

      <form
        action={createLink}
        className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-5 sm:grid-cols-2"
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">Nome do link</label>
          <input
            name="name"
            required
            placeholder="Anúncio Instagram - Agosto"
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
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-sm font-medium text-neutral-700">Mensagem pré-preenchida</label>
          <input
            name="prefilled_message"
            defaultValue="Olá! Vim pelo anúncio."
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-neutral-400">
            Um código curto é adicionado automaticamente ao final da mensagem para rastreio.
          </p>
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Criar link
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Link</th>
              <th className="px-4 py-3 font-medium">Destino</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {links?.map((link) => (
              <LinkRow key={link.id} link={link} />
            ))}
            {!links?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  Nenhum link criado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
