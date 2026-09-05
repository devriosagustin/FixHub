/**
 * API Route: POST /api/suscripcion/checkout
 *
 * Crea una suscripción recurrente (preapproval) en MercadoPago y retorna
 * la URL de checkout para que el usuario autorice el cobro automático.
 *
 * Flujo:
 * 1. Profesional elige un plan de pago
 * 2. Se crea una suscripción PENDIENTE_PAGO en nuestra BD
 * 3. Se crea un preapproval (suscripción recurrente) en MercadoPago
 * 4. Se retorna la URL de checkout (init_point) para autorizar el cobro
 * 5. El usuario autoriza el cobro recurrente en MercadoPago
 * 6. MercadoPago redirige de vuelta a /suscripcion/exito
 * 7. MercadoPago envía webhooks (subscription_preapproval al autorizar,
 *    subscription_authorized_payment en cada cobro mensual) a
 *    /api/webhooks/mercadopago
 *
 * Body: { plan: "PROFESIONAL" | "PREMIUM" }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { getPlanById, type PlanId } from "@/lib/plans";
import { mpClient, esMercadoPagoTest } from "@/lib/mercadopago";
import { PreApproval } from "mercadopago";

export async function POST(request: NextRequest) {
  try {
    const resultado = await requireAuth(
      ["PROFESIONAL", "ADMIN"],
      "Solo los profesionales pueden suscribirse"
    );
    if (!resultado.ok) return resultado.response;
    const { session } = resultado;

    const userId = session.user.id;
    const body = await request.json();
    const { plan } = body;

    // Validar que sea un plan de pago
    if (!plan || !["PROFESIONAL", "PREMIUM"].includes(plan)) {
      return NextResponse.json(
        { error: "Plan no válido para checkout" },
        { status: 400 }
      );
    }

    const planInfo = getPlanById(plan as PlanId);
    if (!planInfo.precio) {
      return NextResponse.json(
        { error: "El plan gratuito no requiere checkout" },
        { status: 400 }
      );
    }

    // Buscar el perfil profesional
    const perfil = await prisma.perfilProfesional.findUnique({
      where: { userId },
      select: { id: true, estado: true },
    });

    if (!perfil || perfil.estado !== "APROBADO") {
      return NextResponse.json(
        { error: "Perfil profesional no encontrado o no aprobado" },
        { status: 404 }
      );
    }

    // Crear o actualizar suscripción como PENDIENTE_PAGO
    let suscripcion = await prisma.suscripcion.findUnique({
      where: { perfilId: perfil.id },
    });

    if (suscripcion) {
      suscripcion = await prisma.suscripcion.update({
        where: { id: suscripcion.id },
        data: {
          plan: plan as any,
          estado: "PENDIENTE_PAGO",
          precioMensual: planInfo.precio,
        },
      });
    } else {
      suscripcion = await prisma.suscripcion.create({
        data: {
          perfilId: perfil.id,
          plan: plan as any,
          estado: "PENDIENTE_PAGO",
          precioMensual: planInfo.precio,
        },
      });
    }

    // Crear la suscripción recurrente (preapproval) en MercadoPago
    const preapproval = new PreApproval(mpClient());

    // A diferencia de Preference (pago único), en la API de Preapproval
    // (suscripciones) el campo back_url es OBLIGATORIO: si se omite,
    // MercadoPago responde "back_url is required" y el checkout falla.
    // Por eso, a diferencia del checkout de pago único, acá SIEMPRE lo
    // mandamos. En local, NEXT_PUBLIC_APP_URL debe apuntar a una URL
    // https válida (por ejemplo un túnel de Cloudflare) para poder
    // probar el flujo end-to-end; con "http://localhost" el alta del
    // preapproval en MercadoPago puede rechazarlo igual.
    const backUrl = `${process.env.NEXT_PUBLIC_APP_URL}/suscripcion/exito?suscripcionId=${suscripcion.id}`;

    const result = await preapproval.create({
      body: {
        reason: `Suscripción fixhub - Plan ${planInfo.nombre}`,
        external_reference: suscripcion.id,
        payer_email: session.user.email || undefined,
        back_url: backUrl,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: planInfo.precio!,
          currency_id: "ARS",
        },
      },
    });

    // Guardar el id del preapproval para poder reconciliar el webhook y
    // /api/suscripcion/confirmar, y para poder cancelarlo después.
    if (result.id) {
      await prisma.suscripcion.update({
        where: { id: suscripcion.id },
        data: { mercadopagoPreapprovalId: result.id },
      });
    }

    // En modo TEST hay que redirigir al sandbox_init_point (checkout de pruebas),
    // en producción al init_point real. Usar el equivocado causa errores de
    // "una de las partes es de prueba" y fallos con las tarjetas de prueba.
    const sandboxInitPoint = (result as { sandbox_init_point?: string }).sandbox_init_point;
    const redirectUrl = esMercadoPagoTest() ? sandboxInitPoint : result.init_point;

    return NextResponse.json({
      init_point: result.init_point,
      sandbox_init_point: sandboxInitPoint,
      checkout_url: redirectUrl,
      suscripcionId: suscripcion.id,
    });
  } catch (err) {
    console.error("Error al crear checkout:", err);
    return NextResponse.json(
      { error: "Error al crear el checkout de MercadoPago" },
      { status: 500 }
    );
  }
}
