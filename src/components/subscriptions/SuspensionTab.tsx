/**
 * SuspensionTab - Panel de gestión de suscripción
 * 
 * Muestra el plan actual del profesional con:
 * - Nombre del plan y estado
 * - Fecha de vencimiento
 * - Beneficios del plan actual
 * - Botón para cambiar de plan o cancelar
 * - Link a la página de planes
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  XCircle,
  Loader2,
  Crown,
  Star,
  Sparkles,
} from "lucide-react";
import { getPlanById, formatearPrecio, type PlanId } from "@/lib/plans";

interface SuscripcionData {
  id: string;
  plan: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  precioMensual: number | null;
  renovacionAuto: boolean;
}

interface SuspensionTabProps {
  perfil: {
    id: string;
    suscripcion: { plan: string } | null;
  };
}

/** Icono del plan */
function PlanIcon({ planId }: { planId: PlanId }) {
  switch (planId) {
    case "PREMIUM":
      return <Crown className="h-5 w-5" />;
    case "PROFESIONAL":
      return <Star className="h-5 w-5" />;
    default:
      return <Sparkles className="h-5 w-5" />;
  }
}

/** Color del badge de estado */
function EstadoBadge({ estado }: { estado: string }) {
  const colores: Record<string, string> = {
    ACTIVA: "bg-success/10 text-success",
    VENCIDA: "bg-error/10 text-error",
    CANCELADA: "bg-text-light/10 text-text-light",
    PENDIENTE_PAGO: "bg-warning/10 text-warning",
  };

  const labels: Record<string, string> = {
    ACTIVA: "Activa",
    VENCIDA: "Vencida",
    CANCELADA: "Cancelada",
    PENDIENTE_PAGO: "Pendiente de pago",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        colores[estado] || "bg-surface text-text-light"
      }`}
    >
      {estado === "ACTIVA" && <CheckCircle className="h-3 w-3" />}
      {estado === "PENDIENTE_PAGO" && <Clock className="h-3 w-3" />}
      {(estado === "VENCIDA" || estado === "CANCELADA") && (
        <AlertTriangle className="h-3 w-3" />
      )}
      {labels[estado] || estado}
    </span>
  );
}

export function SuspensionTab({ perfil }: SuspensionTabProps) {
  const router = useRouter();
  const [suscripcion, setSuscripcion] = useState<SuscripcionData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cancelando, setCancelando] = useState(false);
  const [guardandoRenovacion, setGuardandoRenovacion] = useState(false);

  // Alternar renovación automática
  const handleToggleRenovacion = async () => {
    if (!suscripcion) return;
    setGuardandoRenovacion(true);
    try {
      const res = await fetch("/api/suscripcion/renovacion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activar: !suscripcion.renovacionAuto }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuscripcion((prev) =>
          prev ? { ...prev, renovacionAuto: data.renovacionAuto } : prev
        );
        alert(data.mensaje);
      } else {
        const err = await res.json();
        alert(err.error || "Error al actualizar la renovación");
      }
    } catch {
      alert("Error al actualizar la renovación");
    } finally {
      setGuardandoRenovacion(false);
    }
  };

  // Cargar datos de suscripción
  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch("/api/suscripcion");
        if (res.ok) {
          const data = await res.json();
          setSuscripcion(data.suscripcion);
        }
      } catch (err) {
        console.error("Error al cargar suscripción:", err);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  // Cancelar suscripción
  const handleCancelar = async () => {
    if (!confirm("¿Estás seguro de que querés cancelar tu suscripción? Se mantendrá activa hasta la fecha de vencimiento.")) {
      return;
    }

    setCancelando(true);
    try {
      const res = await fetch("/api/suscripcion/cancel", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(data.mensaje);
        // Recargar datos
        const reloadRes = await fetch("/api/suscripcion");
        if (reloadRes.ok) {
          const reloadData = await reloadRes.json();
          setSuscripcion(reloadData.suscripcion);
        }
      } else {
        const err = await res.json();
        alert(err.error || "Error al cancelar");
      }
    } catch {
      alert("Error al cancelar la suscripción");
    } finally {
      setCancelando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 text-navy animate-spin" />
      </div>
    );
  }

  const planActual = getPlanById((suscripcion?.plan || "GRATUITO") as PlanId);

  return (
    <div className="space-y-6">
      {/* Plan actual */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-navy">Mi plan</h2>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                planActual.id === "GRATUITO"
                  ? "bg-surface text-text-light"
                  : planActual.id === "PROFESIONAL"
                  ? "bg-orange/10 text-orange"
                  : "bg-navy/10 text-navy"
              }`}
            >
              <PlanIcon planId={planActual.id} />
            </div>
            <div>
              <h3 className="font-bold text-navy">{planActual.nombre}</h3>
              <p className="text-sm text-text-light">
                {formatearPrecio(planActual.precio)}
                {planActual.precio !== null && "/mes"}
              </p>
            </div>
          </div>

          {suscripcion && <EstadoBadge estado={suscripcion.estado} />}
        </div>

        {/* Fechas */}
        {suscripcion && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-surface rounded-lg p-3">
              <p className="text-text-light">Inicio</p>
              <p className="font-medium text-text">
                {new Date(suscripcion.fechaInicio).toLocaleDateString("es-AR")}
              </p>
            </div>
            {suscripcion.fechaFin && (
              <div className="bg-surface rounded-lg p-3">
                <p className="text-text-light">Vencimiento</p>
                <p className="font-medium text-text">
                  {new Date(suscripcion.fechaFin).toLocaleDateString("es-AR")}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Beneficios del plan actual */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-navy">
          Beneficios de tu plan
        </h3>
        <ul className="space-y-2">
          {planActual.caracteristicas
            .filter((f) => f.incluido)
            .map((feat, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-text">
                <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                {feat.texto}
              </li>
            ))}
        </ul>
      </section>

      {/* Acciones */}
      <section className="rounded-xl border border-border bg-card p-6">
        {suscripcion && planActual.id !== "GRATUITO" && (
          <button
            onClick={handleToggleRenovacion}
            disabled={guardandoRenovacion}
            className="mb-4 flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-navy/30"
          >
            <div>
              <p className="font-medium text-navy">Renovación automática</p>
              <p className="text-sm text-text-light">
                {suscripcion.renovacionAuto
                  ? "Activada: se renovará tu plan al vencer."
                  : "Desactivada: deberás renovar manualmente."}
              </p>
            </div>
            <span
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                suscripcion.renovacionAuto ? "bg-orange" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  suscripcion.renovacionAuto ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </span>
          </button>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {planActual.id === "GRATUITO" ? (
            <Link
              href="/planes"
              className="flex items-center justify-center gap-2 rounded-xl bg-orange px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-dark"
            >
              <CreditCard className="h-4 w-4" />
              Elegir un plan de pago
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/planes"
                className="flex items-center justify-center gap-2 rounded-xl border border-navy px-6 py-3 font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
              >
                <ArrowRight className="h-4 w-4" />
                Cambiar de plan
              </Link>
              {suscripcion?.estado === "ACTIVA" && (
                <button
                  onClick={handleCancelar}
                  disabled={cancelando}
                  className="flex items-center justify-center gap-2 rounded-xl border border-error/30 px-6 py-3 font-medium text-error transition-colors hover:bg-error/5 disabled:opacity-50"
                >
                  {cancelando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Cancelar suscripción
                </button>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
