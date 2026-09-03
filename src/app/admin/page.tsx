"use client";

import { useEffect, useState } from "react";
import { Users, Briefcase, Star, MessageCircle, DollarSign, Clock, UserCircle, CreditCard } from "lucide-react";

interface Stats {
  totalProfesionales: number;
  profesionalesPendientes: number;
  profesionalesAprobados: number;
  totalClientes: number;
  totalResenas: number;
  totalMensajes: number;
  resenasPendientes: number;
  suscripcionesActivas: number;
  ingresosTotales: number;
  totalUsuarios: number;
  actividadReciente: {
    profesionalesRecientes: {
      id: string;
      estado: string;
      createdAt: string;
      usuario: { nombre: string; email: string; imagen: string | null };
      oficios: { oficio: { nombre: string } }[];
    }[];
    suscripcionesRecientes: {
      id: string;
      plan: string;
      estado: string;
      fechaInicio: string;
      precioMensual: number | null;
      perfil: { usuario: { nombre: string } };
    }[];
    pagosRecientes: {
      id: string;
      monto: number;
      estadoPago: string;
      fechaPago: string;
      suscripcion: { plan: string; perfil: { usuario: { nombre: string } } };
    }[];
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange border-t-transparent" />
      </div>
    );
  }

  if (!stats) {
    return <div className="py-16 text-center text-error">Error cargando estadísticas</div>;
  }

  const cards = [
    { label: "Profesionales totales", value: stats.totalProfesionales, icon: Briefcase, color: "bg-navy" },
    { label: "Pendientes de aprobación", value: stats.profesionalesPendientes, icon: Clock, color: "bg-warning" },
    { label: "Profesionales aprobados", value: stats.profesionalesAprobados, icon: Users, color: "bg-success" },
    { label: "Clientes registrados", value: stats.totalClientes, icon: Users, color: "bg-navy-light" },
    { label: "Reseñas totales", value: stats.totalResenas, icon: Star, color: "bg-orange" },
    { label: "Mensajes enviados", value: stats.totalMensajes, icon: MessageCircle, color: "bg-navy" },
    { label: "Suscripciones activas", value: stats.suscripcionesActivas, icon: DollarSign, color: "bg-success" },
    { label: "Ingresos totales", value: `$${stats.ingresosTotales.toLocaleString("es-AR")}`, icon: DollarSign, color: "bg-orange" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color} text-white`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-text-light">{card.label}</p>
                <p className="text-2xl font-bold text-navy">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {stats.profesionalesPendientes > 0 && (
        <div className="mt-6 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="font-medium text-warning">
            Hay {stats.profesionalesPendientes} profesional(es) pendiente(s) de aprobación.
          </p>
        </div>
      )}

      {/* Actividad reciente */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Últimos profesionales */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-navy">
            <Briefcase className="h-4 w-4" />
            Últimos profesionales
          </h3>
          <div className="space-y-3">
            {stats.actividadReciente.profesionalesRecientes.length === 0 ? (
              <p className="text-sm text-text-light">Sin actividad</p>
            ) : (
              stats.actividadReciente.profesionalesRecientes.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  {p.usuario.imagen ? (
                    <img src={p.usuario.imagen} alt="" className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                      {p.usuario.nombre.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{p.usuario.nombre}</p>
                    <p className="text-xs text-text-light">
                      {p.oficios.map(o => o.oficio.nombre).join(", ") || "Sin oficio"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    p.estado === "APROBADO" ? "bg-success/10 text-success" :
                    p.estado === "PENDIENTE" ? "bg-warning/10 text-warning" :
                    "bg-text-light/10 text-text-light"
                  }`}>
                    {p.estado}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Últimas suscripciones */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-navy">
            <CreditCard className="h-4 w-4" />
            Últimas suscripciones
          </h3>
          <div className="space-y-3">
            {stats.actividadReciente.suscripcionesRecientes.length === 0 ? (
              <p className="text-sm text-text-light">Sin actividad</p>
            ) : (
              stats.actividadReciente.suscripcionesRecientes.map((s) => (
                <div key={s.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text">{s.perfil.usuario.nombre}</p>
                    <p className="text-xs text-text-light">
                      {new Date(s.fechaInicio).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      s.plan === "PREMIUM" ? "bg-navy/10 text-navy" :
                      s.plan === "PROFESIONAL" ? "bg-orange/10 text-orange" :
                      "bg-surface text-text-light"
                    }`}>
                      {s.plan}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Últimos pagos */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-navy">
            <DollarSign className="h-4 w-4" />
            Últimos pagos
          </h3>
          <div className="space-y-3">
            {stats.actividadReciente.pagosRecientes.length === 0 ? (
              <p className="text-sm text-text-light">Sin pagos</p>
            ) : (
              stats.actividadReciente.pagosRecientes.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text">{p.suscripcion.perfil.usuario.nombre}</p>
                    <p className="text-xs text-text-light">
                      {new Date(p.fechaPago).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-navy">
                      ${p.monto.toLocaleString("es-AR")}
                    </p>
                    <span className={`text-[10px] font-semibold ${
                      p.estadoPago === "approved" ? "text-success" : "text-warning"
                    }`}>
                      {p.estadoPago}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
