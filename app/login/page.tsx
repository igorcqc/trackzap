"use client";

import { useState } from "react";
import { sendMagicLink } from "./actions";

export default function LoginPage() {
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-neutral-200 bg-white p-8">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Entrar no TrackZap</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Enviamos um link mágico de acesso para o seu e-mail.
          </p>
        </div>
        <form
          action={async (formData) => {
            const result = await sendMagicLink(formData);
            if (result?.error) {
              setError(result.error);
              setStatus("error");
            } else {
              setStatus("sent");
            }
          }}
          className="space-y-3"
        >
          <input
            name="email"
            type="email"
            required
            placeholder="voce@empresa.com"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Enviar link de acesso
          </button>
        </form>
        {status === "sent" && (
          <p className="text-sm text-emerald-600">Verifique sua caixa de entrada para continuar.</p>
        )}
        {status === "error" && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
