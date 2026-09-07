/**
 * Página de Planes y Precios
 * 
 * Muestra los 3 planes de suscripción:
 * - Gratuito
 * - Profesional ($4.999/mes)
 * - Premium ($9.999/mes)
 * 
 * Incluye comparativa de features, FAQ y CTA para elegir un plan.
 */

"use client";

import { Suspense, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X, Loader2, Sparkles, Star, Crown, Info } from "lucide-react";
import { PLANES, formatearPrecio, type PlanId } from "@/lib/plans";

/** Icono según el plan */
function PlanIcon({ planId }: { planId: PlanId }) {
  switch (planId) {
    case "PREMIUM":
      return <Crown className="h-6 w-6" />;
    case "PROFESIONAL":
      return <Star className="h-6 w-6" />;
    default:
      return <Sparkles className="h-6 w-6" />;
  }
}

/** Banner contextual según el motivo por el que se llegó a /planes (ej: perfil inactivo) */
function MotivoBanner() {
  const searchParams = useSearchParams();
  const motivo = searchParams.get("motivo");

  if (motivo !== "perfil-inactivo") return null;

  return (
    <div className="mx-auto -mt-8 mb-8 max-w-3xl px-4">
      <div className="flex items-start gap-3 rounded-xl border border-orange/30 bg-orange/10 p-4 text-sm text-navy">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-orange" />
        <p>
          Tu perfil no aparece en la búsqueda ni puede ser contactado porque
          no tenés una suscripción paga activa. Elegí un plan para volver a
          estar visible para los clientes.
        </p>
      </div>
    </div>
  );
}

export default function PlanesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [cargando, setCargando] = useState<PlanId | null>(null);

  /**
   * Seleccionar un plan
   * Si es gratuito, crear suscripción directa
   * Si es de pago, redirigir a MercadoPago checkout
   */
  const handleSeleccionarPlan = async (planId: PlanId) => {
    if (!session) {
      router.push("/login");
      return;
    }

    // Si es el plan gratuito, crear directamente
    if (planId === "GRATUITO") {
      try {
        setCargando(planId);
        const res = await fetch("/api/suscripcion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: planId }),
        });

        if (res.ok) {
          alert("¡Plan gratuito activado!");
          router.push("/profesional/perfil");
        } else {
          const err = await res.json();
          alert(err.error || "Error al activar el plan");
        }
      } catch {
        alert("Error al procesar la solicitud");
      } finally {
        setCargando(null);
      }
      return;
    }

    // Para planes de pago, crear checkout en MercadoPago
    try {
      setCargando(planId);
      const res = await fetch("/api/suscripcion/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });

      if (res.ok) {
        const data = await res.json();
        // Redirigir al checkout de MercadoPago (sandbox en pruebas, prod en producción)
        const checkoutUrl = data.checkout_url || data.init_point;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        } else {
          alert("Error al crear el checkout");
        }
      } else {
        const err = await res.json();
        alert(err.error || "Error al crear el checkout");
      }
    } catch {
      alert("Error al procesar la solicitud");
    } finally {
      setCargando(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <div className="bg-navy py-16 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Elegí tu plan
          </h1>
          <p className="mt-3 text-lg text-white/80">
            Potenciá tu perfil y llegá a más clientes
          </p>
        </div>
      </div>

      <Suspense fallback={null}>
        <MotivoBanner />
      </Suspense>

      {/* Planes */}
      <div className="mx-auto max-w-5xl px-4 -mt-8 pb-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {(["GRATUITO", "PROFESIONAL", "PREMIUM"] as PlanId[]).map((planId) => {
            const plan = PLANES[planId];
            const estaCargando = cargando === planId;

            return (
              <div
                key={planId}
                className={`relative rounded-2xl border-2 bg-card p-6 shadow-sm transition-shadow hover:shadow-md ${plan.color} ${
                  plan.popular ? "ring-2 ring-orange" : ""
                }`}
              >
                {/* Badge "Más popular" */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-orange px-4 py-1 text-xs font-bold text-white shadow-md">
                      Más popular
                    </span>
                  </div>
                )}

                {/* Header del plan */}
                <div className="mb-6 text-center">
                  <div
                    className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${
                      planId === "GRATUITO"
                        ? "bg-surface text-text-light"
                        : planId === "PROFESIONAL"
                        ? "bg-orange/10 text-orange"
                        : "bg-navy/10 text-navy"
                    }`}
                  >
                    <PlanIcon planId={planId} />
                  </div>
                  <h2 className="text-xl font-bold text-navy">{plan.nombre}</h2>
                  <p className="mt-1 text-sm text-text-light">{plan.descripcion}</p>

                  {/* Precio */}
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-navy">
                      {formatearPrecio(plan.precio)}
                    </span>
                    {plan.precio !== null && (
                      <span className="text-sm text-text-light">/mes</span>
                    )}
                  </div>
                </div>

                {/* Lista de features */}
                <ul className="mb-6 space-y-2.5">
                  {plan.caracteristicas.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      {feat.incluido ? (
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-text-light" />
                      )}
                      <span
                        className={`text-sm ${
                          feat.incluido ? "text-text" : "text-text-light"
                        }`}
                      >
                        {feat.texto}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleSeleccionarPlan(planId)}
                  disabled={estaCargando}
                  className={`w-full rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${
                    plan.popular
                      ? "bg-orange text-white hover:bg-orange-dark"
                      : planId === "PREMIUM"
                      ? "bg-navy text-white hover:bg-navy-dark"
                      : "border border-border bg-surface text-text hover:bg-border"
                  }`}
                >
                  {estaCargando ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : plan.precio === null ? (
                    "Empezar gratis"
                  ) : (
                    "Elegir este plan"
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-16 mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-navy text-center mb-8">
            Preguntas frecuentes
          </h2>
          <div className="space-y-4">
            {[
              {
                pregunta: "¿Puedo cambiar de plan en cualquier momento?",
                respuesta:
                  "Sí, puedes upgrade o downgrade en cualquier momento. El cambio se refleja inmediatamente y se ajusta el precio proporcionalmente.",
              },
              {
                pregunta: "¿Qué métodos de pago aceptan?",
                respuesta:
                  "Aceptamos todas las tarjetas de crédito y débito, transferencias bancarias y Mercado Pago como procesador de pagos.",
              },
              {
                pregunta: "¿Hay permanencia mínima?",
                respuesta:
                  "No, no hay permanencia. Puedes cancelar tu suscripción en cualquier momento desde tu perfil.",
              },
              {
                pregunta: "¿Qué pasa si no renuevo?",
                respuesta:
                  "Si tu suscripción vence, volverás al plan gratuito automáticamente. Tus datos y reseñas se mantienen.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border bg-card p-5"
              >
                <h3 className="font-semibold text-navy">{faq.pregunta}</h3>
                <p className="mt-2 text-sm text-text-light">{faq.respuesta}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
