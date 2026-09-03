/**
 * Página de éxito después del pago en MercadoPago
 *
 * MercadoPago redirige aquí con los parámetros:
 * - payment_id / collection_id
 * - external_reference (id de nuestra suscripción)
 * - status / collection_status
 *
 * Al cargar, confirma el pago contra la API de MercadoPago
 * (/api/suscripcion/confirmar) para activar la suscripción, ya que
 * en local el webhook no siempre llega.
 */

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle, ArrowRight, Home, Loader2, AlertTriangle } from "lucide-react";

function ExitoContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") || searchParams.get("collection_status");
  const paymentId = searchParams.get("payment_id") || searchParams.get("collection_id");
  const externalReference = searchParams.get("external_reference");

  const [estado, setEstado] = useState<"cargando" | "activada" | "pendiente" | "error">(
    "cargando"
  );
  const [detalle, setDetalle] = useState("");

  useEffect(() => {
    if (!externalReference) {
      setEstado("pendiente");
      setDetalle("No se pudo identificar la suscripción. El webhook la activará automáticamente.");
      return;
    }

    let cancelado = false;
    (async () => {
      try {
        const res = await fetch("/api/suscripcion/confirmar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ suscripcionId: externalReference, paymentId }),
        });
        const data = await res.json();
        if (cancelado) return;

        if (data.suscripcion?.estado === "ACTIVA") {
          setEstado("activada");
          setDetalle("Tu suscripción ya está activa.");
        } else {
          setEstado("pendiente");
          setDetalle(
            `El pago está en estado "${data.estado || "pendiente"}". Se confirmará automáticamente cuando el webhook llegue.`
          );
        }
      } catch {
        if (!cancelado) {
          setEstado("error");
          setDetalle("Hubo un problema al confirmar el pago. El webhook lo procesará automáticamente.");
        }
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [externalReference, paymentId]);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl border border-border p-8 text-center shadow-sm">
        {estado === "cargando" ? (
          <>
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-navy" />
            <h1 className="text-2xl font-bold text-navy mb-2">Confirmando pago...</h1>
            <p className="text-text-light">Estamos verificando tu pago con MercadoPago.</p>
          </>
        ) : estado === "activada" ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-navy mb-2">¡Pago exitoso!</h1>
            <p className="text-text-light mb-2">
              Tu suscripción ha sido activada. Ya podés aprovechar todos los beneficios de tu plan.
            </p>
            {paymentId && (
              <div className="bg-surface rounded-lg p-4 mb-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-light">ID del pago:</span>
                  <span className="text-text font-mono">{paymentId}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
              <AlertTriangle className="h-10 w-10 text-warning" />
            </div>
            <h1 className="text-2xl font-bold text-navy mb-2">Pago en proceso</h1>
            <p className="text-text-light mb-2">{detalle}</p>
          </>
        )}

        {/* Acciones */}
        <div className="flex flex-col gap-3 mt-6">
          <Link
            href="/profesional/perfil"
            className="flex items-center justify-center gap-2 rounded-xl bg-orange px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-dark"
          >
            Ir a mi perfil
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

export default function SuscripcionExitoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <div className="text-text-light">Cargando...</div>
        </div>
      }
    >
      <ExitoContent />
    </Suspense>
  );
}
