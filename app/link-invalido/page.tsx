export default function InvalidLinkPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-neutral-50 px-6 text-center">
      <h1 className="text-xl font-semibold text-neutral-900">Link não encontrado</h1>
      <p className="mt-2 max-w-sm text-sm text-neutral-500">
        Este link de rastreamento não existe ou foi pausado.
      </p>
    </div>
  );
}
