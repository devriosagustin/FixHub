/**
 * suscripcion.ts - Helpers para verificar el estado de suscripción de un
 * profesional, usados para el gating de features (p.ej. ver y postularse
 * a trabajos publicados por clientes). También expone la lógica de
 * renovación automática de suscripciones vencidas (ver
 * renovarSuscripcionesVencidas), compartida entre la ruta HTTP
 * /api/suscripcion/verificar-vencidas (disparo manual/admin) y el
 * scheduler in-process de server.ts (disparo automático periódico).
 */

import { prisma } from "@/lib/prisma";
import type { PlanId } from "@/lib/plans";

/**
 * Obtiene la suscripción activa del perfil profesional del usuario.
 * Retorna null si no hay perfil o si la suscripción no está ACTIVA.
 * Los planes gratuitos (GRATUITO) cuentan como activos pero no habilitan
 * las features premium.
 */
export async function obtenerSuscripcionActivaDeUsuario(
  userId: string
): Promise<{ plan: PlanId; esPaga: boolean } | null> {
  const perfil = await prisma.perfilProfesional.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!perfil) return null;

  const suscripcion = await prisma.suscripcion.findUnique({
    where: { perfilId: perfil.id },
  });

  if (!suscripcion || suscripcion.estado !== "ACTIVA") return null;

  // Si venció (fechaFin pasada), no cuenta como activa
  if (
    suscripcion.fechaFin &&
    new Date(suscripcion.fechaFin) < new Date()
  ) {
    return null;
  }

  const plan = suscripcion.plan as PlanId;
  return { plan, esPaga: plan !== "GRATUITO" };
}

/**
 * Verifica si el profesional del usuario tiene una suscripción PAGA activa
 * (PROFESIONAL o PREMIUM con estado ACTIVA y no vencida). Es el requisito
 * para acceder a los trabajos publicados por clientes.
 */
export async function tieneSuscripcionPagaActiva(userId: string): Promise<boolean> {
  const suscripcion = await obtenerSuscripcionActivaDeUsuario(userId);
  return suscripcion?.esPaga === true;
}

/**
 * Mismo criterio que tieneSuscripcionPagaActiva, pero como fragmento de
 * `where` de Prisma en vez de chequeo fila por fila -- para usar en
 * findMany de listados públicos de profesionales (búsqueda,
 * GET /api/profesionales), donde el filtro tiene que entrar en la query
 * misma (con paginación a nivel DB, filtrar después en JS rompería el
 * total/paginado).
 *
 * Uso: where: { estado: "APROBADO", ...filtroSuscripcionPagaActiva() }
 *
 * Cubre tanto "no tiene ninguna fila de Suscripcion" (perfil.suscripcion
 * es opcional) como "tiene la fila pero está en GRATUITO, vencida,
 * cancelada, o con fechaFin ya pasada" -- en ambos casos, no matchea.
 */
export function filtroSuscripcionPagaActiva() {
  return {
    suscripcion: {
      is: {
        plan: { in: ["PROFESIONAL", "PREMIUM"] as PlanId[] },
        estado: "ACTIVA" as const,
        OR: [{ fechaFin: null }, { fechaFin: { gt: new Date() } }],
      },
    },
  };
}


/**
 * Renueva automáticamente las suscripciones ACTIVAS vencidas que tienen
 * renovación automática activada. Es idempotente (una suscripción ya
 * renovada, con fechaFin futura, deja de matchear el where y no se toca
 * de nuevo).
 *
 * Se excluyen las suscripciones con un preapproval de MercadoPago asociado:
 * esas ya se renuevan solas vía el webhook real
 * (subscription_authorized_payment) y "inventarles" una extensión acá
 * pisaría/duplicaría lo que MercadoPago ya está manejando. Esta función
 * queda solo para el caso legado sin preapproval (renovacionAuto como
 * flag manual, sin cobro real detrás).
 *
 * La llaman tanto la ruta HTTP /api/suscripcion/verificar-vencidas (bajo
 * requireAuth(["ADMIN"])) como el scheduler in-process de server.ts
 * (que corre en el mismo proceso Node, sin pasar por HTTP/auth).
 */
export async function renovarSuscripcionesVencidas() {
  const ahora = new Date();
  const renovadas: { suscripcionId: string; nuevaFechaFin: Date }[] = [];

  const suscripciones = await prisma.suscripcion.findMany({
    where: {
      estado: "ACTIVA",
      renovacionAuto: true,
      fechaFin: { lt: ahora },
      plan: { not: "GRATUITO" },
      mercadopagoPreapprovalId: null,
    },
    include: { perfil: true },
  });

  for (const suscripcion of suscripciones) {
    const nuevaFechaFin = new Date();
    nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 1);

    // Renovar: extender el período
    await prisma.suscripcion.update({
      where: { id: suscripcion.id },
      data: {
        fechaFin: nuevaFechaFin,
        fechaInicio: ahora,
      },
    });

    // Registrar el pago como pendiente (el profesional deberá pagarlo)
    await prisma.pago.create({
      data: {
        suscripcionId: suscripcion.id,
        monto: suscripcion.precioMensual || 0,
        moneda: "ARS",
        estadoPago: "pendiente",
        fechaPago: ahora,
      },
    });

    // Notificar al profesional
    await prisma.notificacion.create({
      data: {
        usuarioId: suscripcion.perfil.userId,
        tipo: "SUSCRIPCION_VENCE",
        titulo: "Tu suscripción se renovó",
        mensaje: `Tu plan ${suscripcion.plan} se renovó automáticamente hasta el ${nuevaFechaFin.toLocaleDateString(
          "es-AR"
        )}.`,
        enlace: "/planes",
      },
    });

    renovadas.push({
      suscripcionId: suscripcion.id,
      nuevaFechaFin,
    });
  }

  return renovadas;
}
