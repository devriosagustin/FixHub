/**
 * API Route: POST /api/suscripcion/checkout
 * 
 * Crea una preferencia de pago en MercadoPago y retorna
 * la URL de checkout para que el usuario pague.
 * 
 * Flujo:
 * 1. Profesional elige un plan de pago
 * 2. Se crea una suscripción PENDIENTE_PAGO en nuestra BD
 * 3. Se crea una preferencia en MercadoPago
 * 4. Se retorna la URL de checkout (init_point)
 * 5. El usuario paga en MercadoPago
 * 6. MercadoPago redirige de vuelta a /suscripcion/exito
 * 7. MercadoPago envía un webhook a /api/webhooks/mercadopago
 * 
 * Body: { plan: "PROFESIONAL" | "PREMIUM" }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanById, type PlanId } from "@/lib/plans";
import { MercadoPagoConfig, Preference } from "mercadopago";

// Cliente de MercadoPago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Solo profesionales pueden suscribirse
    if (session.user.rol !== "PROFESIONAL" && session.user.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los profesionales pueden suscribirse" },
        { status: 403 }
      );
    }

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

    // Crear preferencia de MercadoPago
    const preference = new Preference(client);

    // Detectar si estamos en modo de pruebas (TEST) o producción (APP_USR)
    const esModoTest = (process.env.MERCADOPAGO_ACCESS_TOKEN || "").startsWith("TEST-");
    const backUrls = {
      success: `${process.env.NEXT_PUBLIC_APP_URL}/suscripcion/exito`,
      failure: `${process.env.NEXT_PUBLIC_APP_URL}/suscripcion/fallo`,
      pending: `${process.env.NEXT_PUBLIC_APP_URL}/suscripcion/pendiente`,
    };

    const esLocal = (process.env.NEXT_PUBLIC_APP_URL || "").includes("localhost");

    const result = await preference.create({
      body: {
        items: [
          {
            id: `suscripcion-${plan}-${perfil.id}`,
            title: `Suscripción fixhub - Plan ${planInfo.nombre}`,
            quantity: 1,
            unit_price: planInfo.precio!,
            currency_id: "ARS",
          },
        ],
        payer: {
          name: session.user.name || undefined,
          email: session.user.email || undefined,
        },
        external_reference: suscripcion.id,
        // En localhost MercadoPago rechaza back_urls HTTP, así que omitimos
        // ambos (back_urls y auto_return) en local. `auto_return` solo acepta
        // "all" | "approved" y exige back_url.success HTTPS, por lo que se
        // omite para permitir pruebas locales.
        ...(!esLocal && {
          back_urls: backUrls,
          auto_return: "approved" as const,
        }),
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
      },
    });

    // En modo TEST hay que redirigir al sandbox_init_point (checkout de pruebas),
    // en producción al init_point real. Usar el equivocado causa errores de
    // "una de las partes es de prueba" y fallos con las tarjetas de prueba.
    const redirectUrl = esModoTest
      ? result.sandbox_init_point
      : result.init_point;

    return NextResponse.json({
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
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
