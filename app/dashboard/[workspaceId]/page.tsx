import { requireWorkspace } from "@/lib/workspace/get-workspace";

export default async function WorkspaceOverview({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const { supabase, workspace } = await requireWorkspace(workspaceId);

  const [
    { count: sourceCount },
    { count: clickCount },
    { count: conversationCount },
    { data: conversations },
    { data: events },
  ] = await Promise.all([
    supabase.from("sources").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase
      .from("clicks")
      .select("*, sources!inner(workspace_id)", { count: "exact", head: true })
      .eq("sources.workspace_id", workspaceId),
    supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase.from("conversations").select("id, status, ctwa_clid, click_id").eq("workspace_id", workspaceId),
    supabase
      .from("events")
      .select("*, conversations!inner(workspace_id)")
      .eq("conversations.workspace_id", workspaceId),
  ]);

  const leads = (conversations ?? []).filter((c) => c.status === "qualified" || c.status === "won").length;
  const sales = (conversations ?? []).filter((c) => c.status === "won").length;
  const identified = (conversations ?? []).filter((c) => c.ctwa_clid || c.click_id).length;
  const identifiedPct = conversations?.length ? Math.round((identified / conversations.length) * 100) : 0;

  const revenue = (events ?? [])
    .filter((e) => e.event_name === "Purchase" && e.meta_sent)
    .reduce((sum, e) => sum + Number(e.value ?? 0), 0);

  const sentEvents = (events ?? []).filter((e) => e.meta_sent).length;

  const stats = [
    { label: "Origens ativas", value: sourceCount ?? 0 },
    { label: "Cliques rastreados", value: clickCount ?? 0 },
    { label: "Conversas", value: conversationCount ?? 0 },
    { label: "Leads", value: leads },
    { label: "Vendas", value: sales },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Visão geral — {workspace.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Do clique no anúncio até a conversa no WhatsApp, com o evento chegando no Meta.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-2xl font-semibold text-neutral-900">{s.value}</p>
            <p className="mt-1 text-xs text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-800">Qualidade da atribuição</h2>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">{identifiedPct}%</p>
          <p className="mt-1 text-xs text-neutral-500">
            das conversas chegaram com origem identificada (anúncio nativo via <code>ctwa_clid</code>{" "}
            ou link rastreado). O restante caiu como não identificado.
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-800">Receita atribuída</h2>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">
            {revenue.toLocaleString("pt-BR", { style: "currency", currency: workspace.default_currency ?? "BRL" })}
          </p>
          <p className="mt-1 text-xs text-neutral-500">{sentEvents} eventos enviados com sucesso ao Meta.</p>
        </div>
      </div>

      <ol className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
        <li>1. Configure as credenciais do Meta e do WhatsApp Cloud API em Configurações.</li>
        <li>2. Crie uma origem em Origens: um link rastreador ou o cadastro de uma campanha nativa.</li>
        <li>3. Quando o cliente mandar a mensagem, a conversa aparece em Conversas já com a origem vinculada.</li>
        <li>4. Marque a conversa como Lead ou Venda para disparar o evento ao Meta Conversions API.</li>
      </ol>
    </div>
  );
}
