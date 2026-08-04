import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-neutral-50 px-6 text-center">
      <span className="mb-4 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
        Feito para tráfego pago + WhatsApp
      </span>
      <h1 className="max-w-2xl text-3xl font-semibold text-neutral-900 sm:text-4xl">
        Rastreie do clique no anúncio até a conversa no WhatsApp
      </h1>
      <p className="mt-4 max-w-xl text-neutral-500">
        TrackZap liga cada mensagem de WhatsApp de volta ao anúncio que a originou e envia o evento de
        Contato, Lead ou Venda diretamente para o Meta Conversions API.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Entrar
        </Link>
      </div>
    </div>
  );
}
