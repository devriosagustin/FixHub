"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Eye,
  Users,
  Star,
  MessageCircle,
  MessageSquare,
  Image as ImageIcon,
  Award,
  BarChart3,
  Send,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface MetricasInteraccion {
  totales: {
    vistas: number;
    chatsIniciados: number;
    clicksWhatsapp: number;
  };
  tasaConversion: {
    aChat: number | null;
    aWhatsapp: number | null;
  };
  serieDiaria: {
    fecha: string;
    vistas: number;
    chatsIniciados: number;
    clicksWhatsapp: number;
  }[];
  periodoDias: number;
}

interface StatsData {
  visitas: number;
  contactos: number;
  totalResenas: number;
  promedioEstrellas: number;
  totalMensajes: number;
  totalConversaciones: number;
  totalFotos: number;
  totalCertificaciones: number;
  suscripcion: { plan: string; fechaFin: string | null } | null;
  interacciones: MetricasInteraccion | null;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Eye;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-navy">{value}</p>
      <p className="text-sm text-text-light">{label}</p>
    </div>
  );
}

function formatearFechaCorta(fecha: string): string {
  // fecha viene como "YYYY-MM-DD"
  const [, mes, dia] = fecha.split("-");
  return `${dia}/${mes}`;
}

// Gráfico de barras simple, una métrica por gráfico (un solo color, sin
// necesidad de leyenda) -- evita mezclar en un mismo gráfico series de
// magnitudes muy distintas (vistas vs. chats/whatsapp) en un eje
// compartido, que las aplastaría.
function MiniBarChart({
  datos,
  color,
}: {
  datos: { fecha: string; valor: number }[];
  color: string;
}) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <div className="flex h-16 items-end gap-[3px]">
      {datos.map((d) => (
        <div
          key={d.fecha}
          title={`${formatearFechaCorta(d.fecha)}: ${d.valor}`}
          className={`min-w-[3px] flex-1 rounded-t ${color}`}
          style={{ height: `${Math.max(6, (d.valor / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export default function EstadisticasPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [perfilId, setPerfilId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    const cargar = async () => {
      try {
        // Obtener el ID del perfil del propio usuario
        const perfilRes = await fetch("/api/profesionales/mi-perfil");
        if (!perfilRes.ok) {
          setCargando(false);
          return;
        }
        const perfil = await perfilRes.json();
        setPerfilId(perfil.id);

        const res = await fetch(`/api/profesionales/${perfil.id}/estadisticas?dias=14`);
        if (res.ok) {
          setStats(await res.json());
        }
      } catch {
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [status]);

  if (status === "loading" || cargando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange border-t-transparent" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-text-light">No se pudieron cargar las estadísticas.</p>
        <Link href="/profesional/perfil" className="mt-4 inline-block text-orange hover:underline">
          Volver a mi perfil
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-navy">
            <BarChart3 className="h-6 w-6 text-orange" />
            Estadísticas e interacción de mi perfil
          </h1>
          <p className="mt-1 text-sm text-text-light">
            Rendimiento de tu perfil profesional en fixhub
          </p>
        </div>
        {stats.suscripcion && (
          <div className="rounded-lg bg-navy/5 px-3 py-1.5 text-sm">
            <span className="font-medium text-navy">{stats.suscripcion.plan}</span>
          </div>
        )}
      </div>

      {/* Grid de estadísticas */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Eye} label="Visitas" value={stats.visitas} color="bg-navy" />
        <StatCard icon={Users} label="Contactos" value={stats.contactos} color="bg-orange" />
        <StatCard icon={Send} label="Clicks WhatsApp" value={stats.interacciones?.totales.clicksWhatsapp ?? 0} color="bg-orange-light" />
        <StatCard icon={MessageCircle} label="Mensajes" value={stats.totalMensajes} color="bg-success" />
        <StatCard icon={MessageSquare} label="Conversaciones" value={stats.totalConversaciones} color="bg-navy-light" />
        <StatCard icon={ImageIcon} label="Fotos" value={stats.totalFotos} color="bg-navy-dark" />
        <StatCard icon={Award} label="Certificaciones" value={stats.totalCertificaciones} color="bg-warning" />
        <StatCard
          icon={TrendingUp}
          label="Vistas → contacto"
          value={
            stats.interacciones &&
            (stats.interacciones.tasaConversion.aChat !== null ||
              stats.interacciones.tasaConversion.aWhatsapp !== null)
              ? `${(
                  (stats.interacciones.tasaConversion.aChat ?? 0) +
                  (stats.interacciones.tasaConversion.aWhatsapp ?? 0)
                ).toFixed(1)}%`
              : "—"
          }
          color="bg-orange-dark"
        />
      </div>

      {/* Interacción diaria (últimos 14 días) */}
      {stats.interacciones && stats.interacciones.serieDiaria.length > 0 && (
        <div className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-light">
              Vistas (últimos {stats.interacciones.periodoDias} días)
            </p>
            <MiniBarChart
              datos={stats.interacciones.serieDiaria.map((d) => ({ fecha: d.fecha, valor: d.vistas }))}
              color="bg-navy"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-light">
              Chats iniciados (últimos {stats.interacciones.periodoDias} días)
            </p>
            <MiniBarChart
              datos={stats.interacciones.serieDiaria.map((d) => ({ fecha: d.fecha, valor: d.chatsIniciados }))}
              color="bg-orange"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-light">
              Clicks WhatsApp (últimos {stats.interacciones.periodoDias} días)
            </p>
            <MiniBarChart
              datos={stats.interacciones.serieDiaria.map((d) => ({ fecha: d.fecha, valor: d.clicksWhatsapp }))}
              color="bg-orange-light"
            />
          </div>
        </div>
      )}

      {/* Reseñas destacadas */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-navy">Reseñas</h2>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-navy">{stats.promedioEstrellas || "—"}</p>
            <p className="mt-1 text-sm text-text-light">Promedio</p>
          </div>
          <div className="h-12 w-px bg-border" />
          <div className="text-center">
            <p className="text-4xl font-bold text-navy">{stats.totalResenas}</p>
            <p className="mt-1 text-sm text-text-light">Total reseñas</p>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/profesional/perfil"
          className="text-sm text-orange hover:underline"
        >
          ← Volver a editar mi perfil
        </Link>
      </div>
    </div>
  );
}
