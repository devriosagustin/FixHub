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
import { MercadoPagoConfig, Payment, PreApproval, Invoice } from "mercadopago";

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
 * Consulta una suscripción recurrente (preapproval) en MercadoPago por ID.
 */
export async function obtenerPreapproval(preapprovalId: string) {
  return await new PreApproval(mpClient()).get({ id: preapprovalId });
}

/**
 * Consulta un cobro recurrente (authorized payment / invoice) por ID.
 */
export async function obtenerInvoice(invoiceId: string) {
  return await new Invoice(mpClient()).get({ id: invoiceId });
}

/**
 * Cancela una suscripción recurrente (preapproval) en MercadoPago.
 * No hay forma de "pausar y reanudar" de forma confiable sin que el
 * usuario vuelva a autorizar el cobro, así que desactivar la renovación
 * automática cancela la autorización: para reactivarla hace falta un
 * nuevo checkout.
 */
export async function cancelarPreapproval(preapprovalId: string) {
  return await new PreApproval(mpClient()).update({
    id: preapprovalId,
    body: { status: "cancelled" },
  });
}

/**
 * Procesa una notificación de cambio de estado de una suscripción
 * recurrente (preapproval) de MercadoPago: creación, autorización,
 * pausa o cancelación. Se usa tanto desde el webhook como desde
 * /api/suscripcion/confirmar (retorno del checkout).
 *
 * A diferencia de un pago único, acá "activar" la suscripción significa
 * que el pagador autorizó el cobro recurrente (el primer cobro real
 * ocurre recién ~1 hora después, vía subscription_authorized_payment).
 */
export async function procesarCambioPreapproval(preapproval: {
  id?: string;
  external_reference?: string;
  status?: string;
}): Promise<{ ok: boolean; suscripcionId?: string }> {
  const suscripcionId = preapproval.external_reference;
  if (!suscripcionId) {
    console.log("[MercadoPago] preapproval sin external_reference");
    return { ok: false };
  }

  const suscripcion = await prisma.suscripcion.findUnique({
    where: { id: suscripcionId },
  });

  if (!suscripcion) {
    console.log("[MercadoPago] Suscripción no encontrada (preapproval):", suscripcionId);
    return { ok: false };
  }

  const datosBase = preapproval.id
    ? { mercadopagoPreapprovalId: preapproval.id }
    : {};

  switch (preapproval.status) {
    case "authorized": {
      console.log("[MercadoPago] Preapproval autorizado, activando suscripción");
      const fechaFin = new Date();
      fechaFin.setMonth(fechaFin.getMonth() + 1);

      await prisma.suscripcion.update({
        where: { id: suscripcion.id },
        data: {
          ...datosBase,
          estado: "ACTIVA",
          renovacionAuto: true,
          fechaInicio: new Date(),
          fechaFin,
        },
      });

      const planInfo = getPlanById(suscripcion.plan as PlanId);
      await prisma.perfilProfesional.update({
        where: { id: suscripcion.perfilId },
        data: {
          destacado: planInfo.limites.destacado,
          fijado: planInfo.limites.fijado,
        },
      });
      break;
    }

    case "paused":
      console.log("[MercadoPago] Preapproval pausado");
      await prisma.suscripcion.update({
        where: { id: suscripcion.id },
        data: { ...datosBase, renovacionAuto: false },
      });
      break;

    case "cancelled":
      console.log("[MercadoPago] Preapproval cancelado");
      await prisma.suscripcion.update({
        where: { id: suscripcion.id },
        data: { ...datosBase, renovacionAuto: false },
      });
      break;

    case "pending":
      // Todavía no completó la autorización; no hay nada que activar.
      if (preapproval.id) {
        await prisma.suscripcion.update({
          where: { id: suscripcion.id },
          data: datosBase,
        });
      }
      break;

    default:
      console.log("[MercadoPago] Estado de preapproval no manejado:", preapproval.status);
  }

  return { ok: true, suscripcionId: suscripcion.id };
}

/**
 * Procesa un cobro recurrente (authorized payment / invoice) generado por
 * una suscripción de MercadoPago: si el cobro fue aprobado, extiende la
 * suscripción un mes más y registra el pago (evitando duplicados).
 */
export async function procesarPagoRecurrente(invoice: {
  id?: string;
  external_reference?: string;
  preapproval_id?: string;
  transaction_amount?: number | null;
  currency_id?: string | null;
  date_created?: string | null;
  payment?: { id?: string | number; status?: string } | null;
}): Promise<{ ok: boolean; suscripcionId?: string }> {
  const incluirPerfil = { perfil: { select: { userId: true } } } as const;

  let suscripcion = invoice.external_reference
    ? await prisma.suscripcion.findUnique({
        where: { id: invoice.external_reference },
        include: incluirPerfil,
      })
    : null;

  if (!suscripcion && invoice.preapproval_id) {
    suscripcion = await prisma.suscripcion.findFirst({
      where: { mercadopagoPreapprovalId: invoice.preapproval_id },
      include: incluirPerfil,
    });
  }

  if (!suscripcion) {
    console.log(
      "[MercadoPago] Suscripción no encontrada para el cobro recurrente:",
      invoice.external_reference || invoice.preapproval_id
    );
    return { ok: false };
  }

  const pagoId = String(invoice.payment?.id ?? invoice.id ?? "");
  const estadoPago = invoice.payment?.status || "unknown";

  if (pagoId) {
    const pagoExistente = await prisma.pago.findFirst({
      where: { mercadopagoPagoId: pagoId },
    });

    if (!pagoExistente) {
      await prisma.pago.create({
        data: {
          suscripcionId: suscripcion.id,
          monto: invoice.transaction_amount || suscripcion.precioMensual || 0,
          moneda: invoice.currency_id || "ARS",
          estadoPago,
          mercadopagoPagoId: pagoId,
          fechaPago: invoice.date_created ? new Date(invoice.date_created) : new Date(),
        },
      });
    }
  }

  if (estadoPago === "approved") {
    console.log("[MercadoPago] Cobro recurrente aprobado, renovando suscripción");
    const nuevaFechaFin = new Date();
    nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 1);

    await prisma.suscripcion.update({
      where: { id: suscripcion.id },
      data: {
        estado: "ACTIVA",
        fechaInicio: new Date(),
        fechaFin: nuevaFechaFin,
      },
    });

    const planInfo = getPlanById(suscripcion.plan as PlanId);
    await prisma.perfilProfesional.update({
      where: { id: suscripcion.perfilId },
      data: {
        destacado: planInfo.limites.destacado,
        fijado: planInfo.limites.fijado,
      },
    });

    await prisma.notificacion.create({
      data: {
        usuarioId: suscripcion.perfil.userId,
        tipo: "SUSCRIPCION_VENCE",
        titulo: "Tu suscripción se renovó",
        mensaje: `Tu plan ${suscripcion.plan} se renovó automáticamente hasta el ${nuevaFechaFin.toLocaleDateString("es-AR")}.`,
        enlace: "/planes",
      },
    });
  } else {
    console.log("[MercadoPago] Cobro recurrente no aprobado, estado:", estadoPago);
  }

  return { ok: true, suscripcionId: suscripcion.id };
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
