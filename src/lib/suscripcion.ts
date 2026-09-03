/**
 * suscripcion.ts - Helpers para verificar el estado de suscripción de un
 * profesional, usados para el gating de features (p.ej. ver y postularse
 * a trabajos publicados por clientes).
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
