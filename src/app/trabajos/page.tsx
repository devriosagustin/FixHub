"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MapPin, Lock, Briefcase } from "lucide-react";

interface Trabajo {
  id: string;
  titulo: string;
  descripcion: string;
  ciudad: string | null;
  barrio: string | null;
  tipoContratacion: "POR_HORA" | "PRESUPUESTO" | "CONVENIR";
  presupuestoMin: number | null;
  presupuestoMax: number | null;
  fechaLimite: string | null;
  createdAt: string;
  oficio: { nombre: string; icono: string };
}

interface Oficio {
  id: string;
  nombre: string;
  icono: string;
}

const TIPO_LABEL: Record<Trabajo["tipoContratacion"], string> = {
  POR_HORA: "Por hora",
  PRESUPUESTO: "Presupuesto total",
  CONVENIR: "A convenir",
};

function formatearPresupuesto(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `$${min.toLocaleString("es-AR")} - $${max.toLocaleString("es-AR")}`;
  if (min != null) return `Desde $${min.toLocaleString("es-AR")}`;
  if (max != null) return `Hasta $${max.toLocaleString("es-AR")}`;
  return null;
}

export default function VerTrabajosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [tieneAcceso, setTieneAcceso] = useState(true);
  const [oficios, setOficios] = useState<Oficio[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [oficioId, setOficioId] = useState("");
  const [ciudad, setCiudad] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login?callbackUrl=/trabajos");
      return;
    }
    if (session.user.rol !== "PROFESIONAL" && session.user.rol !== "ADMIN") {
      router.push("/cliente/trabajos");
      return;
    }
    fetch("/api/oficios")
      .then((res) => res.json())
      .then((data) => setOficios(data))
      .catch(() => {});
  }, [status, session, router]);

  const ejecutarBusqueda = useCallback(async () => {
    setCargando(true);
    const params = new URLSearchParams();
    if (oficioId) params.set("oficioId", oficioId);
    if (ciudad) params.set("ciudad", ciudad);
    try {
      const res = await fetch(`/api/trabajos?${params}`);
      const data = await res.json();
      setTrabajos(data.trabajos || []);
      setTieneAcceso(data.tieneAcceso !== false);
    } catch {
      setTrabajos([]);
    } finally {
      setCargando(false);
    }
  }, [oficioId, ciudad]);

  useEffect(() => {
    if (session) ejecutarBusqueda();
  }, [ejecutarBusqueda, session]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange border-t-transparent" />
      </div>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-border bg-white px-4 py-2.5 text-text outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-navy">
          <Briefcase className="h-6 w-6 text-orange" />
          Trabajos disponibles
        </h1>
        <p className="mt-1 text-text-light">
          Trabajos publicados por clientes que buscan profesionales.
        </p>
      </div>

      {!tieneAcceso && (
        <div className="mb-6 rounded-xl border border-orange/30 bg-orange/5 p-5">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-orange" />
            <div className="flex-1">
              <p className="font-semibold text-navy">
                Para ver el detalle y postularte necesitás una suscripción paga
              </p>
              <p className="mt-1 text-sm text-text-light">
                Podés navegar los trabajos disponibles, pero necesitás el plan Profesional o
                Premium para ver el contacto del cliente y enviar tu propuesta.
              </p>
              <Link
                href="/planes"
                className="mt-3 inline-block rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-dark"
              >
                Ver planes
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-light">Oficio</label>
          <select value={oficioId} onChange={(e) => setOficioId(e.target.value)} className={inputCls}>
            <option value="">Todos</option>
            {oficios.map((o) => (
              <option key={o.id} value={o.id}>
                {o.icono} {o.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-light">Ciudad</label>
          <input
            type="text"
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            placeholder="Ej: Córdoba"
            className={inputCls}
          />
        </div>
        <div className="flex items-end">
          {(oficioId || ciudad) && (
            <button
              onClick={() => {
                setOficioId("");
                setCiudad("");
              }}
              className="rounded-lg border border-border px-4 py-2.5 text-sm text-text hover:bg-surface"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Resultados */}
      {cargando ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange border-t-transparent" />
        </div>
      ) : trabajos.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <p className="text-lg font-medium text-navy">No hay trabajos disponibles</p>
          <p className="mt-2 text-text-light">Probá cambiar los filtros o volver más tarde.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trabajos.map((t) => {
            const presupuesto = formatearPresupuesto(t.presupuestoMin, t.presupuestoMax);
            return (
              <Link
                key={t.id}
                href={tieneAcceso ? `/trabajos/${t.id}` : "/planes"}
                className="block rounded-xl border border-border bg-card p-5 transition-all hover:border-orange/30 hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-navy">{t.titulo}</h3>
                  <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-text-light">
                    {t.oficio.icono} {t.oficio.nombre}
                  </span>
                  {!tieneAcceso && (
                    <span className="ml-auto flex items-center gap-1 text-xs font-medium text-orange">
                      <Lock className="h-3.5 w-3.5" /> Suscripción
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-text-light">{t.descripcion}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-text-light">
                  {t.ciudad && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {t.ciudad}{t.barrio ? `, ${t.barrio}` : ""}
                    </span>
                  )}
                  <span>{TIPO_LABEL[t.tipoContratacion]}</span>
                  {presupuesto && <span className="font-semibold text-navy">{presupuesto}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
