import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardHome() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: linkCount }, { count: clickCount }, { count: conversationCount }, { count: eventCount }] =
    await Promise.all([
      supabase.from("links").select("*", { count: "exact", head: true }),
      supabase
        .from("clicks")
        .select("*, links!inner(user_id)", { count: "exact", head: true })
        .eq("links.user_id", user!.id),
      supabase.from("conversations").select("*", { count: "exact", head: true }),
      supabase
        .from("events")
        .select("*, conversations!inner(user_id)", { count: "exact", head: true })
        .eq("conversations.user_id", user!.id)
        .eq("meta_sent", true),
    ]);

  const stats = [
    { label: "Links ativos", value: linkCount ?? 0 },
    { label: "Cliques rastreados", value: clickCount ?? 0 },
    { label: "Conversas", value: conversationCount ?? 0 },
    { label: "Eventos enviados ao Meta", value: eventCount ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Visão geral</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Do clique no anúncio até a conversa no WhatsApp, com o evento chegando no Meta.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-2xl font-semibold text-neutral-900">{s.value}</p>
            <p className="mt-1 text-xs text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>
      <ol className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
        <li>1. Configure suas credenciais do Meta e do WhatsApp Cloud API em Configurações.</li>
        <li>2. Crie um link de rastreamento em Links e use-o nos seus anúncios/bio.</li>
        <li>3. Quando o cliente clicar e mandar a mensagem pré-preenchida, a conversa aparece aqui.</li>
        <li>4. Marque a conversa como Lead ou Venda para disparar o evento ao Meta Conversions API.</li>
      </ol>
    </div>
  );
}
