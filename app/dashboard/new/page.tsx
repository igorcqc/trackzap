import { createWorkspace } from "./actions";

export default function NewWorkspacePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-neutral-200 bg-white p-8">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Conectar um novo número</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Cada workspace representa um número de WhatsApp / cliente. Você pode configurar as
            credenciais logo em seguida.
          </p>
        </div>
        <form action={createWorkspace} className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700">Nome do cliente/negócio</label>
            <input
              name="name"
              required
              placeholder="Aurora Cosméticos"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Criar workspace
          </button>
        </form>
      </div>
    </div>
  );
}
