"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 text-6xl">⚠️</div>
      <h1 className="mb-2 text-3xl font-bold text-navy">Algo salió mal</h1>
      <p className="mb-6 max-w-md text-text-light">
        Ocurrió un error inesperado. Por favor, intentá de nuevo o volvé al inicio.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl border border-navy px-6 py-3 font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
        >
          Intentar de nuevo
        </button>
        <Link
          href="/"
          className="rounded-xl bg-orange px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-dark"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
