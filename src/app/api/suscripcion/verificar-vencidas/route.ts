/**
 * API Route: POST /api/suscripcion/verificar-vencidas
 *
 * Detecta suscripciones vencidas con renovación automática activada
 * y las renueva automáticamente (extiende 1 mes, genera nuevo cobro).
 *
 * Este endpoint puede llamarse: desde un cron job, al iniciar sesión,
 * o manualmente. Es idempotente.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorInterno } from "@/lib/api-auth";

export async function POST(_request: NextRequest) {
  try {
    const resultado = await requireAuth(["ADMIN"]);
    if (!resultado.ok) return resultado.response;

    const ahora = new Date();
    const renovadas = [];

    // Buscar suscripciones ACTIVAS vencidas con renovación automática.
    // Se excluyen las que tienen un preapproval de MercadoPago asociado:
    // esas ya se renuevan solas vía el webhook real (subscription_authorized_payment)
    // y "inventarles" una extensión acá pisaría/duplicaría lo que MercadoPago
    // ya está manejando. Este barrido queda solo para el caso legado sin
    // preapproval (renovacionAuto como flag manual, sin cobro real detrás).
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

    return NextResponse.json({ renovadas: renovadas.length, detalles: renovadas });
  } catch (err) {
    return errorInterno(err, "verificando suscripciones vencidas");
  }
}
