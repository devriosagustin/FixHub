/**
 * mercadopago.ts - Lógica compartida de MercadoPago
 *
 * Centraliza el procesamiento de un pago de MercadoPago para activar/
 * actualizar la suscripción, de modo que tanto el webhook como la
 * confirmación tras el retorno del checkout usen la misma lógica.
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getPlanById, type PlanId } from "@/lib/plans";
import { MercadoPagoConfig, Payment } from "mercadopago";

export const mpClient = () =>
  new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  });

/** ¿Las credenciales configuradas son de prueba (TEST) o producción (APP_USR)? */
export function esMercadoPagoTest(): boolean {
  return (process.env.MERCADOPAGO_ACCESS_TOKEN || "").startsWith("TEST-");
}

/**
 * Valida la firma `x-signature` de una notificación de webhook de
 * MercadoPago (HMAC-SHA256 sobre un manifest con el id del pago, el
 * x-request-id y el timestamp, usando el secreto de "Tus integraciones").
 *
 * Referencia: https://www.mercadopago.com.ar/developers/es/docs/checkout-api/additional-content/notifications/webhooks
 *
 * Si `MERCADOPAGO_WEBHOOK_SECRET` no está configurado (todavía no se generó
 * el secreto en el panel de MercadoPago), no hay forma de validar la firma:
 * se deja pasar la notificación con un warning en el log, para no cortar el
 * procesamiento de pagos en instalaciones que aún no lo configuraron. Una
 * vez seteado el secreto, la validación pasa a ser estricta.
 */
export function validarFirmaWebhook(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataIdQuery: string | null;
}): { ok: boolean; motivo?: string } {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (!secret) {
    console.warn(
      "[MercadoPago] MERCADOPAGO_WEBHOOK_SECRET no configurado: no se valida la firma del webhook. " +
        'Configurar en "Tus integraciones" > Webhooks para activar la validación.'
    );
    return { ok: true };
  }

  const { xSignature, xRequestId, dataIdQuery } = params;

  if (!xSignature || !xRequestId || !dataIdQuery) {
    return {
      ok: false,
      motivo: "Faltan x-signature, x-request-id o el query param data.id",
    };
  }

  // x-signature llega como "ts=1704908010,v1=618c8534524..."
  const partes: Record<string, string> = {};
  for (const par of xSignature.split(",")) {
    const [clave, valor] = par.split("=");
    if (clave && valor) partes[clave.trim()] = valor.trim();
  }

  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) {
    return { ok: false, motivo: "x-signature con formato inesperado" };
  }

  const manifest = `id:${dataIdQuery.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const hashCalculado = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  const bufCalculado = Buffer.from(hashCalculado, "utf8");
  const bufRecibido = Buffer.from(v1, "utf8");

  const coincide =
    bufCalculado.length === bufRecibido.length &&
    crypto.timingSafeEqual(bufCalculado, bufRecibido);

  return coincide ? { ok: true } : { ok: false, motivo: "La firma no coincide" };
}

/**
 * Consulta un pago en MercadoPago por ID.
 */
export async function obtenerPago(paymentId: string) {
  const paymentClient = new Payment(mpClient());
  return await paymentClient.get({ id: paymentId as unknown as number });
}

/**
 * Procesa el estado de un pago de MercadoPago y actualiza la suscripción
 * asociada (vía `external_reference` = id de la suscripción).
 *
 * Retorna true si pudo procesar (suscripción encontrada y actualizada),
 * false si no hay suscripción asociada.
 */
export async function procesarPago(payment: {
  id: string | number;
  external_reference?: string | null;
  transaction_amount?: number | null;
  currency_id?: string | null;
  payment_method_id?: string | null;
  status?: string | null;
  date_approved?: string | null;
}): Promise<{ ok: boolean; suscripcionId?: string }> {
  const suscripcionId = payment.external_reference;
  if (!suscripcionId) {
    console.log("[MercadoPago] external_reference no encontrado");
    return { ok: false };
  }

  const suscripcion = await prisma.suscripcion.findUnique({
    where: { id: suscripcionId },
  });

  if (!suscripcion) {
    console.log("[MercadoPago] Suscripción no encontrada:", suscripcionId);
    return { ok: false };
  }

  // Registrar el pago (evitar duplicados por id del pago de MP)
  const pagoExistente = await prisma.pago.findFirst({
    where: { mercadopagoPagoId: String(payment.id) },
  });

  if (!pagoExistente) {
    await prisma.pago.create({
      data: {
        suscripcionId: suscripcion.id,
        monto: payment.transaction_amount || suscripcion.precioMensual || 0,
        moneda: payment.currency_id || "ARS",
        metodoPago: payment.payment_method_id || null,
        estadoPago: payment.status || "unknown",
        mercadopagoPagoId: String(payment.id),
        fechaPago: payment.date_approved
          ? new Date(payment.date_approved)
          : new Date(),
      },
    });
  }

  // Aplicar el estado correspondiente
  switch (payment.status) {
    case "approved":
      console.log("[MercadoPago] Pago aprobado, activando suscripción");
      const fechaFin = new Date();
      fechaFin.setMonth(fechaFin.getMonth() + 1);

      await prisma.suscripcion.update({
        where: { id: suscripcion.id },
        data: {
          estado: "ACTIVA",
          fechaInicio: new Date(),
          fechaFin,
          mercadopagoId: String(payment.id),
        },
      });

      // Marcar destacado/fijado según el plan
      const planInfo = getPlanById(suscripcion.plan as PlanId);
      await prisma.perfilProfesional.update({
        where: { id: suscripcion.perfilId },
        data: {
          destacado: planInfo.limites.destacado,
          fijado: planInfo.limites.fijado,
        },
      });
      break;

    case "pending":
      console.log("[MercadoPago] Pago pendiente");
      await prisma.suscripcion.update({
        where: { id: suscripcion.id },
        data: { estado: "PENDIENTE_PAGO" },
      });
      break;

    case "rejected":
    case "cancelled":
      console.log("[MercadoPago] Pago rechazado/cancelado:", payment.status);
      await prisma.suscripcion.update({
        where: { id: suscripcion.id },
        data: { estado: "PENDIENTE_PAGO" },
      });
      break;

    case "refunded":
      console.log("[MercadoPago] Pago reembolsado");
      await prisma.suscripcion.update({
        where: { id: suscripcion.id },
        data: { estado: "CANCELADA" },
      });
      await prisma.perfilProfesional.update({
        where: { id: suscripcion.perfilId },
        data: { destacado: false, fijado: false },
      });
      break;

    default:
      console.log("[MercadoPago] Estado no manejado:", payment.status);
  }

  return { ok: true, suscripcionId: suscripcion.id };
}
