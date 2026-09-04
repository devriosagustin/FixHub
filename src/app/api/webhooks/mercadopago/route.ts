/**
 * API Route: POST /api/webhooks/mercadopago
 *
 * Recibe notificaciones de MercadoPago sobre cambios en pagos.
 *
 * MercadoPago envía estos tipos de notificación:
 * - payment: Cuando se crea o actualiza un pago
 * - merchant_order: Cuando se crea una orden
 *
 * La lógica de actualización de la suscripción está centralizada en
 * src/lib/mercadopago.ts (procesarPago), compartida con la ruta de
 * confirmación tras el retorno del checkout.
 *
 * Referencia: https://mercadopago.github.io/checkout-api/docs/receiving-notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { obtenerPago, procesarPago, validarFirmaWebhook } from "@/lib/mercadopago";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("[Webhook MercadoPago] Notificación recibida:", body.type);

    // MercadoPago envía el tipo de notificación y el id del recurso
    const { type, data } = body;

    // Procesar solo notificaciones de pago
    if (type !== "payment") {
      console.log("[Webhook MercadoPago] Tipo no procesado:", type);
      return NextResponse.json({ received: true });
    }

    const paymentId = data?.id;
    if (!paymentId) {
      console.log("[Webhook MercadoPago] ID de pago no encontrado");
      return NextResponse.json({ received: true });
    }

    // Validar la firma antes de confiar en la notificación y consultar MercadoPago
    const validacion = validarFirmaWebhook({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataIdQuery: request.nextUrl.searchParams.get("data.id"),
    });

    if (!validacion.ok) {
      console.warn(
        "[Webhook MercadoPago] Firma inválida, notificación rechazada:",
        validacion.motivo
      );
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }

    // Consultar el estado del pago en MercadoPago
    const payment = await obtenerPago(String(paymentId));

    console.log("[Webhook MercadoPago] Pago consultado:", {
      id: payment.id,
      status: payment.status,
      external_reference: payment.external_reference,
    });

    // Procesar y actualizar la suscripción
    await procesarPago({
      id: String(payment.id),
      external_reference: payment.external_reference,
      transaction_amount: payment.transaction_amount,
      currency_id: payment.currency_id,
      payment_method_id: payment.payment_method_id,
      status: payment.status,
      date_approved: payment.date_approved,
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Webhook MercadoPago] Error:", err);
    // Siempre retornar 200 para que MercadoPago no reintente
    return NextResponse.json({ received: true });
  }
}
