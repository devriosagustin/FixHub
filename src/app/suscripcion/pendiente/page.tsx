/**
 * Página de pago pendiente en MercadoPago
 * 
 * Se muestra cuando el pago está pendiente de procesamiento
 * (transferencia bancaria, etc.)
 */

"use client";

import Link from "next/link";
import { Clock, Home, Mail } from "lucide-react";

export default function SuscripcionPendientePage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl border border-border p-8 text-center shadow-sm">
        {/* Icono de pendiente */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
          <Clock className="h-10 w-10 text-warning" />
        </div>

        <h1 className="text-2xl font-bold text-navy mb-2">
          Pago pendiente
        </h1>

        <p className="text-text-light mb-6">
          Tu pago está siendo procesado. Te notificaremos por email cuando se
          acredite.
        </p>

        {/* Info adicional */}
        <div className="bg-surface rounded-lg p-4 mb-6 text-sm text-left">
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-text-light mt-0.5 flex-shrink-0" />
            <p className="text-text-light">
              Si elegiste transferencia bancaria, el pago puede tardar hasta 48
              hábiles en acreditarse.
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-xl bg-navy px-6 py-3 font-semibold text-white transition-colors hover:bg-navy-dark"
          >
            <Home className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
