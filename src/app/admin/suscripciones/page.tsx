"use client";

import { useEffect, useState } from "react";
import { CreditCard, ChevronLeft, ChevronRight } from "lucide-react";

interface SuscripcionAdmin {
  id: string;
  plan: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  precioMensual: number | null;
  renovacionAuto: boolean;
  perfil: {
    id: string;
    usuario: { nombre: string; email: string; imagen: string | null };
    ciudad: string | null;
    oficios: { oficio: { nombre: string } }[];
  };
  pagos: { monto: number; estadoPago: string; fechaPago: string }[];
}

const estadoColors: Record<string, string> = {
  ACTIVA: "bg-success/10 text-success",
  VENCIDA: "bg-error/10 text-error",
  CANCELADA: "bg-text-light/10 text-text-light",
  PENDIENTE_PAGO: "bg-warning/10 text-warning",
};

const planColors: Record<string, string> = {
  GRATUITO: "bg-surface text-text-light",
  PROFESIONAL: "bg-orange/10 text-orange",
  PREMIUM: "bg-navy/10 text-navy",
};

export default function AdminSuscripcionesPage() {
  const [suscripciones, setSuscripciones] = useState<SuscripcionAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroPlan, setFiltroPlan] = useState("");

  const cargar = async () => {
    setCargando(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (filtroEstado) params.set("estado", filtroEstado);
    if (filtroPlan) params.set("plan", filtroPlan);

    const res = await fetch(`/api/admin/suscripciones?${params}`);
    const data = await res.json();
    setSuscripciones(data.suscripciones || []);
    setTotalPages(data.pagination?.totalPages || 1);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, [page, filtroEstado, filtroPlan]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy">Suscripciones</h1>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={filtroEstado}
          onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVA">Activas</option>
          <option value="VENCIDA">Vencidas</option>
          <option value="CANCELADA">Canceladas</option>
          <option value="PENDIENTE_PAGO">Pendientes</option>
        </select>
        <select
          value={filtroPlan}
          onChange={(e) => { setFiltroPlan(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="">Todos los planes</option>
          <option value="GRATUITO">Gratuito</option>
          <option value="PROFESIONAL">Profesional</option>
          <option value="PREMIUM">Premium</option>
        </select>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {cargando ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy border-t-transparent" />
          </div>
        ) : suscripciones.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-12 text-center text-text-light">
            No se encontraron suscripciones
          </div>
        ) : (
          suscripciones.map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  {s.perfil.usuario.imagen ? (
                    <img src={s.perfil.usuario.imagen} alt="" className="h-10 w-10 rounded-full" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                      {s.perfil.usuario.nombre.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-text">{s.perfil.usuario.nombre}</p>
                    <p className="text-xs text-text-light">
                      {s.perfil.oficios.map(o => o.oficio.nombre).join(", ") || "Sin oficio"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${planColors[s.plan] || ""}`}>
                    {s.plan}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${estadoColors[s.estado] || ""}`}>
                    {s.estado}
                  </span>
                  {s.precioMensual && (
                    <span className="text-sm font-semibold text-navy">
                      ${s.precioMensual.toLocaleString("es-AR")}/mes
                    </span>
                  )}
                  <span className="text-xs text-text-light">
                    {new Date(s.fechaInicio).toLocaleDateString("es-AR")}
                    {s.fechaFin && ` - ${new Date(s.fechaFin).toLocaleDateString("es-AR")}`}
                  </span>
                </div>
              </div>

              {s.pagos.length > 0 && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="mb-1 text-xs font-medium text-text-light">Últimos pagos:</p>
                  <div className="flex flex-wrap gap-2">
                    {s.pagos.map((p, i) => (
                      <span
                        key={i}
                        className={`rounded px-2 py-0.5 text-xs ${
                          p.estadoPago === "approved"
                            ? "bg-success/10 text-success"
                            : "bg-warning/10 text-warning"
                        }`}
                      >
                        ${p.monto.toLocaleString("es-AR")} - {p.estadoPago}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-border p-2 hover:bg-surface disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-text-light">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-border p-2 hover:bg-surface disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
