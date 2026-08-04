import { requireWorkspace } from "@/lib/workspace/get-workspace";
import { saveSettings } from "./actions";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const { workspace } = await requireWorkspace(workspaceId);

  const webhookUrl =
    (process.env.NEXT_PUBLIC_SITE_URL ?? "https://SEU-DOMINIO.vercel.app") + "/api/webhook/whatsapp";
  const saveSettingsBound = saveSettings.bind(null, workspaceId);
  const isConnected = Boolean(workspace.whatsapp_phone_number_id);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Configurações — {workspace.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Credenciais do Meta Conversions API e do WhatsApp Cloud API deste workspace.
        </p>
      </div>

      <div
        className={`rounded-xl border p-4 text-sm ${
          isConnected
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        <p className="font-medium">
          {isConnected ? "Phone Number ID configurado" : "Ainda sem WhatsApp conectado"}
        </p>
        <p className="mt-1">
          URL de callback do webhook:{" "}
          <code className="rounded bg-white/60 px-1 py-0.5">{webhookUrl}</code>
        </p>
        <p className="mt-1">
          Verify token: defina a variável de ambiente{" "}
          <code className="rounded bg-white/60 px-1 py-0.5">WHATSAPP_WEBHOOK_VERIFY_TOKEN</code> e use o
          mesmo valor ao registrar o webhook no App da Meta (é compartilhado entre todos os workspaces).
        </p>
      </div>

      <form
        action={saveSettingsBound}
        className="space-y-5 rounded-xl border border-neutral-200 bg-white p-5"
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">Nome do workspace</label>
          <input
            name="name"
            defaultValue={workspace.name}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <fieldset className="space-y-4 border-t border-neutral-100 pt-4">
          <legend className="text-sm font-semibold text-neutral-800">Meta Conversions API</legend>
          <Field label="Pixel ID" name="meta_pixel_id" defaultValue={workspace.meta_pixel_id ?? ""} placeholder="123456789012345" />
          <Field
            label="Access Token (CAPI)"
            name="meta_access_token"
            type="password"
            defaultValue={workspace.meta_access_token ?? ""}
            placeholder="EAAG..."
          />
          <Field
            label="Test Event Code (opcional)"
            name="meta_test_event_code"
            defaultValue={workspace.meta_test_event_code ?? ""}
            placeholder="TEST12345"
          />
          <Field label="Moeda padrão" name="default_currency" defaultValue={workspace.default_currency ?? "BRL"} />
        </fieldset>

        <fieldset className="space-y-4 border-t border-neutral-100 pt-4">
          <legend className="text-sm font-semibold text-neutral-800">WhatsApp Cloud API</legend>
          <p className="text-xs text-neutral-400">
            Preencha depois de migrar o número para Cloud API com Coexistence ativado.
          </p>
          <Field
            label="Phone Number ID"
            name="whatsapp_phone_number_id"
            defaultValue={workspace.whatsapp_phone_number_id ?? ""}
            placeholder="109876543210"
          />
          <Field
            label="WABA ID"
            name="whatsapp_waba_id"
            defaultValue={workspace.whatsapp_waba_id ?? ""}
            placeholder="203948561023"
          />
          <Field
            label="Número exibido (wa.me)"
            name="whatsapp_display_number"
            defaultValue={workspace.whatsapp_display_number ?? ""}
            placeholder="5511999999999"
          />
        </fieldset>

        <button
          type="submit"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Salvar configurações
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-neutral-700">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
