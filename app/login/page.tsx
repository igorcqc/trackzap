"use client";

import { useState } from "react";
import { signInWithPassword } from "./actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-neutral-200 bg-white p-8">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Entrar no TrackZap</h1>
          <p className="mt-1 text-sm text-neutral-500">Acesse com seu e-mail e senha.</p>
        </div>
        <form
          action={async (formData) => {
            setError(null);
            setIsSubmitting(true);
            const result = await signInWithPassword(formData);
            setIsSubmitting(false);
            if (result?.error) setError(result.error);
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
          <input
            name="password"
            type="password"
            required
            placeholder="Senha"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
