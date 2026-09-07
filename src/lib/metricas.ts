/**
 * metricas.ts - Agregación de métricas de interacción para el dashboard
 * de profesionales (ver InteraccionPerfil en prisma/schema.prisma).
 *
 * Se registra un evento por cada vista de perfil, chat iniciado o click
 * en WhatsApp (ver puntos de registro: src/app/(dashboard)/perfil/[id]/page.tsx,
 * src/app/api/chat/conversaciones/route.ts,
 * src/app/api/perfiles/[id]/interacciones/route.ts).
 *
 * La agregación se hace en JS (no con groupBy + date_trunc de Postgres)
 * para no depender de $queryRaw: el volumen de eventos por profesional
 * es chico, así que no hace falta optimizar con SQL crudo.
 */

import { prisma } from "@/lib/prisma";

const DIAS_POR_DEFECTO = 30;

export type MetricasPerfil = {
  totales: {
    vistas: number;
    chatsIniciados: number;
    clicksWhatsapp: number;
  };
  tasaConversion: {
    // De cada 100 vistas, cuántas terminan en un contacto (chat o WhatsApp).
    aChat: number | null;
    aWhatsapp: number | null;
  };
  serieDiaria: {
    fecha: string; // YYYY-MM-DD
    vistas: number;
    chatsIniciados: number;
    clicksWhatsapp: number;
  }[];
  periodoDias: number;
};

function formatearFecha(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Calcula las métricas de interacción de un perfil profesional para los
 * últimos `dias` días (incluye hoy).
 */
export async function obtenerMetricasPerfil(
  perfilId: string,
  dias: number = DIAS_POR_DEFECTO
): Promise<MetricasPerfil> {
  const ahora = new Date();
  const desde = new Date(ahora);
  desde.setDate(desde.getDate() - (dias - 1));
  desde.setHours(0, 0, 0, 0);

  const [totalVistas, totalChats, totalWhatsapp, eventosPeriodo] = await Promise.all([
    prisma.interaccionPerfil.count({ where: { perfilId, tipo: "VISTA_PERFIL" } }),
    prisma.interaccionPerfil.count({ where: { perfilId, tipo: "CHAT_INICIADO" } }),
    prisma.interaccionPerfil.count({ where: { perfilId, tipo: "CLICK_WHATSAPP" } }),
    prisma.interaccionPerfil.findMany({
      where: { perfilId, createdAt: { gte: desde } },
      select: { tipo: true, createdAt: true },
    }),
  ]);

  // Armar la serie diaria con todos los días del período en 0, así el
  // gráfico no salta días sin datos.
  const porDia = new Map<
    string,
    { vistas: number; chatsIniciados: number; clicksWhatsapp: number }
  >();
  for (let i = 0; i < dias; i++) {
    const d = new Date(desde);
    d.setDate(d.getDate() + i);
    porDia.set(formatearFecha(d), { vistas: 0, chatsIniciados: 0, clicksWhatsapp: 0 });
  }

  for (const evento of eventosPeriodo) {
    const clave = formatearFecha(evento.createdAt);
    const acumulado = porDia.get(clave);
    if (!acumulado) continue; // fuera de rango por huso horario, ignorar
    if (evento.tipo === "VISTA_PERFIL") acumulado.vistas++;
    else if (evento.tipo === "CHAT_INICIADO") acumulado.chatsIniciados++;
    else if (evento.tipo === "CLICK_WHATSAPP") acumulado.clicksWhatsapp++;
  }

  const serieDiaria = Array.from(porDia.entries()).map(([fecha, valores]) => ({
    fecha,
    ...valores,
  }));

  const vistasPeriodo = serieDiaria.reduce((s, d) => s + d.vistas, 0);
  const chatsPeriodo = serieDiaria.reduce((s, d) => s + d.chatsIniciados, 0);
  const whatsappPeriodo = serieDiaria.reduce((s, d) => s + d.clicksWhatsapp, 0);

  return {
    totales: {
      vistas: totalVistas,
      chatsIniciados: totalChats,
      clicksWhatsapp: totalWhatsapp,
    },
    tasaConversion: {
      aChat: vistasPeriodo > 0 ? Math.round((chatsPeriodo / vistasPeriodo) * 1000) / 10 : null,
      aWhatsapp:
        vistasPeriodo > 0 ? Math.round((whatsappPeriodo / vistasPeriodo) * 1000) / 10 : null,
    },
    serieDiaria,
    periodoDias: dias,
  };
}
