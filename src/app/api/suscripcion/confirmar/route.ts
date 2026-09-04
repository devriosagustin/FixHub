/**
 * API Route: POST /api/suscripcion/confirmar
 *
 * Confirma la suscripción al volver del checkout de MercadoPago.
 *
 * En entorno local, MercadoPago no puede alcanzar `localhost` para enviar
 * el webhook, así que esta ruta consulta el estado REAL al momento del
 * retorno y activa la suscripción si corresponde. Comparte la lógica con
 * el webhook.
 *
 * Si la suscripción ya tiene un preapproval (suscripción recurrente)
 * asociado, se consulta y procesa ese preapproval (procesarCambioPreapproval).
 * Si no (checkout de compatibilidad / legado con pago único), se cae al
 * flujo anterior basado en Payment/procesarPago.
 *
 * Body: { suscripcionId: string, paymentId?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MercadoPagoConfig, Payment } from "mercadopago";
import {
  obtenerPago,
  procesarPago,
  obtenerPreapproval,
  procesarCambioPreapproval,
} from "@/lib/mercadopago";
import { requireAuth, errorInterno } from "@/lib/api-auth";

/** Busca pagos de una suscripción por su external_reference (checkout legado). */
async function obtenerPagosPorReferencia(externalReference: string) {
  const paymentClient = new Payment(
    new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
    })
  );
  try {
    const result = await paymentClient.search({
      options: {
        external_reference: externalReference,
        sort: "date_approved",
        criteria: "desc",
      },
    });
    return result.results || [];
  } catch (e) {
    console.error("Error buscando pagos por referencia:", e);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const resultado = await requireAuth();
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    const body = await request.json();
    const { suscripcionId, paymentId } = body;

    if (!suscripcionId) {
      return NextResponse.json({ error: "Se requiere suscripcionId" }, { status: 400 });
    }

    // Verificar que la suscripción pertenezca al profesional autenticado
    const suscripcion = await prisma.suscripcion.findUnique({
      where: { id: suscripcionId },
      select: { perfilId: true, mercadopagoPreapprovalId: true },
    });

    if (!suscripcion) {
      return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 });
    }

    const perfil = await prisma.perfilProfesional.findUnique({
      where: { id: suscripcion.perfilId },
      select: { userId: true },
    });

    if (!perfil || perfil.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    let estado = "no_encontrado";

    if (suscripcion.mercadopagoPreapprovalId) {
      // Suscripción recurrente: consultar el preapproval real en MercadoPago.
      const preapproval = await obtenerPreapproval(suscripcion.mercadopagoPreapprovalId);
      estado = preapproval.status || "unknown";
      await procesarCambioPreapproval({
        id: preapproval.id,
        external_reference: preapproval.external_reference,
        status: preapproval.status,
      });
    } else {
      // Checkout legado de pago único: buscar el pago en MP por external_reference.
      let paymentIdReal = paymentId;
      if (!paymentIdReal) {
        const pagosMp = await obtenerPagosPorReferencia(suscripcionId);
        paymentIdReal = pagosMp?.[0]?.id ? String(pagosMp[0].id) : null;
      }

      if (paymentIdReal) {
        const payment = await obtenerPago(paymentIdReal);
        estado = payment.status || "unknown";
        await procesarPago({
          id: String(payment.id),
          external_reference: payment.external_reference,
          transaction_amount: payment.transaction_amount,
          currency_id: payment.currency_id,
          payment_method_id: payment.payment_method_id,
          status: payment.status,
          date_approved: payment.date_approved,
        });
      }
    }

    // Devolver el estado final de la suscripción
    const suscripcionFinal = await prisma.suscripcion.findUnique({
      where: { id: suscripcionId },
    });

    return NextResponse.json({
      estado,
      suscripcion: suscripcionFinal,
    });
  } catch (err) {
    return errorInterno(err, "confirmando suscripción");
  }
}
