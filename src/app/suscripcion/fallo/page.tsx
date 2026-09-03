/**
 * Página de fallo después del pago en MercadoPago
 * 
 * Se muestra cuando el pago falla o el usuario cancela.
 */

"use client";

import Link from "next/link";
import { XCircle, ArrowRight, Home } from "lucide-react";

export default function SuscripcionFalloPage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl border border-border p-8 text-center shadow-sm">
        {/* Icono de error */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
          <XCircle className="h-10 w-10 text-error" />
        </div>

        <h1 className="text-2xl font-bold text-navy mb-2">
          Pago no completado
        </h1>

        <p className="text-text-light mb-6">
          El pago no se pudo procesar. Podés intentar nuevamente cuando quieras.
        </p>

        {/* Acciones */}
        <div className="flex flex-col gap-3">
          <Link
            href="/planes"
            className="flex items-center justify-center gap-2 rounded-xl bg-orange px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-dark"
          >
            Intentar nuevamente
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 font-medium text-text transition-colors hover:bg-surface"
          >
            <Home className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
