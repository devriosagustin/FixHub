/**
 * API Route: GET /api/suscripcion
 * 
 * Obtiene la suscripción actual del profesional autenticado.
 * 
 * Retorna: { suscripcion: Suscripcion | null, plan: Plan }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanById, type PlanId } from "@/lib/plans";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = session.user.id;

    // Buscar el perfil profesional del usuario
    const perfil = await prisma.perfilProfesional.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!perfil) {
      return NextResponse.json(
        { error: "No tienes un perfil profesional" },
        { status: 404 }
      );
    }

    // Buscar la suscripción
    const suscripcion = await prisma.suscripcion.findUnique({
      where: { perfilId: perfil.id },
    });

    // Si no tiene suscripción, retornar plan gratuito por defecto
    if (!suscripcion) {
      return NextResponse.json({
        suscripcion: null,
        plan: getPlanById("GRATUITO"),
      });
    }

    // Verificar si la suscripción venció
    if (
      suscripcion.fechaFin &&
      new Date(suscripcion.fechaFin) < new Date() &&
      suscripcion.estado === "ACTIVA"
    ) {
      // Si tiene renovación automática y es un plan de pago, renovar automáticamente
      if (suscripcion.renovacionAuto && suscripcion.plan !== "GRATUITO") {
        const nuevaFechaFin = new Date();
        nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 1);

        await prisma.suscripcion.update({
          where: { id: suscripcion.id },
          data: {
            fechaInicio: new Date(),
            fechaFin: nuevaFechaFin,
          },
        });
        suscripcion.fechaInicio = new Date();
        suscripcion.fechaFin = nuevaFechaFin;

        // Registrar el pago como pendiente (la renovación se cobrará)
        await prisma.pago.create({
          data: {
            suscripcionId: suscripcion.id,
            monto: suscripcion.precioMensual || 0,
            moneda: "ARS",
            estadoPago: "pendiente",
            fechaPago: new Date(),
          },
        });

        // Notificar al profesional
        await prisma.notificacion.create({
          data: {
            usuarioId: userId,
            tipo: "SUSCRIPCION_VENCE",
            titulo: "Tu suscripción se renovó",
            mensaje: `Tu plan ${suscripcion.plan} se renovó automáticamente hasta el ${nuevaFechaFin.toLocaleDateString(
              "es-AR"
            )}.`,
            enlace: "/planes",
          },
        });
      } else {
        // Marcar como vencida
        await prisma.suscripcion.update({
          where: { id: suscripcion.id },
          data: { estado: "VENCIDA" },
        });
        suscripcion.estado = "VENCIDA";
      }
    }

    return NextResponse.json({
      suscripcion,
      plan: getPlanById(suscripcion.plan as PlanId),
    });
  } catch (err) {
    console.error("Error al obtener suscripción:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * API Route: POST /api/suscripcion
 * 
 * Crea o actualiza la suscripción del profesional.
 * Para el plan gratuito, se activa directamente.
 * Para planes de pago, se usa el checkout de MercadoPago.
 * 
 * Body: { plan: "GRATUITO" | "PROFESIONAL" | "PREMIUM" }
 */

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Solo profesionales pueden tener suscripciones
    if (session.user.rol !== "PROFESIONAL" && session.user.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los profesionales pueden suscribirse" },
        { status: 403 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { plan } = body;

    // Validar el plan
    if (!plan || !["GRATUITO", "PROFESIONAL", "PREMIUM"].includes(plan)) {
      return NextResponse.json(
        { error: "Plan no válido" },
        { status: 400 }
      );
    }

    // Buscar el perfil profesional
    const perfil = await prisma.perfilProfesional.findUnique({
      where: { userId },
      select: { id: true, estado: true },
    });

    if (!perfil) {
      return NextResponse.json(
        { error: "No tienes un perfil profesional" },
        { status: 404 }
      );
    }

    if (perfil.estado !== "APROBADO") {
      return NextResponse.json(
        { error: "Tu perfil debe estar aprobado para suscribirte" },
        { status: 400 }
      );
    }

    const planInfo = getPlanById(plan as PlanId);

    // Buscar suscripción existente
    const existente = await prisma.suscripcion.findUnique({
      where: { perfilId: perfil.id },
    });

    if (existente) {
      // Actualizar suscripción existente
      const actualizada = await prisma.suscripcion.update({
        where: { id: existente.id },
        data: {
          plan: plan as any,
          estado: "ACTIVA",
          precioMensual: planInfo.precio,
          fechaInicio: new Date(),
          // El plan gratuito no tiene fecha de fin
          fechaFin: planInfo.precio === null ? null : undefined,
        },
      });

      return NextResponse.json({ suscripcion: actualizada, plan: planInfo });
    }

    // Crear nueva suscripción
    const nueva = await prisma.suscripcion.create({
      data: {
        perfilId: perfil.id,
        plan: plan as any,
        estado: "ACTIVA",
        precioMensual: planInfo.precio,
        fechaFin: planInfo.precio === null ? null : undefined,
      },
    });

    return NextResponse.json({ suscripcion: nueva, plan: planInfo }, { status: 201 });
  } catch (err) {
    console.error("Error al crear suscripción:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
