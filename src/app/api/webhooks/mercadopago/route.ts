/**
 * API Route: POST /api/webhooks/mercadopago
 *
 * Recibe notificaciones de MercadoPago sobre pagos y suscripciones.
 *
 * MercadoPago envía estos tipos de notificación:
 * - payment: pago único (checkout de compatibilidad / legado)
 * - subscription_preapproval: alta/autorización/pausa/cancelación de una
 *   suscripción recurrente (preapproval)
 * - subscription_authorized_payment: un cobro recurrente de una
 *   suscripción ya autorizada
 * - merchant_order: no se procesa
 *
 * La lógica de actualización de la suscripción está centralizada en
 * src/lib/mercadopago.ts (procesarPago / procesarCambioPreapproval /
 * procesarPagoRecurrente), compartida con la ruta de confirmación tras
 * el retorno del checkout.
 *
 * Referencia: https://mercadopago.github.io/checkout-api/docs/receiving-notifications
 */

import { NextRequest, NextResponse } from "next/server";
import {
  obtenerPago,
  procesarPago,
  obtenerPreapproval,
  procesarCambioPreapproval,
  obtenerInvoice,
  procesarPagoRecurrente,
  validarFirmaWebhook,
} from "@/lib/mercadopago";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("[Webhook MercadoPago] Notificación recibida:", body.type);

    // MercadoPago envía el tipo de notificación y el id del recurso
    const { type, data } = body;

    if (type !== "payment" && type !== "subscription_preapproval" && type !== "subscription_authorized_payment") {
      console.log("[Webhook MercadoPago] Tipo no procesado:", type);
      return NextResponse.json({ received: true });
    }

    const resourceId = data?.id;
    if (!resourceId) {
      console.log("[Webhook MercadoPago] ID de recurso no encontrado");
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

    if (type === "payment") {
      // Consultar el estado del pago en MercadoPago
      const payment = await obtenerPago(String(resourceId));

      console.log("[Webhook MercadoPago] Pago consultado:", {
        id: payment.id,
        status: payment.status,
        external_reference: payment.external_reference,
      });

      await procesarPago({
        id: String(payment.id),
        external_reference: payment.external_reference,
        transaction_amount: payment.transaction_amount,
        currency_id: payment.currency_id,
        payment_method_id: payment.payment_method_id,
        status: payment.status,
        date_approved: payment.date_approved,
      });
    } else if (type === "subscription_preapproval") {
      const preapproval = await obtenerPreapproval(String(resourceId));

      console.log("[Webhook MercadoPago] Preapproval consultado:", {
        id: preapproval.id,
        status: preapproval.status,
        external_reference: preapproval.external_reference,
      });

      await procesarCambioPreapproval({
        id: preapproval.id,
        external_reference: preapproval.external_reference,
        status: preapproval.status,
      });
    } else if (type === "subscription_authorized_payment") {
      const invoice = await obtenerInvoice(String(resourceId));

      console.log("[Webhook MercadoPago] Cobro recurrente consultado:", {
        id: invoice.id,
        preapproval_id: invoice.preapproval_id,
        external_reference: invoice.external_reference,
        payment_status: invoice.payment?.status,
      });

      await procesarPagoRecurrente({
        id: invoice.id,
        external_reference: invoice.external_reference,
        preapproval_id: invoice.preapproval_id,
        transaction_amount: invoice.transaction_amount,
        currency_id: invoice.currency_id,
        date_created: invoice.date_created,
        payment: invoice.payment,
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Webhook MercadoPago] Error:", err);
    // Siempre retornar 200 para que MercadoPago no reintente
    return NextResponse.json({ received: true });
  }
}
