/**
 * API Route: PATCH /api/suscripcion/renovacion
 *
 * Activa o desactiva la renovación automática de la suscripción.
 *
 * Desactivarla cancela de verdad la autorización de cobro recurrente
 * (preapproval) en MercadoPago — no es solo un flag local — porque de lo
 * contrario MercadoPago seguiría cobrando aunque acá dijera "desactivada".
 * Activarla no se puede hacer desde acá: MercadoPago no permite reanudar
 * un cobro recurrente ya cancelado sin que el pagador vuelva a autorizarlo,
 * así que hace falta un nuevo checkout desde /planes.
 *
 * Body: { activar: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorInterno } from "@/lib/api-auth";
import { cancelarPreapproval } from "@/lib/mercadopago";

export async function PATCH(request: NextRequest) {
  try {
    const resultado = await requireAuth();
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    const body = await request.json();
    const { activar } = body;
    if (typeof activar !== "boolean") {
      return NextResponse.json({ error: "Se requiere el campo `activar` (boolean)" }, { status: 400 });
    }

    const perfil = await prisma.perfilProfesional.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!perfil) {
      return NextResponse.json({ error: "No tienes un perfil profesional" }, { status: 404 });
    }

    const suscripcion = await prisma.suscripcion.findUnique({
      where: { perfilId: perfil.id },
    });

    if (!suscripcion) {
      return NextResponse.json({ error: "No tienes una suscripción" }, { status: 404 });
    }

    if (suscripcion.plan === "GRATUITO") {
      return NextResponse.json(
        { error: "El plan gratuito no tiene renovación automática" },
        { status: 400 }
      );
    }

    if (activar) {
      // No hay forma de reactivar un cobro recurrente ya cancelado sin que
      // el pagador vuelva a autorizarlo en MercadoPago.
      return NextResponse.json(
        {
          error:
            "Para activar la renovación automática hay que volver a suscribirse desde /planes (MercadoPago pide autorizar el cobro recurrente de nuevo).",
        },
        { status: 400 }
      );
    }

    // Desactivar: cancelar la autorización de cobro recurrente en MercadoPago.
    if (suscripcion.mercadopagoPreapprovalId) {
      try {
        await cancelarPreapproval(suscripcion.mercadopagoPreapprovalId);
      } catch (e) {
        console.error("Error cancelando preapproval en MercadoPago:", e);
        return NextResponse.json(
          { error: "No se pudo cancelar la renovación automática en MercadoPago. Intentá de nuevo." },
          { status: 502 }
        );
      }
    }

    const actualizada = await prisma.suscripcion.update({
      where: { id: suscripcion.id },
      data: { renovacionAuto: false },
    });

    return NextResponse.json({
      mensaje:
        "Renovación automática desactivada. No se harán más cobros automáticos; tu plan sigue activo hasta que venza.",
      renovacionAuto: actualizada.renovacionAuto,
    });
  } catch (err) {
    return errorInterno(err, "actualizando renovación");
  }
}
