"use client";

import { useEffect, useState } from "react";
import { DollarSign, ChevronLeft, ChevronRight } from "lucide-react";

interface PagoAdmin {
  id: string;
  monto: number;
  moneda: string;
  metodoPago: string | null;
  estadoPago: string;
  mercadopagoPagoId: string | null;
  fechaPago: string;
  suscripcion: {
    plan: string;
    perfil: {
      usuario: { nombre: string; email: string };
      oficios: { oficio: { nombre: string } }[];
    };
  };
}

const estadoColors: Record<string, string> = {
  approved: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  rejected: "bg-error/10 text-error",
  refunded: "bg-navy/10 text-navy",
};

export default function AdminPagosPage() {
  const [pagos, setPagos] = useState<PagoAdmin[]>([]);
  const [ingresosTotales, setIngresosTotales] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState("");

  const cargar = async () => {
    setCargando(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (filtroEstado) params.set("estadoPago", filtroEstado);

    const res = await fetch(`/api/admin/pagos?${params}`);
    const data = await res.json();
    setPagos(data.pagos || []);
    setIngresosTotales(data.ingresosTotales || 0);
    setTotalPages(data.pagination?.totalPages || 1);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, [page, filtroEstado]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy">Pagos</h1>

      {/* Resumen */}
      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success text-white">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-text-light">Ingresos totales (aprobados)</p>
            <p className="text-2xl font-bold text-navy">
              ${ingresosTotales.toLocaleString("es-AR")}
            </p>
          </div>
        </div>
      </div>

      {/* Filtro */}
      <div className="mb-6">
        <select
          value={filtroEstado}
          onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="approved">Aprobados</option>
          <option value="pending">Pendientes</option>
          <option value="rejected">Rechazados</option>
          <option value="refunded">Reembolsados</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-left font-semibold text-navy">Profesional</th>
              <th className="px-4 py-3 text-left font-semibold text-navy">Plan</th>
              <th className="px-4 py-3 text-left font-semibold text-navy">Monto</th>
              <th className="px-4 py-3 text-left font-semibold text-navy">Estado</th>
              <th className="px-4 py-3 text-left font-semibold text-navy">Método</th>
              <th className="px-4 py-3 text-left font-semibold text-navy">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-navy border-t-transparent" />
                </td>
              </tr>
            ) : pagos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-text-light">
                  No se encontraron pagos
                </td>
              </tr>
            ) : (
              pagos.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text">{p.suscripcion.perfil.usuario.nombre}</p>
                    <p className="text-xs text-text-light">
                      {p.suscripcion.perfil.oficios.map(o => o.oficio.nombre).join(", ")}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-text">{p.suscripcion.plan}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-navy">
                    ${p.monto.toLocaleString("es-AR")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${estadoColors[p.estadoPago] || ""}`}>
                      {p.estadoPago}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-light">
                    {p.metodoPago || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-light">
                    {new Date(p.fechaPago).toLocaleDateString("es-AR")}{" "}
                    {new Date(p.fechaPago).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
