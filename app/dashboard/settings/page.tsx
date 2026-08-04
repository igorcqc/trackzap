import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveSettings } from "./actions";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", user!.id)
    .maybeSingle();

  const webhookUrl =
    (process.env.NEXT_PUBLIC_SITE_URL ?? "https://SEU-DOMINIO.vercel.app") +
    "/api/webhook/whatsapp";

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Configurações</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Credenciais do Meta Conversions API e do WhatsApp Cloud API.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium">Configure o webhook no Meta App</p>
        <p className="mt-1">
          URL de callback: <code className="rounded bg-amber-100 px-1 py-0.5">{webhookUrl}</code>
        </p>
        <p className="mt-1">
          Verify token: defina a variável de ambiente{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5">WHATSAPP_WEBHOOK_VERIFY_TOKEN</code> e use
          o mesmo valor ao registrar o webhook.
        </p>
      </div>

      <form action={saveSettings} className="space-y-5 rounded-xl border border-neutral-200 bg-white p-5">
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-neutral-800">Meta Conversions API</legend>
          <Field
            label="Pixel ID"
            name="meta_pixel_id"
            defaultValue={settings?.meta_pixel_id ?? ""}
            placeholder="123456789012345"
          />
          <Field
            label="Access Token (CAPI)"
            name="meta_access_token"
            type="password"
            defaultValue={settings?.meta_access_token ?? ""}
            placeholder="EAAG..."
          />
          <Field
            label="Test Event Code (opcional)"
            name="meta_test_event_code"
            defaultValue={settings?.meta_test_event_code ?? ""}
            placeholder="TEST12345"
          />
          <Field
            label="Moeda padrão"
            name="default_currency"
            defaultValue={settings?.default_currency ?? "BRL"}
          />
        </fieldset>

        <fieldset className="space-y-4 border-t border-neutral-100 pt-4">
          <legend className="text-sm font-semibold text-neutral-800">WhatsApp Cloud API</legend>
          <Field
            label="Phone Number ID"
            name="whatsapp_phone_number_id"
            defaultValue={settings?.whatsapp_phone_number_id ?? ""}
            placeholder="109876543210"
          />
          <Field
            label="Número exibido (wa.me)"
            name="whatsapp_display_number"
            defaultValue={settings?.whatsapp_display_number ?? ""}
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
